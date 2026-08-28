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
    const distinctAssetCount = new Set(records.map(r => r.assetId)).size;
    const hieuChuan = records.filter(r => r.serviceType === 'HIEU_CHUAN').length;
    const thuNghiem = records.filter(r => r.serviceType === 'THU_NGHIEM').length;
    const kiemDinh = records.filter(r => r.serviceType === 'KIEM_DINH').length;
    const kiemXa = records.filter(r => r.serviceType === 'KIEM_XA').length;
    const passCount = records.filter(r => r.result === 'PASS').length;
    const failCount = records.filter(r => r.result === 'FAIL').length;
    const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);

    res.json({
      total,
      distinctAssetCount,
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
  if (result && result !== 'ALL') where.result = result as string;
  if (serviceType && serviceType !== 'ALL') where.serviceType = serviceType as string;

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
        r.performedBy?.toLowerCase().includes(q)
      );
    }

    res.json(filtered);
  } catch (error) {
    console.error('Error fetching calibrations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calibrations/upcoming - Danh sách sắp đến hạn hiệu chuẩn
router.get('/upcoming', requireAuth, async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 60;
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);

    const upcoming = await prisma.calibrationRecord.findMany({
      where: {
        nextCalibrationDate: {
          gte: now,
          lte: future
        }
      },
      include: {
        asset: {
          include: {
            department: true
          }
        }
      },
      orderBy: { nextCalibrationDate: 'asc' }
    });

    res.json(upcoming);
  } catch (error) {
    console.error('Error fetching upcoming calibrations:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/calibrations/overdue - Danh sách quá hạn hiệu chuẩn
router.get('/overdue', requireAuth, async (req, res) => {
  try {
    const now = new Date();
    const overdue = await prisma.calibrationRecord.findMany({
      where: {
        nextCalibrationDate: {
          lt: now
        }
      },
      include: {
        asset: {
          include: {
            department: true
          }
        }
      },
      orderBy: { nextCalibrationDate: 'asc' }
    });

    res.json(overdue);
  } catch (error) {
    console.error('Error fetching overdue calibrations:', error);
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
    const {
      assetId, calibrationDate, nextCalibrationDate, performedBy, vendor,
      result, certificateNumber, note, serviceType, servicePackage, cost,
      decisionNumber, acceptanceMembers, fundingSource, deviceStatusAfter,
      departmentLocation, proposalDate, approvalDate
    } = req.body;

    const data: any = {
      assetId: parseInt(assetId),
      calibrationDate: new Date(calibrationDate),
      nextCalibrationDate: nextCalibrationDate ? new Date(nextCalibrationDate) : null,
      performedBy: performedBy || null,
      vendor: vendor || null,
      result: result || 'PASS',
      certificateNumber: certificateNumber || null,
      note: note || null,
      serviceType: serviceType || 'HIEU_CHUAN',
      servicePackage: servicePackage || null,
      cost: cost !== undefined && cost !== '' ? parseFloat(cost) : 0,
      decisionNumber: decisionNumber || null,
      acceptanceMembers: acceptanceMembers || null,
      fundingSource: fundingSource || 'Thu sự nghiệp',
      deviceStatusAfter: deviceStatusAfter || null,
      departmentLocation: departmentLocation || null,
      proposalDate: proposalDate ? new Date(proposalDate) : null,
      approvalDate: approvalDate ? new Date(approvalDate) : null
    };

    const record = await prisma.calibrationRecord.create({
      data,
      include: { asset: { include: { department: true, category: true } } }
    });
    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating calibration:', error);
    res.status(400).json({ error: 'Error creating calibration' });
  }
});

// PUT /api/calibrations/:id - Chỉnh sửa toàn bộ thông tin hồ sơ hiệu chuẩn
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      assetId, calibrationDate, nextCalibrationDate, performedBy, vendor,
      result, certificateNumber, note, serviceType, servicePackage, cost,
      decisionNumber, acceptanceMembers, fundingSource, deviceStatusAfter,
      departmentLocation, proposalDate, approvalDate
    } = req.body;

    const data: any = {};
    if (assetId !== undefined) data.assetId = parseInt(assetId);
    if (calibrationDate !== undefined) data.calibrationDate = new Date(calibrationDate);
    if (nextCalibrationDate !== undefined) data.nextCalibrationDate = nextCalibrationDate ? new Date(nextCalibrationDate) : null;
    if (performedBy !== undefined) data.performedBy = performedBy;
    if (vendor !== undefined) data.vendor = vendor;
    if (result !== undefined) data.result = result;
    if (certificateNumber !== undefined) data.certificateNumber = certificateNumber;
    if (note !== undefined) data.note = note;
    if (serviceType !== undefined) data.serviceType = serviceType;
    if (servicePackage !== undefined) data.servicePackage = servicePackage;
    if (cost !== undefined) data.cost = cost !== '' && cost !== null ? parseFloat(cost) : 0;
    if (decisionNumber !== undefined) data.decisionNumber = decisionNumber;
    if (acceptanceMembers !== undefined) data.acceptanceMembers = acceptanceMembers;
    if (fundingSource !== undefined) data.fundingSource = fundingSource;
    if (deviceStatusAfter !== undefined) data.deviceStatusAfter = deviceStatusAfter;
    if (departmentLocation !== undefined) data.departmentLocation = departmentLocation;
    if (proposalDate !== undefined) data.proposalDate = proposalDate ? new Date(proposalDate) : null;
    if (approvalDate !== undefined) data.approvalDate = approvalDate ? new Date(approvalDate) : null;

    const record = await prisma.calibrationRecord.update({
      where: { id },
      data,
      include: { asset: { include: { department: true, category: true } } }
    });
    res.json(record);
  } catch (error) {
    console.error('Error updating calibration:', error);
    res.status(400).json({ error: 'Lỗi khi cập nhật hồ sơ hiệu chuẩn' });
  }
});

// DELETE /api/calibrations/:id - Xóa hồ sơ hiệu chuẩn
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.calibrationRecord.delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting calibration:', error);
    res.status(400).json({ error: 'Lỗi khi xóa hồ sơ hiệu chuẩn' });
  }
});

export default router;
