import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// List all committee members
router.get('/', requireAuth, async (req, res) => {
  try {
    const { scope } = req.query;
    const where: any = {};
    if (scope && scope !== 'ALL') {
      where.OR = [
        { scope: 'ALL' },
        { scope: scope as string }
      ];
    }
    const members = await prisma.inventoryCommitteeMember.findMany({
      where,
      orderBy: { displayOrder: 'asc' }
    });
    res.json(members);
  } catch (error) {
    console.error('Error fetching committee members:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create member
router.post('/', requireAuth, async (req, res) => {
  try {
    const member = await prisma.inventoryCommitteeMember.create({
      data: req.body
    });
    res.status(201).json(member);
  } catch (error) {
    console.error('Error creating committee member:', error);
    res.status(400).json({ error: 'Error creating committee member' });
  }
});

// Update member
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const member = await prisma.inventoryCommitteeMember.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(member);
  } catch (error) {
    console.error('Error updating committee member:', error);
    res.status(400).json({ error: 'Error updating committee member' });
  }
});

// Delete member
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await prisma.inventoryCommitteeMember.delete({
      where: { id: parseInt(req.params.id) }
    });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting committee member:', error);
    res.status(400).json({ error: 'Error deleting committee member' });
  }
});

export default router;
