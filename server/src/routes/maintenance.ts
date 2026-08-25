import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// GET /api/maintenance/stats/periodic - Báo cáo thống kê định kỳ tháng, quý, năm
router.get('/stats/periodic', requireAuth, async (req: any, res) => {
  try {
    const { year = '2026', month, quarter, departmentId, managingUnit } = req.query;

    const allRequests = await prisma.maintenanceRequest.findMany({
      include: {
        asset: { include: { category: true } },
        department: true
      },
      orderBy: { requestDate: 'desc' }
    });

    // Enforce role-based scoping for periodic stats
    let userManagingUnit = managingUnit;
    let userDepartmentId = departmentId;
    if (req.user?.role === 'MANAGER_CNTT') userManagingUnit = 'CNTT';
    else if (req.user?.role === 'MANAGER_DUOC') userManagingUnit = 'DUOC';
    else if (req.user?.role === 'MANAGER_TCHC') userManagingUnit = 'TCHC';
    else if (req.user?.role === 'DEPARTMENT' && req.user.departmentId) userDepartmentId = req.user.departmentId;

    // Filter by year, month, quarter
    let filtered = allRequests.filter(r => {
      const d = new Date(r.requestDate);
      if (year && d.getFullYear().toString() !== year.toString()) return false;
      if (month && (d.getMonth() + 1).toString() !== month.toString()) return false;
      if (quarter) {
        const q = Math.floor(d.getMonth() / 3) + 1;
        if (q.toString() !== quarter.toString()) return false;
      }
      if (userDepartmentId && userDepartmentId !== 'ALL' && r.departmentId.toString() !== userDepartmentId.toString()) return false;
      const unit = (r as any).managingUnit || (r.asset as any)?.managingUnit;
      if (userManagingUnit && userManagingUnit !== 'ALL' && unit !== userManagingUnit) return false;
      return true;
    });

    const total = filtered.length;
    const completed = filtered.filter(r => r.status === 'COMPLETED').length;
    const inProgress = filtered.filter(r => r.status === 'IN_PROGRESS').length;
    const pending = filtered.filter(r => r.status === 'PENDING').length;
    const totalCost = filtered.reduce((sum, r) => sum + (r.repairCost || 0), 0);

    // Group by managingUnit
    const byUnit = {
      DUOC: { name: 'Khoa Dược (TBYT)', count: 0, cost: 0, completed: 0 },
      CNTT: { name: 'Tổ CNTT', count: 0, cost: 0, completed: 0 },
      TCHC: { name: 'Phòng TCHC', count: 0, cost: 0, completed: 0 }
    };

    filtered.forEach(r => {
      const unit = ((r as any).managingUnit || (r.asset as any)?.managingUnit || 'CNTT') as keyof typeof byUnit;
      if (byUnit[unit]) {
        byUnit[unit].count++;
        byUnit[unit].cost += (r.repairCost || 0);
        if (r.status === 'COMPLETED') byUnit[unit].completed++;
      }
    });

    // Group by Department
    const deptMap = new Map<number, { name: string; code: string; count: number; cost: number; completed: number }>();
    filtered.forEach(r => {
      const dId = r.departmentId;
      const dName = r.department?.name || 'CDC';
      const dCode = r.department?.code || 'CDC';
      if (!deptMap.has(dId)) {
        deptMap.set(dId, { name: dName, code: dCode, count: 0, cost: 0, completed: 0 });
      }
      const entry = deptMap.get(dId)!;
      entry.count++;
      entry.cost += (r.repairCost || 0);
      if (r.status === 'COMPLETED') entry.completed++;
    });

    res.json({
      period: { year, month: month || null, quarter: quarter || null },
      summary: { total, completed, inProgress, pending, totalCost },
      byUnit: Object.values(byUnit),
      byDepartment: Array.from(deptMap.values()),
      records: filtered
    });
  } catch (error) {
    console.error('Error calculating periodic stats:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/maintenance - Danh sách yêu cầu với bộ lọc
router.get('/', requireAuth, async (req: any, res) => {
  const { departmentId, status, priority, managingUnit, assetId } = req.query;
  const where: any = {};

  if (departmentId && departmentId !== 'ALL') where.departmentId = parseInt(departmentId);
  if (status && status !== 'ALL') where.status = status;
  if (priority && priority !== 'ALL') where.priority = priority;
  if (assetId) where.assetId = parseInt(assetId);

  // Enforce role-based scoping
  let enforcedUnit = managingUnit;
  if (req.user?.role === 'MANAGER_CNTT') {
    enforcedUnit = 'CNTT';
  } else if (req.user?.role === 'MANAGER_DUOC') {
    enforcedUnit = 'DUOC';
  } else if (req.user?.role === 'MANAGER_TCHC') {
    enforcedUnit = 'TCHC';
  } else if (req.user?.role === 'DEPARTMENT' && req.user.departmentId) {
    where.departmentId = req.user.departmentId;
  }

  try {
    const requests = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        asset: {
          include: {
            category: true,
            department: true
          }
        },
        department: true
      },
      orderBy: { requestDate: 'desc' }
    });

    let filtered = requests;
    if (enforcedUnit && enforcedUnit !== 'ALL') {
      filtered = filtered.filter(r => (r as any).managingUnit === enforcedUnit || (r.asset as any)?.managingUnit === enforcedUnit);
    }

    res.json(filtered);
  } catch (error) {
    console.error('Error fetching maintenance requests:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/maintenance/:id - Chi tiết 1 phiếu yêu cầu
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const request = await prisma.maintenanceRequest.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        asset: { include: { category: true, department: true } },
        department: true
      }
    });
    if (!request) return res.status(404).json({ error: 'Not found' });
    res.json(request);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/maintenance - Tạo yêu cầu báo hỏng / sửa chữa (Khoa/phòng gửi)
router.post('/', requireAuth, async (req: any, res) => {
  try {
    const {
      assetId, departmentId, requestedBy, contactPhone,
      locationDetail, issueDescription, priority, managingUnit
    } = req.body;

    if (!requestedBy) {
      return res.status(400).json({ error: 'Vui lòng nhập tên người đề nghị báo hỏng' });
    }
    if (!assetId) {
      return res.status(400).json({ error: 'Vui lòng chọn thiết bị hư hỏng' });
    }

    // Fetch asset to determine managingUnit if not specified
    const asset = await prisma.asset.findUnique({ where: { id: parseInt(assetId) } });
    const finalManagingUnit = managingUnit || (asset as any)?.managingUnit || 'CNTT';
    const finalDeptId = departmentId ? parseInt(departmentId) : (asset?.departmentId || req.user?.departmentId || 1);

    const request = await prisma.maintenanceRequest.create({
      data: {
        assetId: parseInt(assetId),
        departmentId: finalDeptId,
        requestedBy,
        contactPhone: contactPhone || null,
        locationDetail: locationDetail || asset?.locationDetail || null,
        issueDescription,
        priority: priority || 'MEDIUM',
        status: 'PENDING',
        managingUnit: finalManagingUnit,
        requestDate: new Date()
      }
    });

    // Update asset status to BAO_TRI or HONG
    await prisma.asset.update({
      where: { id: parseInt(assetId) },
      data: { status: 'BAO_TRI' }
    });

    res.status(201).json(request);
  } catch (error) {
    console.error('Error creating maintenance request:', error);
    res.status(400).json({ error: 'Lỗi khi tạo phiếu yêu cầu sửa chữa' });
  }
});

// PUT /api/maintenance/:id/process - Quản lý / Kỹ thuật viên tiếp nhận & xử lý
router.put('/:id/process', requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const { 
      status, technicianName, repairCost, repairVendor, repairNote,
      fundingSource, decisionNumber, servicePackage, replacementParts, acceptanceMembers 
    } = req.body;

    const currentReq = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!currentReq) return res.status(404).json({ error: 'Không tìm thấy phiếu yêu cầu' });

    const updateData: any = {
      status,
      technicianName: technicianName || req.user?.fullName || null,
      repairNote: repairNote || currentReq.repairNote,
      repairVendor: repairVendor || currentReq.repairVendor,
      repairCost: repairCost !== undefined && repairCost !== '' ? parseFloat(repairCost) : currentReq.repairCost,
      fundingSource: fundingSource !== undefined ? fundingSource : (currentReq as any).fundingSource,
      decisionNumber: decisionNumber !== undefined ? decisionNumber : (currentReq as any).decisionNumber,
      servicePackage: servicePackage !== undefined ? servicePackage : (currentReq as any).servicePackage,
      replacementParts: replacementParts !== undefined ? replacementParts : (currentReq as any).replacementParts,
      acceptanceMembers: acceptanceMembers !== undefined ? acceptanceMembers : (currentReq as any).acceptanceMembers
    };

    if (status === 'COMPLETED') {
      updateData.completedDate = new Date();
      // Update asset back to DANG_SU_DUNG
      await prisma.asset.update({
        where: { id: currentReq.assetId },
        data: { status: 'DANG_SU_DUNG' }
      });
    } else if (status === 'IN_PROGRESS') {
      await prisma.asset.update({
        where: { id: currentReq.assetId },
        data: { status: 'BAO_TRI' }
      });
    } else if (status === 'REJECTED') {
      await prisma.asset.update({
        where: { id: currentReq.assetId },
        data: { status: 'HONG' }
      });
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (error) {
    console.error('Error processing maintenance request:', error);
    res.status(400).json({ error: 'Lỗi khi xử lý phiếu yêu cầu' });
  }
});

// PUT /api/maintenance/:id - Cập nhật chung
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

export default router;
