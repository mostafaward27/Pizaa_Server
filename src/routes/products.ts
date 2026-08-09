import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET all products with categories and extras
router.get('/', async (req: Request, res: Response) => {
  try {
    const { categoryId, featured } = req.query;

    const where: any = {};
    if (categoryId) {
      where.categoryId = String(categoryId);
    }
    if (featured === 'true') {
      where.isFeatured = true;
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: true,
        extras: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(products);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET single product by ID or Slug
router.get('/:idOrSlug', async (req: Request, res: Response) => {
  try {
    const { idOrSlug } = req.params;

    const product = await prisma.product.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        category: true,
        extras: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    res.json(product);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// POST create product (Admin)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, slug, description, price, categoryId, image, isFeatured, isBestSeller, ingredients, sizesJson, extras } = req.body;

    if (!name || !price || !categoryId) {
      return res.status(400).json({ error: 'Name, price, and categoryId are required' });
    }

    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');

    const newProduct = await prisma.product.create({
      data: {
        name,
        slug: generatedSlug,
        description: description || '',
        price: parseFloat(price),
        categoryId,
        image: image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
        isFeatured: Boolean(isFeatured),
        isBestSeller: Boolean(isBestSeller),
        ingredients: ingredients || null,
        sizesJson: sizesJson ? (typeof sizesJson === 'string' ? sizesJson : JSON.stringify(sizesJson)) : null,
      },
      include: { category: true, extras: true },
    });

    // Add extras if provided
    if (extras && Array.isArray(extras) && extras.length > 0) {
      await prisma.productExtra.createMany({
        data: extras.map((e: any) => ({
          productId: newProduct.id,
          name: e.name,
          price: parseFloat(e.price),
        })),
      });
    }

    const fullProduct = await prisma.product.findUnique({
      where: { id: newProduct.id },
      include: { category: true, extras: true },
    });

    res.status(201).json(fullProduct);
  } catch (error: any) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: error.message || 'Failed to create product' });
  }
});

// PUT update product (Admin)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, price, categoryId, image, isAvailable, isFeatured, isBestSeller, ingredients, sizesJson, extras } = req.body;

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price: price !== undefined ? parseFloat(price) : undefined,
        categoryId,
        image,
        isAvailable,
        isFeatured,
        isBestSeller,
        ingredients,
        sizesJson: sizesJson !== undefined ? (typeof sizesJson === 'string' ? sizesJson : JSON.stringify(sizesJson)) : undefined,
      },
    });

    if (extras && Array.isArray(extras)) {
      // Refresh extras
      await prisma.productExtra.deleteMany({ where: { productId: id } });
      if (extras.length > 0) {
        await prisma.productExtra.createMany({
          data: extras.map((e: any) => ({
            productId: id,
            name: e.name,
            price: parseFloat(e.price),
          })),
        });
      }
    }

    const fullProduct = await prisma.product.findUnique({
      where: { id },
      include: { category: true, extras: true },
    });

    res.json(fullProduct);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update product' });
  }
});

// PATCH toggle availability (Admin / Branch)
router.patch('/:id/toggle-availability', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Product not found' });

    const updated = await prisma.product.update({
      where: { id },
      data: { isAvailable: !existing.isAvailable },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to toggle availability' });
  }
});

// DELETE product (Admin)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.productExtra.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete product' });
  }
});

export default router;
