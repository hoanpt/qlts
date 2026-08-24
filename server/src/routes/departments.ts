import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireAdmin } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  try {
    const departments = await prisma.department.findMany();
    res.json(departments);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const department = await prisma.department.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        assets: true,
        users: { select: { id: true, username: true, fullName: true } }
      }
    });
    if (!department) return res.status(404).json({ error: 'Not found' });
    res.json(department);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const department = await prisma.department.create({ data: req.body });
    res.status(201).json(department);
  } catch (error) {
    res.status(400).json({ error: 'Error creating department' });
  }
});

router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const department = await prisma.department.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(department);
  } catch (error) {
    res.status(400).json({ error: 'Error updating department' });
  }
});

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await prisma.department.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Error deleting department' });
  }
});

export default router;
