import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/planned-maintenance/stats/summary - Thống kê bảo trì kế hoạch định kỳ
router.get('/stats/summary', requireAuth, async (req: any, res) => {
  try {
    const isDept = req.user?.role === 'DEPARTMENT' && req.user?.departmentId;
    const managingUnit = req.user?.role === 'MANAGER_CNTT' ? 'CNTT' :
                         req.user?.role === 'MANAGER_DUOC' ? 'DUOC' :
                         req.user?.role === 'MANAGER_TCHC' ? 'TCHC' : undefined;

    const where: any = {};
    if (isDept) {
      where.asset = { departmentId: req.user.departmentId };
    } else if (managingUnit) {
      where.asset = { managingUnit };
    }

    const records = await prisma.plannedMaintenance.findMany({
      where,
      include: { asset: true }
    });

    const now = new Date();
    const future30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const total = records.length;
    const distinctAssetCount = new Set(records.map(r => r.assetId)).size;
    const passCount = records.filter(r => r.result === 'PASS').length;
    const failCount = records.filter(r => r.result === 'FAIL').length;
    const pendingCount = records.filter(r => r.result === 'PENDING').length;
    const needsRepairCount = records.filter(r => r.result === 'NEEDS_REPAIR').length;
    const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);

    const upcomingCount = records.filter(r => 
      r.nextMaintenanceDate && 
      new Date(r.nextMaintenanceDate) >= now && 
      new Date(r.nextMaintenanceDate) <= future30
    ).length;

    const overdueCount = records.filter(r => 
      r.nextMaintenanceDate && 
      new Date(r.nextMaintenanceDate) < now
    ).length;

    res.json({
      total,
      distinctAssetCount,
      passCount,
      failCount,
      pendingCount,
      needsRepairCount,
      upcomingCount,
      overdueCount,
      totalCost
    });
  } catch (error) {
    console.error('Error fetching planned maintenance stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/planned-maintenance - Danh sách kế hoạch bảo trì với bộ lọc
router.get('/', requireAuth, async (req: any, res) => {
  const { assetId, result, status, search, departmentId, managingUnit } = req.query;
  const where: any = {};
  
  if (assetId) where.assetId = parseInt(assetId as string);
  if (result && result !== 'ALL') where.result = result as string;

  // Enforce role-based scoping
  let enforcedUnit = managingUnit;
  if (req.user?.role === 'MANAGER_CNTT') {
    enforcedUnit = 'CNTT';
  } else if (req.user?.role === 'MANAGER_DUOC') {
    enforcedUnit = 'DUOC';
  } else if (req.user?.role === 'MANAGER_TCHC') {
    enforcedUnit = 'TCHC';
  } else if (req.user?.role === 'DEPARTMENT' && req.user.departmentId) {
    where.asset = { ...(where.asset || {}), departmentId: req.user.departmentId };
  }

  if (departmentId && departmentId !== 'ALL') {
    where.asset = { ...(where.asset || {}), departmentId: parseInt(departmentId as string) };
  }
  if (enforcedUnit && enforcedUnit !== 'ALL') {
    where.asset = { ...(where.asset || {}), managingUnit: enforcedUnit as string };
  }

  try {
    const records = await prisma.plannedMaintenance.findMany({
      where,
      include: { 
        asset: { 
          include: { 
            department: true,
            category: true
          } 
        } 
      },
      orderBy: { maintenanceDate: 'desc' }
    });

    const now = new Date();
    const future60 = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);

    let filtered = records;
    if (status === 'UPCOMING') {
      filtered = filtered.filter(r => 
        r.nextMaintenanceDate && 
        new Date(r.nextMaintenanceDate) >= now && 
        new Date(r.nextMaintenanceDate) <= future60
      );
    } else if (status === 'OVERDUE') {
      filtered = filtered.filter(r => 
        r.nextMaintenanceDate && 
        new Date(r.nextMaintenanceDate) < now
      );
    }

    if (search) {
      const q = (search as string).toLowerCase();
      filtered = filtered.filter(r => 
        r.asset?.name?.toLowerCase().includes(q) ||
        r.asset?.assetCode?.toLowerCase().includes(q) ||
        r.vendor?.toLowerCase().includes(q) ||
        r.performedBy?.toLowerCase().includes(q) ||
        r.planContent?.toLowerCase().includes(q)
      );
    }

    res.json(filtered);
  } catch (error) {
    console.error('Error fetching planned maintenances:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/planned-maintenance/upcoming - Danh sách sắp đến hạn bảo trì
router.get('/upcoming', requireAuth, async (req: any, res) => {
  try {
    const days = parseInt(req.query.days as string) || 60;
    const now = new Date();
    const future = new Date();
    future.setDate(now.getDate() + days);

    const isDept = req.user?.role === 'DEPARTMENT' && req.user?.departmentId;
    const managingUnit = req.user?.role === 'MANAGER_CNTT' ? 'CNTT' :
                         req.user?.role === 'MANAGER_DUOC' ? 'DUOC' :
                         req.user?.role === 'MANAGER_TCHC' ? 'TCHC' : undefined;

    const where: any = {
      nextMaintenanceDate: {
        gte: now,
        lte: future
      }
    };
    if (isDept) {
      where.asset = { departmentId: req.user.departmentId };
    } else if (managingUnit) {
      where.asset = { managingUnit };
    }

    const upcoming = await prisma.plannedMaintenance.findMany({
      where,
      include: {
        asset: {
          include: {
            department: true
          }
        }
      },
      orderBy: { nextMaintenanceDate: 'asc' }
    });

    res.json(upcoming);
  } catch (error) {
    console.error('Error fetching upcoming planned maintenances:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/planned-maintenance/overdue - Danh sách quá hạn bảo trì
router.get('/overdue', requireAuth, async (req: any, res) => {
  try {
    const now = new Date();
    const isDept = req.user?.role === 'DEPARTMENT' && req.user?.departmentId;
    const managingUnit = req.user?.role === 'MANAGER_CNTT' ? 'CNTT' :
                         req.user?.role === 'MANAGER_DUOC' ? 'DUOC' :
                         req.user?.role === 'MANAGER_TCHC' ? 'TCHC' : undefined;

    const where: any = {
      nextMaintenanceDate: {
        lt: now
      }
    };
    if (isDept) {
      where.asset = { departmentId: req.user.departmentId };
    } else if (managingUnit) {
      where.asset = { managingUnit };
    }

    const overdue = await prisma.plannedMaintenance.findMany({
      where,
      include: {
        asset: {
          include: {
            department: true
          }
        }
      },
      orderBy: { nextMaintenanceDate: 'asc' }
    });

    res.json(overdue);
  } catch (error) {
    console.error('Error fetching overdue planned maintenances:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/planned-maintenance/:id
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const record = await prisma.plannedMaintenance.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { asset: { include: { department: true, category: true } } }
    });
    if (!record) return res.status(404).json({ error: 'Không tìm thấy hồ sơ bảo trì' });
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/planned-maintenance - Tạo hồ sơ bảo trì theo kế hoạch
router.post('/', requireAuth, async (req: any, res) => {
  try {
    const {
      assetId, maintenanceDate, nextMaintenanceDate, cycleMonths, performedBy, vendor,
      planContent, result, cost, decisionNumber, acceptanceMembers, fundingSource,
      deviceStatusAfter, note
    } = req.body;

    if (!assetId) {
      return res.status(400).json({ error: 'Vui lòng chọn thiết bị bảo trì' });
    }

    const mDate = maintenanceDate ? new Date(maintenanceDate) : new Date();
    let nextDate = nextMaintenanceDate ? new Date(nextMaintenanceDate) : null;
    
    // Auto calculate next date if cycleMonths provided and nextDate not specified
    if (!nextDate && cycleMonths) {
      nextDate = new Date(mDate);
      nextDate.setMonth(nextDate.getMonth() + parseInt(cycleMonths));
    }

    const record = await prisma.plannedMaintenance.create({
      data: {
        assetId: parseInt(assetId),
        maintenanceDate: mDate,
        nextMaintenanceDate: nextDate,
        cycleMonths: cycleMonths ? parseInt(cycleMonths) : 6,
        performedBy: performedBy || req.user?.fullName,
        vendor,
        planContent: planContent || 'Bảo trì định kỳ theo kế hoạch',
        result: result || 'PASS',
        cost: cost !== '' && cost !== null ? parseFloat(cost) : 0,
        decisionNumber,
        acceptanceMembers,
        fundingSource: fundingSource || 'Kinh phí sự nghiệp / Quỹ PTHĐSN',
        deviceStatusAfter: deviceStatusAfter || 'Hoạt động tốt',
        note
      },
      include: { asset: { include: { department: true, category: true } } }
    });

    res.status(201).json(record);
  } catch (error) {
    console.error('Error creating planned maintenance:', error);
    res.status(400).json({ error: 'Lỗi khi tạo hồ sơ bảo trì theo kế hoạch' });
  }
});

// PUT /api/planned-maintenance/:id - Cập nhật hồ sơ bảo trì theo kế hoạch
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const {
      assetId, maintenanceDate, nextMaintenanceDate, cycleMonths, performedBy, vendor,
      planContent, result, cost, decisionNumber, acceptanceMembers, fundingSource,
      deviceStatusAfter, note
    } = req.body;

    const data: any = {};
    if (assetId !== undefined) data.assetId = parseInt(assetId);
    if (maintenanceDate !== undefined) data.maintenanceDate = new Date(maintenanceDate);
    if (nextMaintenanceDate !== undefined) data.nextMaintenanceDate = nextMaintenanceDate ? new Date(nextMaintenanceDate) : null;
    if (cycleMonths !== undefined) data.cycleMonths = parseInt(cycleMonths);
    if (performedBy !== undefined) data.performedBy = performedBy;
    if (vendor !== undefined) data.vendor = vendor;
    if (planContent !== undefined) data.planContent = planContent;
    if (result !== undefined) data.result = result;
    if (cost !== undefined) data.cost = cost !== '' && cost !== null ? parseFloat(cost) : 0;
    if (decisionNumber !== undefined) data.decisionNumber = decisionNumber;
    if (acceptanceMembers !== undefined) data.acceptanceMembers = acceptanceMembers;
    if (fundingSource !== undefined) data.fundingSource = fundingSource;
    if (deviceStatusAfter !== undefined) data.deviceStatusAfter = deviceStatusAfter;
    if (note !== undefined) data.note = note;

    const record = await prisma.plannedMaintenance.update({
      where: { id },
      data,
      include: { asset: { include: { department: true, category: true } } }
    });
    res.json(record);
  } catch (error) {
    console.error('Error updating planned maintenance:', error);
    res.status(400).json({ error: 'Lỗi khi cập nhật hồ sơ bảo trì' });
  }
});

// DELETE /api/planned-maintenance/:id - Xóa hồ sơ bảo trì theo kế hoạch
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.plannedMaintenance.delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting planned maintenance:', error);
    res.status(400).json({ error: 'Lỗi khi xóa hồ sơ bảo trì' });
  }
});

export default router;
