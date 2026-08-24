import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req, res) => {
  const { assetId, result } = req.query;
  const where: any = {};
  
  if (assetId) where.assetId = parseInt(assetId as string);
  if (result) where.result = result;

  try {
    const records = await prisma.calibrationRecord.findMany({
      where,
      include: { asset: { include: { department: true } } },
      orderBy: { calibrationDate: 'desc' }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/upcoming', requireAuth, async (req, res) => {
  const days = parseInt(req.query.days as string) || 30;
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);

  try {
    const records = await prisma.calibrationRecord.findMany({
      where: {
        nextCalibrationDate: {
          gte: new Date(),
          lte: futureDate
        }
      },
      include: { asset: { include: { department: true } } }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/overdue', requireAuth, async (req, res) => {
  try {
    const records = await prisma.calibrationRecord.findMany({
      where: {
        nextCalibrationDate: {
          lt: new Date()
        }
      },
      include: { asset: { include: { department: true } } }
    });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const record = await prisma.calibrationRecord.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { asset: true }
    });
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const record = await prisma.calibrationRecord.create({ data: req.body });
    res.status(201).json(record);
  } catch (error) {
    res.status(400).json({ error: 'Error creating calibration' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const record = await prisma.calibrationRecord.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: 'Error updating calibration' });
  }
});

export default router;
