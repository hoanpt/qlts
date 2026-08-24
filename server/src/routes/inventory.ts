import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const sessions = await prisma.inventorySession.findMany({
      include: {
        _count: { select: { records: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/sessions', requireAuth, async (req, res) => {
  try {
    const session = await prisma.inventorySession.create({ data: req.body });
    res.status(201).json(session);
  } catch (error) {
    res.status(400).json({ error: 'Error creating session' });
  }
});

router.put('/sessions/:id', requireAuth, async (req, res) => {
  try {
    const session = await prisma.inventorySession.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(session);
  } catch (error) {
    res.status(400).json({ error: 'Error updating session' });
  }
});

// Lưu cập nhật nhanh kết quả kiểm kê thực tế cho các tài sản
router.post('/update-bulk-assets', requireAuth, async (req: any, res) => {
  try {
    const { updates } = req.body; // Array of { id, actualQuantity, quantityDifference, status, note }
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'Invalid updates payload' });
    }

    const promises = updates.map(u => 
      prisma.asset.update({
        where: { id: u.id },
        data: {
          actualQuantity: u.actualQuantity !== undefined ? parseInt(u.actualQuantity) : undefined,
          quantityDifference: u.quantityDifference !== undefined ? parseInt(u.quantityDifference) : undefined,
          status: u.status || undefined,
          note: u.note !== undefined ? u.note : undefined
        }
      })
    );

    await prisma.$transaction(promises);
    res.json({ message: `Cập nhật thành công ${updates.length} tài sản kiểm kê` });
  } catch (error) {
    console.error('Error updating bulk inventory:', error);
    res.status(500).json({ error: 'Error saving inventory results' });
  }
});

export default router;
