import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET all offers
router.get('/', async (_req: Request, res: Response) => {
  try {
    const offers = await prisma.offer.findMany({
      orderBy: { createdAt: 'desc' },
    });
    res.json(offers);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch offers' });
  }
});

// POST create offer
router.post('/', async (req: Request, res: Response) => {
  try {
    const { title, code, description, price, originalPrice, image, isActive } = req.body;
    if (!title || !code || !price) {
      return res.status(400).json({ error: 'Title, promo code, and price are required' });
    }

    const offer = await prisma.offer.create({
      data: {
        title,
        code: code.toUpperCase(),
        description: description || '',
        price: parseFloat(price),
        originalPrice: originalPrice ? parseFloat(originalPrice) : parseFloat(price) * 1.25,
        image: image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    res.status(201).json(offer);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create offer' });
  }
});

// PATCH toggle offer active status
router.patch('/:id/toggle-active', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const offer = await prisma.offer.findUnique({ where: { id } });
    if (!offer) return res.status(404).json({ error: 'Offer not found' });

    const updated = await prisma.offer.update({
      where: { id },
      data: { isActive: !offer.isActive },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to toggle offer status' });
  }
});

// DELETE offer
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.offer.delete({ where: { id } });
    res.json({ message: 'Offer deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete offer' });
  }
});

export default router;
