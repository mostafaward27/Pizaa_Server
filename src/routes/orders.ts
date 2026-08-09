import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../db';
import { notifyOrderCreated, notifyOrderStatusUpdated } from '../socket';

const router = Router();

// Validation Schema for Guest Checkout
const createOrderSchema = z.object({
  customerName: z.string().min(2, 'Name must be at least 2 characters long'),
  customerPhone: z.string().regex(/^01[0125][0-9]{8}$/, 'Must be a valid Egyptian mobile number (e.g. 01012345678)'),
  branchId: z.string().min(1, 'Branch selection is required'),
  orderType: z.enum(['DELIVERY', 'PICKUP']),
  governorate: z.string().optional(),
  area: z.string().optional(),
  street: z.string().optional(),
  building: z.string().optional(),
  floor: z.string().optional(),
  apartment: z.string().optional(),
  deliveryNotes: z.string().optional(),
  paymentMethod: z.enum(['COD', 'ONLINE']),
  items: z.array(
    z.object({
      productId: z.string().optional(),
      productName: z.string(),
      size: z.string().nullable().optional(),
      unitPrice: z.number().positive(),
      quantity: z.number().int().positive(),
      notes: z.string().optional(),
      extras: z.array(
        z.object({
          name: z.string(),
          price: z.number().min(0),
        })
      ).optional(),
    })
  ).min(1, 'Order must contain at least one item'),
});

// GET all orders (with filters for Branch / Kitchen / Admin)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { branchId, status, orderType, search } = req.query;

    const where: any = {};

    if (branchId) {
      where.branchId = String(branchId);
    }
    if (status) {
      if (typeof status === 'string' && status.includes(',')) {
        where.status = { in: status.split(',') };
      } else {
        where.status = String(status);
      }
    }
    if (orderType) {
      where.orderType = String(orderType);
    }
    if (search) {
      const searchStr = String(search).trim();
      where.OR = [
        { orderNumber: { contains: searchStr } },
        { customer: { name: { contains: searchStr } } },
        { customer: { phone: { contains: searchStr } } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        customer: true,
        branch: true,
        items: {
          include: {
            extras: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(orders);
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// GET order by tracking token or ID (Customer Order Tracker)
router.get('/track/:tokenOrNumber', async (req: Request, res: Response) => {
  try {
    const { tokenOrNumber } = req.params;

    const order = await prisma.order.findFirst({
      where: {
        OR: [
          { trackingToken: tokenOrNumber },
          { orderNumber: tokenOrNumber },
          { id: tokenOrNumber },
        ],
      },
      include: {
        customer: true,
        branch: true,
        items: {
          include: {
            extras: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch order tracking info' });
  }
});

// POST Create Order (Guest Checkout)
router.post('/', async (req: Request, res: Response) => {
  try {
    // 1. Zod Validation
    const validationResult = createOrderSchema.safeParse(req.body);
    if (!validationResult.success) {
      const formattedErrors = validationResult.error.errors.map((e) => e.message).join(', ');
      return res.status(400).json({ error: formattedErrors });
    }

    const data = validationResult.data;

    // 2. Strict Delivery Field Validation
    if (data.orderType === 'DELIVERY') {
      if (!data.governorate || !data.area || !data.street || !data.building) {
        return res.status(400).json({
          error: 'Delivery orders require governorate, area, street, and building details.',
        });
      }
    }

    // 3. Branch Verification
    const branch = await prisma.branch.findUnique({ where: { id: data.branchId } });
    if (!branch) {
      return res.status(400).json({ error: 'Selected branch does not exist' });
    }
    if (!branch.isOpen) {
      return res.status(400).json({ error: 'Selected branch is currently closed for new orders' });
    }

    // 4. Server-Side Price Guard & Total Recalculation
    let calculatedSubtotal = 0;
    const processedItems: any[] = [];

    for (const item of data.items) {
      let itemUnitPrice = item.unitPrice;

      // If productId exists, verify base product price
      if (item.productId) {
        const dbProduct = await prisma.product.findUnique({ where: { id: item.productId } });
        if (dbProduct) {
          if (item.size && dbProduct.sizesJson) {
            try {
              const sizes = JSON.parse(dbProduct.sizesJson);
              const foundSize = sizes.find((s: any) => s.name === item.size);
              if (foundSize) itemUnitPrice = foundSize.price;
            } catch (e) {}
          } else {
            itemUnitPrice = dbProduct.price;
          }
        }
      }

      // Calculate Extras
      let extrasTotal = 0;
      const itemExtras: any[] = [];
      if (item.extras && item.extras.length > 0) {
        for (const ext of item.extras) {
          extrasTotal += ext.price;
          itemExtras.push({ extraName: ext.name, price: ext.price });
        }
      }

      const itemTotalPrice = (itemUnitPrice + extrasTotal) * item.quantity;
      calculatedSubtotal += itemTotalPrice;

      processedItems.push({
        productId: item.productId || null,
        productName: item.productName,
        size: item.size || null,
        unitPrice: itemUnitPrice,
        quantity: item.quantity,
        totalPrice: itemTotalPrice,
        notes: item.notes || null,
        extras: itemExtras,
      });
    }

    const deliveryFee = data.orderType === 'DELIVERY' ? branch.deliveryFee : 0.0;
    const discount = 0.0;
    const finalTotal = calculatedSubtotal + deliveryFee - discount;

    // 5. Generate Order Number (#ALFRIDO-XXXX)
    const count = await prisma.order.count();
    const orderNumber = `#ALFRIDO-${1042 + count}`;

    // 6. Create Customer & Order in Transaction
    const createdOrder = await prisma.$transaction(async (tx) => {
      const customer = await tx.customer.create({
        data: {
          name: data.customerName,
          phone: data.customerPhone,
          governorate: data.governorate || null,
          area: data.area || null,
          street: data.street || null,
          building: data.building || null,
          floor: data.floor || null,
          apartment: data.apartment || null,
          notes: data.deliveryNotes || null,
        },
      });

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          branchId: branch.id,
          orderType: data.orderType,
          status: 'PENDING',
          subtotal: calculatedSubtotal,
          deliveryFee,
          discount,
          totalAmount: finalTotal,
          paymentMethod: data.paymentMethod,
          paymentStatus: data.paymentMethod === 'ONLINE' ? 'PAID' : 'PENDING', // Sandbox payment marks online as PAID immediately
          items: {
            create: processedItems.map((pi) => ({
              productId: pi.productId,
              productName: pi.productName,
              size: pi.size,
              unitPrice: pi.unitPrice,
              quantity: pi.quantity,
              totalPrice: pi.totalPrice,
              notes: pi.notes,
              extras: {
                create: pi.extras,
              },
            })),
          },
          statusHistory: {
            create: [{ status: 'PENDING', note: 'Order placed by customer' }],
          },
        },
        include: {
          customer: true,
          branch: true,
          items: { include: { extras: true } },
          statusHistory: true,
        },
      });

      return order;
    });

    // 7. Emit Real-time Socket Event
    notifyOrderCreated(createdOrder);

    res.status(201).json(createdOrder);
  } catch (error: any) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: error.message || 'Failed to place order' });
  }
});

// PATCH Update Order Status (Branch / Kitchen / Admin)
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, rejectionReason, note, staffName } = req.body;

    const allowedStatuses = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED'];
    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid order status' });
    }

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Status Transition Guard Rules
    const currentStatus = order.status;
    if (currentStatus === 'COMPLETED' && status !== 'COMPLETED') {
      return res.status(400).json({ error: 'Completed orders cannot change status.' });
    }
    if (currentStatus === 'CANCELLED') {
      return res.status(400).json({ error: 'Cancelled orders cannot change status.' });
    }

    const updateData: any = { status };
    if (status === 'CANCELLED' && rejectionReason) {
      updateData.rejectionReason = rejectionReason;
    }

    // Execute status update and append history
    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        ...updateData,
        statusHistory: {
          create: {
            status,
            note: note || (status === 'CANCELLED' ? rejectionReason : `Status updated to ${status}`),
            createdBy: staffName || 'Staff',
          },
        },
      },
      include: {
        customer: true,
        branch: true,
        items: { include: { extras: true } },
        statusHistory: { orderBy: { createdAt: 'asc' } },
      },
    });

    // Broadcast Socket.IO update
    notifyOrderStatusUpdated(updatedOrder);

    res.json(updatedOrder);
  } catch (error: any) {
    console.error('Error updating order status:', error);
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

export default router;
