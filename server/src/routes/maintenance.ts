import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req: any, res) => {
  const { departmentId, status, priority } = req.query;
  const where: any = {};

  if (departmentId) where.departmentId = parseInt(departmentId);
  if (status) where.status = status;
  if (priority) where.priority = priority;

  if (req.user.role === 'DEPARTMENT') {
    where.departmentId = req.user.departmentId;
  }

  try {
    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        asset: true,
        department: true
      },
      orderBy: { requestDate: 'desc' }
    });
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { asset: true, department: true }
    });
    if (!request) return res.status(404).json({ error: 'Not found' });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    // Requires requestedBy field
    if (!req.body.requestedBy) {
      return res.status(400).json({ error: 'requestedBy is required' });
    }
    
    const request = await prisma.maintenanceRequest.create({
      data: req.body
    });

    // Update asset status to BAO_TRI
    await prisma.asset.update({
      where: { id: req.body.assetId },
      data: { status: 'BAO_TRI' }
    });

    res.status(201).json(request);
  } catch (error) {
    res.status(400).json({ error: 'Error creating request' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const request = await prisma.maintenanceRequest.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(request);
  } catch (error) {
    res.status(400).json({ error: 'Error updating request' });
  }
});

router.put('/:id/status', requireAuth, async (req: any, res) => {
  try {
    const { status } = req.body;
    
    if (req.user.role === 'DEPARTMENT' && status !== 'PENDING') {
      return res.status(403).json({ error: 'Departments cannot change status directly' });
    }

    const data: any = { status };
    if (status === 'COMPLETED') {
      data.completedDate = new Date();
    }

    const request = await prisma.maintenanceRequest.update({
      where: { id: parseInt(req.params.id) },
      data
    });

    if (status === 'COMPLETED') {
      await prisma.asset.update({
        where: { id: request.assetId },
        data: { status: 'DANG_SU_DUNG' }
      });
    } else if (status === 'IN_PROGRESS') {
      await prisma.asset.update({
        where: { id: request.assetId },
        data: { status: 'BAO_TRI' }
      });
    }

    res.json(request);
  } catch (error) {
    res.status(400).json({ error: 'Error updating status' });
  }
});

export default router;
