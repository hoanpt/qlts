import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

router.get('/', requireAuth, async (req: any, res) => {
  const { 
    search, categoryId, departmentId, status, location, 
    managingUnit, floor, buildingAsset,
    page = '1', limit = '15' 
  } = req.query;
  
  const where: any = {};

  if (search && typeof search === 'string' && search.trim()) {
    where.OR = [
      { name: { contains: search.trim() } },
      { assetCode: { contains: search.trim() } },
      { locationDetail: { contains: search.trim() } },
      { specifications: { contains: search.trim() } }
    ];
  }
  if (categoryId && !isNaN(parseInt(categoryId as string))) {
    where.categoryId = parseInt(categoryId as string);
  }
  if (departmentId && !isNaN(parseInt(departmentId as string))) {
    where.departmentId = parseInt(departmentId as string);
  }
  if (status && typeof status === 'string' && status.trim()) {
    where.status = status.trim();
  }
  if (location && typeof location === 'string' && location.trim()) {
    where.location = location.trim();
  }
  if (managingUnit && typeof managingUnit === 'string' && managingUnit.trim()) {
    where.managingUnit = managingUnit.trim();
  }
  if (floor && typeof floor === 'string' && floor.trim()) {
    where.floor = floor.trim();
  }
  if (buildingAsset !== undefined && buildingAsset !== '') {
    where.buildingAsset = parseInt(buildingAsset as string) || 0;
  }

  // Strict Role-based access control
  if (req.user) {
    if (req.user.role === 'MANAGER_CNTT') {
      where.managingUnit = 'CNTT';
    } else if (req.user.role === 'MANAGER_DUOC') {
      where.managingUnit = 'DUOC';
    } else if (req.user.role === 'MANAGER_TCHC') {
      where.managingUnit = 'TCHC';
    } else if (req.user.role === 'DEPARTMENT' && req.user.departmentId) {
      where.departmentId = req.user.departmentId;
    }
  }

  try {
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.max(1, parseInt(limit as string) || 15);

    const total = await prisma.asset.count({ where });
    const assets = await prisma.asset.findMany({
      where,
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: {
        category: true,
        department: true
      },
      orderBy: { id: 'asc' }
    });
    res.json({ total, page: pageNum, limit: limitNum, assets });
  } catch (error) {
    console.error('Error in /api/assets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        category: true,
        department: true,
        transfers: { include: { fromDepartment: true, toDepartment: true } },
        maintenanceRequests: true,
        calibrations: true,
        depreciations: true
      }
    });
    if (!asset) return res.status(404).json({ error: 'Not found' });
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, async (req, res) => {
  try {
    const qrCode = uuidv4();
    const asset = await prisma.asset.create({
      data: {
        ...req.body,
        qrCode
      }
    });
    res.status(201).json(asset);
  } catch (error) {
    res.status(400).json({ error: 'Error creating asset' });
  }
});

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const asset = await prisma.asset.update({
      where: { id: parseInt(req.params.id) },
      data: req.body
    });
    res.json(asset);
  } catch (error) {
    res.status(400).json({ error: 'Error updating asset' });
  }
});

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await prisma.asset.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: 'Error deleting asset' });
  }
});

router.get('/:id/qr', requireAuth, async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!asset) return res.status(404).json({ error: 'Not found' });
    
    const url = `http://localhost:5173/qr/${asset.assetCode}`;
    const qrCodeImage = await QRCode.toDataURL(url);
    res.json({ qrCode: qrCodeImage });
  } catch (error) {
    res.status(500).json({ error: 'Error generating QR code' });
  }
});

router.get('/by-qr/:code', requireAuth, async (req, res) => {
  try {
    const asset = await prisma.asset.findUnique({
      where: { assetCode: req.params.code },
      include: {
        category: true,
        department: true,
        transfers: { include: { fromDepartment: true, toDepartment: true } },
        maintenanceRequests: true,
        calibrations: true,
        depreciations: true
      }
    });
    if (!asset) return res.status(404).json({ error: 'Not found' });
    res.json(asset);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
