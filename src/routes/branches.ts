import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET all branches
router.get('/', async (_req: Request, res: Response) => {
  try {
    const branches = await prisma.branch.findMany({
      orderBy: { name: 'asc' },
    });
    res.json(branches);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch branches' });
  }
});

// POST create branch
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, slug, address, phone, isOpen, deliveryFee } = req.body;
    if (!name || !address || !phone) {
      return res.status(400).json({ error: 'Name, address, and phone are required' });
    }
    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const branch = await prisma.branch.create({
      data: {
        name,
        slug: generatedSlug,
        address,
        phone,
        isOpen: isOpen !== undefined ? Boolean(isOpen) : true,
        deliveryFee: deliveryFee ? parseFloat(deliveryFee) : 40.0,
      },
    });
    res.status(201).json(branch);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create branch' });
  }
});

// PATCH toggle branch open/close status
router.patch('/:id/toggle-status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) return res.status(404).json({ error: 'Branch not found' });

    const updated = await prisma.branch.update({
      where: { id },
      data: { isOpen: !branch.isOpen },
    });

    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to toggle branch status' });
  }
});

export default router;
