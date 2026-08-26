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
    const q = search.trim();
    where.OR = [
      { name: { contains: q, mode: 'insensitive' } },
      { assetCode: { contains: q, mode: 'insensitive' } },
      { locationDetail: { contains: q, mode: 'insensitive' } },
      { specifications: { contains: q, mode: 'insensitive' } }
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
      orderBy: [
        { departmentId: 'asc' },
        { assetCode: 'asc' }
      ]
    });
    res.json({ total, page: pageNum, limit: limitNum, assets });
  } catch (error) {
    console.error('Error in /api/assets:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id', requireAuth, async (req, res) => {
  try {
    const rawParam = req.params.id;
    const isNum = /^\d+$/.test(rawParam);

    const asset = await prisma.asset.findFirst({
      where: isNum ? { id: parseInt(rawParam) } : { assetCode: rawParam },
      include: {
        category: true,
        department: true,
        transfers: { include: { fromDepartment: true, toDepartment: true } },
        maintenanceRequests: true,
        calibrations: true,
        depreciations: true
      }
    });

    if (!asset) return res.status(404).json({ error: 'Không tìm thấy thiết bị yêu cầu.' });
    res.json(asset);
  } catch (error) {
    console.error('Error fetching asset detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireAuth, async (req: any, res) => {
  try {
    const {
      assetCode, name, categoryId, departmentId, location, locationDetail,
      assignedTo, yearInUse, originalPrice, currentValue, depreciationRate,
      manufacturer, countryOfOrigin, specifications, status, managingUnit,
      floor, buildingAsset, bookQuantity, actualQuantity, quantityDifference,
      source, fundingSource, decisionNumber, note
    } = req.body;

    let finalManagingUnit = managingUnit || 'TCHC';
    if (req.user) {
      if (req.user.role === 'MANAGER_CNTT') finalManagingUnit = 'CNTT';
      else if (req.user.role === 'MANAGER_DUOC') finalManagingUnit = 'DUOC';
      else if (req.user.role === 'MANAGER_TCHC') finalManagingUnit = 'TCHC';
    }

    const data: any = {
      assetCode: (assetCode || '').trim(),
      name: (name || '').trim(),
      categoryId: parseInt(categoryId) || 1,
      departmentId: parseInt(departmentId) || 1,
      managingUnit: finalManagingUnit,
      location: location || 'Cơ sở 1',
      locationDetail: locationDetail || null,
      assignedTo: assignedTo || null,
      yearInUse: yearInUse ? parseInt(yearInUse) : null,
      originalPrice: originalPrice !== '' && originalPrice !== null && originalPrice !== undefined ? parseFloat(originalPrice) : null,
      currentValue: currentValue !== '' && currentValue !== null && currentValue !== undefined ? parseFloat(currentValue) : null,
      depreciationRate: depreciationRate !== '' && depreciationRate !== null && depreciationRate !== undefined ? parseFloat(depreciationRate) : null,
      manufacturer: manufacturer || null,
      countryOfOrigin: countryOfOrigin || null,
      specifications: specifications || null,
      status: status || 'DANG_SU_DUNG',
      floor: floor || null,
      buildingAsset: parseInt(buildingAsset) || 0,
      bookQuantity: parseInt(bookQuantity) || 1,
      actualQuantity: parseInt(actualQuantity) || 1,
      quantityDifference: parseInt(quantityDifference) || 0,
      source: source || null,
      fundingSource: fundingSource || 'Nguồn ngân sách nhà nước cấp',
      decisionNumber: decisionNumber || null,
      note: note || null,
      qrCode: uuidv4()
    };

    const asset = await prisma.asset.create({ data });
    res.status(201).json(asset);
  } catch (error) {
    console.error('Error creating asset:', error);
    res.status(400).json({ error: 'Lỗi khi tạo mới tài sản' });
  }
});

router.put('/:id', requireAuth, async (req: any, res) => {
  try {
    const rawId = req.params.id;
    const isNum = /^\d+$/.test(rawId);
    const existing = await prisma.asset.findFirst({
      where: isNum ? { id: parseInt(rawId) } : { assetCode: rawId }
    });
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy tài sản' });

    // Enforce role isolation
    if (req.user && req.user.role !== 'ADMIN') {
      if (req.user.role === 'MANAGER_CNTT' && existing.managingUnit !== 'CNTT') {
        return res.status(403).json({ error: 'Bạn chỉ có quyền chỉnh sửa tài sản thuộc Khối CNTT' });
      }
      if (req.user.role === 'MANAGER_DUOC' && existing.managingUnit !== 'DUOC') {
        return res.status(403).json({ error: 'Bạn chỉ có quyền chỉnh sửa tài sản thuộc Khối Khoa Dược (TBYT)' });
      }
      if (req.user.role === 'MANAGER_TCHC' && existing.managingUnit !== 'TCHC') {
        return res.status(403).json({ error: 'Bạn chỉ có quyền chỉnh sửa tài sản thuộc Khối Phòng TCHC' });
      }
    }

    const {
      assetCode, name, categoryId, departmentId, location, locationDetail,
      assignedTo, yearInUse, originalPrice, currentValue, depreciationRate,
      manufacturer, countryOfOrigin, specifications, status, managingUnit,
      floor, buildingAsset, bookQuantity, actualQuantity, quantityDifference,
      source, fundingSource, decisionNumber, note
    } = req.body;

    const data: any = {};
    if (assetCode !== undefined) data.assetCode = assetCode.trim();
    if (name !== undefined) data.name = name.trim();
    if (categoryId !== undefined) data.categoryId = parseInt(categoryId);
    if (departmentId !== undefined) data.departmentId = parseInt(departmentId);
    if (location !== undefined) data.location = location;
    if (locationDetail !== undefined) data.locationDetail = locationDetail;
    if (assignedTo !== undefined) data.assignedTo = assignedTo;
    if (yearInUse !== undefined) data.yearInUse = yearInUse ? parseInt(yearInUse) : null;
    if (originalPrice !== undefined) data.originalPrice = originalPrice !== '' && originalPrice !== null ? parseFloat(originalPrice) : null;
    if (currentValue !== undefined) data.currentValue = currentValue !== '' && currentValue !== null ? parseFloat(currentValue) : null;
    if (depreciationRate !== undefined) data.depreciationRate = depreciationRate !== '' && depreciationRate !== null ? parseFloat(depreciationRate) : null;
    if (manufacturer !== undefined) data.manufacturer = manufacturer;
    if (countryOfOrigin !== undefined) data.countryOfOrigin = countryOfOrigin;
    if (specifications !== undefined) data.specifications = specifications;
    if (status !== undefined) data.status = status;
    if (floor !== undefined) data.floor = floor;
    if (buildingAsset !== undefined) data.buildingAsset = parseInt(buildingAsset) || 0;
    if (bookQuantity !== undefined) data.bookQuantity = parseInt(bookQuantity) || 1;
    if (actualQuantity !== undefined) data.actualQuantity = parseInt(actualQuantity) || 1;
    if (quantityDifference !== undefined) data.quantityDifference = parseInt(quantityDifference) || 0;
    if (source !== undefined) data.source = source;
    if (fundingSource !== undefined) data.fundingSource = fundingSource;
    if (decisionNumber !== undefined) data.decisionNumber = decisionNumber;
    if (note !== undefined) data.note = note;

    if (req.user) {
      if (req.user.role === 'MANAGER_CNTT') data.managingUnit = 'CNTT';
      else if (req.user.role === 'MANAGER_DUOC') data.managingUnit = 'DUOC';
      else if (req.user.role === 'MANAGER_TCHC') data.managingUnit = 'TCHC';
      else if (managingUnit !== undefined) data.managingUnit = managingUnit;
    }

    const updated = await prisma.asset.update({
      where: { id: existing.id },
      data
    });
    res.json(updated);
  } catch (error) {
    console.error('Error updating asset:', error);
    res.status(400).json({ error: 'Lỗi khi cập nhật tài sản' });
  }
});

router.delete('/:id', requireAuth, async (req: any, res) => {
  try {
    const rawId = req.params.id;
    const isNum = /^\d+$/.test(rawId);
    const existing = await prisma.asset.findFirst({
      where: isNum ? { id: parseInt(rawId) } : { assetCode: rawId }
    });
    if (!existing) return res.status(404).json({ error: 'Không tìm thấy tài sản' });

    if (req.user && req.user.role !== 'ADMIN') {
      if (req.user.role === 'MANAGER_CNTT' && existing.managingUnit !== 'CNTT') {
        return res.status(403).json({ error: 'Bạn chỉ có quyền xóa tài sản thuộc Khối CNTT' });
      }
      if (req.user.role === 'MANAGER_DUOC' && existing.managingUnit !== 'DUOC') {
        return res.status(403).json({ error: 'Bạn chỉ có quyền xóa tài sản thuộc Khối Khoa Dược' });
      }
      if (req.user.role === 'MANAGER_TCHC' && existing.managingUnit !== 'TCHC') {
        return res.status(403).json({ error: 'Bạn chỉ có quyền xóa tài sản thuộc Khối Phòng TCHC' });
      }
    }

    await prisma.asset.delete({ where: { id: existing.id } });
    res.json({ message: 'Deleted successfully' });
  } catch (error) {
    console.error('Error deleting asset:', error);
    res.status(400).json({ error: 'Error deleting asset' });
  }
});

router.get('/:id/qr', requireAuth, async (req, res) => {
  try {
    const rawParam = req.params.id;
    const isNum = /^\d+$/.test(rawParam);
    const asset = await prisma.asset.findFirst({
      where: isNum ? { id: parseInt(rawParam) } : { assetCode: rawParam }
    });
    if (!asset) return res.status(404).json({ error: 'Not found' });
    
    const url = `http://localhost:5173/qr/${encodeURIComponent(asset.assetCode)}`;
    const qrCodeImage = await QRCode.toDataURL(url);
    res.json({ qrCode: qrCodeImage });
  } catch (error) {
    console.error('Error in QR generation:', error);
    res.status(500).json({ error: 'Error generating QR code' });
  }
});

router.get('/by-qr/:code', requireAuth, async (req, res) => {
  try {
    const asset = await prisma.asset.findFirst({
      where: {
        OR: [
          { assetCode: req.params.code },
          { qrCode: req.params.code }
        ]
      },
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
    console.error('Error fetching by qr:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
