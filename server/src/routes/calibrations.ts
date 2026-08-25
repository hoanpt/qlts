import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/calibrations/stats/summary - Thống kê tổng hợp Hiệu chuẩn / Thử nghiệm / Kiểm định / Kiểm xạ
router.get('/stats/summary', requireAuth, async (req, res) => {
  try {
    const records = await prisma.calibrationRecord.findMany();
    const total = records.length;
    const hieuChuan = records.filter(r => r.serviceType === 'HIEU_CHUAN').length;
    const thuNghiem = records.filter(r => r.serviceType === 'THU_NGHIEM').length;
    const kiemDinh = records.filter(r => r.serviceType === 'KIEM_DINH').length;
    const kiemXa = records.filter(r => r.serviceType === 'KIEM_XA').length;
    const passCount = records.filter(r => r.result === 'PASS').length;
    const failCount = records.filter(r => r.result === 'FAIL').length;
    const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);

    res.json({
      total,
      hieuChuan,
      thuNghiem,
      kiemDinh,
      kiemXa,
      passCount,
      failCount,
      totalCost
    });
  } catch (error) {
    console.error('Error fetching calibration stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calibrations - Danh sách hồ sơ với bộ lọc
router.get('/', requireAuth, async (req, res) => {
  const { assetId, result, serviceType, search, departmentLocation } = req.query;
  const where: any = {};
  
  if (assetId) where.assetId = parseInt(assetId as string);
  if (result && result !== 'ALL') where.result = result;
  if (serviceType && serviceType !== 'ALL') where.serviceType = serviceType;

  try {
    const records = await prisma.calibrationRecord.findMany({
      where,
      include: { 
        asset: { 
          include: { 
            department: true,
            category: true
          } 
        } 
      },
      orderBy: { calibrationDate: 'desc' }
    });

    let filtered = records;
    if (departmentLocation && departmentLocation !== 'ALL') {
      filtered = filtered.filter(r => (r as any).departmentLocation?.includes(departmentLocation as string));
    }
    if (search) {
      const q = (search as string).toLowerCase();
      filtered = filtered.filter(r => 
        r.asset?.name?.toLowerCase().includes(q) ||
        r.asset?.assetCode?.toLowerCase().includes(q) ||
        r.vendor?.toLowerCase().includes(q) ||
        r.performedBy?.toLowerCase().includes(q) ||
        r.decisionNumber?.toLowerCase().includes(q) ||
        r.certificateNumber?.toLowerCase().includes(q)
      );
    }

    res.json(filtered);
  } catch (error) {
    console.error('Error fetching calibration records:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calibrations/upcoming - Thiết bị sắp đến hạn
router.get('/upcoming', requireAuth, async (req, res) => {
  const days = parseInt(req.query.days as string) || 60;
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

// GET /api/calibrations/overdue - Thiết bị quá hạn
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

// GET /api/calibrations/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const record = await prisma.calibrationRecord.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { asset: { include: { department: true, category: true } } }
    });
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/calibrations - Thêm mới hồ sơ hiệu chuẩn / kiểm định
router.post('/', requireAuth, async (req, res) => {
  try {
    const record = await prisma.calibrationRecord.create({ data: req.body });
    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating calibration:', error);
    res.status(400).json({ error: 'Error creating calibration' });
  }
});

// PUT /api/calibrations/:id
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
