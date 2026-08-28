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
    const distinctAssetCount = new Set(filtered.map(r => r.assetId)).size;
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
      summary: { total, distinctAssetCount, completed, inProgress, pending, totalCost },
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

// POST /api/maintenance - Báo hỏng / Tạo yêu cầu sửa chữa
router.post('/', requireAuth, async (req: any, res) => {
  try {
    const { 
      assetId, departmentId, requestedBy, contactPhone, 
      locationDetail, issueDescription, priority, managingUnit 
    } = req.body;

    if (!requestedBy || !issueDescription) {
      return res.status(400).json({ error: 'Vui lòng nhập người đề nghị và mô tả sự cố' });
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
      fundingSource, decisionNumber, servicePackage, replacementParts, acceptanceMembers,
      deviceStatusAfter, completedDate
    } = req.body;

    const currentReq = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!currentReq) return res.status(404).json({ error: 'Không tìm thấy phiếu yêu cầu' });

    const updateData: any = {
      status,
      technicianName: technicianName || req.user?.fullName || null,
      repairNote: repairNote !== undefined ? repairNote : currentReq.repairNote,
      repairVendor: repairVendor !== undefined ? repairVendor : currentReq.repairVendor,
      repairCost: repairCost !== undefined && repairCost !== '' ? parseFloat(repairCost) : currentReq.repairCost,
      fundingSource: fundingSource !== undefined ? fundingSource : (currentReq as any).fundingSource,
      decisionNumber: decisionNumber !== undefined ? decisionNumber : (currentReq as any).decisionNumber,
      servicePackage: servicePackage !== undefined ? servicePackage : (currentReq as any).servicePackage,
      replacementParts: replacementParts !== undefined ? replacementParts : (currentReq as any).replacementParts,
      acceptanceMembers: acceptanceMembers !== undefined ? acceptanceMembers : (currentReq as any).acceptanceMembers,
      deviceStatusAfter: deviceStatusAfter !== undefined ? deviceStatusAfter : (currentReq as any).deviceStatusAfter
    };

    if (status === 'COMPLETED') {
      updateData.completedDate = completedDate ? new Date(completedDate) : new Date();
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
      data: updateData,
      include: { asset: true, department: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error processing maintenance request:', error);
    res.status(400).json({ error: 'Lỗi khi xử lý phiếu yêu cầu' });
  }
});

// PUT /api/maintenance/:id - Chỉnh sửa toàn bộ nội dung phiếu bảo trì / sửa chữa
router.put('/:id', requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    const existing = await prisma.maintenanceRequest.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy phiếu yêu cầu' });

    const {
      assetId, departmentId, requestedBy, contactPhone, locationDetail,
      issueDescription, priority, status, repairCost, repairVendor, repairNote,
      technicianName, maintenanceType, servicePackage, replacementParts,
      acceptanceMembers, fundingSource, decisionNumber, deviceStatusAfter,
      requestDate, completedDate, managingUnit
    } = req.body;

    const data: any = {};
    if (assetId !== undefined) data.assetId = parseInt(assetId);
    if (departmentId !== undefined) data.departmentId = parseInt(departmentId);
    if (managingUnit !== undefined) data.managingUnit = managingUnit;
    if (requestedBy !== undefined) data.requestedBy = requestedBy;
    if (contactPhone !== undefined) data.contactPhone = contactPhone;
    if (locationDetail !== undefined) data.locationDetail = locationDetail;
    if (issueDescription !== undefined) data.issueDescription = issueDescription;
    if (priority !== undefined) data.priority = priority;
    if (status !== undefined) data.status = status;
    if (repairCost !== undefined) data.repairCost = repairCost !== '' && repairCost !== null ? parseFloat(repairCost) : null;
    if (repairVendor !== undefined) data.repairVendor = repairVendor;
    if (repairNote !== undefined) data.repairNote = repairNote;
    if (technicianName !== undefined) data.technicianName = technicianName;
    if (maintenanceType !== undefined) data.maintenanceType = maintenanceType;
    if (servicePackage !== undefined) data.servicePackage = servicePackage;
    if (replacementParts !== undefined) data.replacementParts = replacementParts;
    if (acceptanceMembers !== undefined) data.acceptanceMembers = acceptanceMembers;
    if (fundingSource !== undefined) data.fundingSource = fundingSource;
    if (decisionNumber !== undefined) data.decisionNumber = decisionNumber;
    if (deviceStatusAfter !== undefined) data.deviceStatusAfter = deviceStatusAfter;
    if (requestDate !== undefined) data.requestDate = new Date(requestDate);
    if (completedDate !== undefined) data.completedDate = completedDate ? new Date(completedDate) : null;

    // Synchronize asset status if status changed
    if (status && status !== existing.status) {
      const targetAssetId = data.assetId || existing.assetId;
      if (status === 'COMPLETED') {
        if (!data.completedDate && !existing.completedDate) data.completedDate = new Date();
        await prisma.asset.update({
          where: { id: targetAssetId },
          data: { status: 'DANG_SU_DUNG' }
        });
      } else if (status === 'IN_PROGRESS' || status === 'PENDING') {
        await prisma.asset.update({
          where: { id: targetAssetId },
          data: { status: 'BAO_TRI' }
        });
      } else if (status === 'REJECTED') {
        await prisma.asset.update({
          where: { id: targetAssetId },
          data: { status: 'HONG' }
        });
      }
    }

    const updated = await prisma.maintenanceRequest.update({
      where: { id },
      data,
      include: { asset: true, department: true }
    });

    res.json(updated);
  } catch (error) {
    console.error('Error updating maintenance request:', error);
    res.status(400).json({ error: 'Lỗi khi cập nhật phiếu yêu cầu sửa chữa' });
  }
});

// DELETE /api/maintenance/:id - Xóa phiếu yêu cầu
router.delete('/:id', requireAuth, async (req: any, res) => {
  try {
    const id = parseInt(req.params.id);
    await prisma.maintenanceRequest.delete({ where: { id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting maintenance request:', error);
    res.status(400).json({ error: 'Lỗi khi xóa phiếu yêu cầu' });
  }
});

export default router;
