import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET all categories
router.get('/', async (req, res) => {
  try {
    const categories = await prisma.assetCategory.findMany({
      include: {
        _count: { select: { assets: true } }
      }
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET single category
router.get('/:id', async (req, res) => {
  try {
    const category = await prisma.assetCategory.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        _count: { select: { assets: true } }
      }
    });
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST create category
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const category = await prisma.assetCategory.create({
      data: req.body
    });
    res.status(201).json(category);
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(400).json({ error: 'Error creating category' });
  }
});

// PUT update category
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const category = await prisma.assetCategory.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(category);
  } catch (error) {
    res.status(400).json({ error: 'Error updating category' });
  }
});

// DELETE category
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.assetCategory.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Error deleting category' });
  }
});

export default router;
