import { Router, Request, Response } from 'express';
import { prisma } from '../db';

const router = Router();

// GET categories
router.get('/', async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
    res.json(categories);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// POST create category
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, slug, description, sortOrder, icon, isActive } = req.body;
    if (!name) return res.status(400).json({ error: 'Category name is required' });

    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const category = await prisma.category.create({
      data: {
        name,
        slug: generatedSlug,
        description,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        icon,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
    res.status(201).json(category);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to create category' });
  }
});

// PUT update category
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, sortOrder, icon, isActive } = req.body;

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        description,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : undefined,
        icon,
        isActive,
      },
    });
    res.json(category);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// DELETE category
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.category.delete({ where: { id } });
    res.json({ message: 'Category deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete category. Ensure no products belong to it.' });
  }
});

export default router;
