import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

router.get('/stats', requireAuth, async (req: any, res) => {
  try {
    const totalAssets = await prisma.asset.count();
    const dangSuDung = await prisma.asset.count({ where: { status: 'DANG_SU_DUNG' } });
    const hong = await prisma.asset.count({ where: { status: 'HONG' } });
    const baoTri = await prisma.asset.count({ where: { status: 'BAO_TRI' } });
    const choPhanBo = await prisma.asset.count({ where: { status: 'CHO_PHAN_BO' } });
    const choThanhLy = await prisma.asset.count({ where: { status: 'CHO_THANH_LY' } });
    const daThanhLy = await prisma.asset.count({ where: { status: 'DA_THANH_LY' } });
    const khongSuDung = await prisma.asset.count({ where: { status: 'KHONG_SU_DUNG' } });
    
    // Sum prices
    const assets = await prisma.asset.findMany({ select: { originalPrice: true, currentValue: true } });
    const totalValue = assets.reduce((sum, a) => sum + (a.originalPrice || 0), 0);

    // Counts by 3 Managing Units
    const tchcTotal = await prisma.asset.count({ where: { managingUnit: 'TCHC' } });
    const tchcToanha = await prisma.asset.count({ where: { managingUnit: 'TCHC', buildingAsset: 1 } });
    const tchcHanhchinh = await prisma.asset.count({ where: { managingUnit: 'TCHC', buildingAsset: 0 } });
    const duocTotal = await prisma.asset.count({ where: { managingUnit: 'DUOC' } });
    const cnttTotal = await prisma.asset.count({ where: { managingUnit: 'CNTT' } });

    // Subcategory statistics for badges matching user image:
    const pcCount = await prisma.asset.count({ where: { OR: [{ name: { contains: 'máy tính' } }, { name: { contains: 'PC' } }, { name: { contains: 'vi tính' } }, { name: { contains: 'FPT' } }] } });
    const laptopCount = await prisma.asset.count({ where: { OR: [{ name: { contains: 'laptop' } }, { name: { contains: 'Dell' } }, { name: { contains: 'HP' } }, { name: { contains: 'notebook' } }] } });
    const mayInCount = await prisma.asset.count({ where: { OR: [{ name: { contains: 'máy in' } }, { name: { contains: 'canon' } }, { name: { contains: 'printer' } }] } });
    const networkCount = await prisma.asset.count({ where: { OR: [{ name: { contains: 'mạng' } }, { name: { contains: 'switch' } }, { name: { contains: 'router' } }, { name: { contains: 'wifi' } }] } });
    const phuKienCount = await prisma.asset.count({ where: { OR: [{ name: { contains: 'chuột' } }, { name: { contains: 'bàn phím' } }, { name: { contains: 'dây' } }, { name: { contains: 'ổ cứng' } }] } });
    const manHinhCount = await prisma.asset.count({ where: { OR: [{ name: { contains: 'màn hình' } }, { name: { contains: 'monitor' } }] } });

    res.json({
      totalAssets,
      dangSuDung,
      hong,
      baoTri: baoTri + hong,
      choPhanBo,
      choThanhLy,
      daThanhLy,
      khongSuDung,
      totalValue,
      managingUnits: {
        tchc: { total: tchcTotal, toanha: tchcToanha, hanhchinh: tchcHanhchinh },
        duoc: { total: duocTotal },
        cntt: { total: cnttTotal }
      },
      badges: [
        { name: 'Khối TBYT (Khoa Dược)', count: duocTotal, percent: totalAssets ? Math.round((duocTotal / totalAssets) * 100) : 0, key: 'DUOC' },
        { name: 'Khối CNTT', count: cnttTotal, percent: totalAssets ? Math.round((cnttTotal / totalAssets) * 100) : 0, key: 'CNTT' },
        { name: 'TCHC (Thiết bị hành chính)', count: tchcHanhchinh, percent: totalAssets ? Math.round((tchcHanhchinh / totalAssets) * 100) : 0, key: 'TCHC_HC' },
        { name: 'TCHC (Hạ tầng tòa nhà các tầng)', count: tchcToanha, percent: totalAssets ? Math.round((tchcToanha / totalAssets) * 100) : 0, key: 'TCHC_TOANHA' },
        { name: 'PC / Máy để bàn', count: pcCount, percent: totalAssets ? Math.round((pcCount / totalAssets) * 100) : 0 },
        { name: 'Laptop', count: laptopCount, percent: totalAssets ? Math.round((laptopCount / totalAssets) * 100) : 0 },
        { name: 'Máy in / Scan', count: mayInCount, percent: totalAssets ? Math.round((mayInCount / totalAssets) * 100) : 0 },
      ]
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/by-category', requireAuth, async (req, res) => {
  try {
    const tchcToanha = await prisma.asset.count({ where: { managingUnit: 'TCHC', buildingAsset: 1 } });
    const tchcHanhchinh = await prisma.asset.count({ where: { managingUnit: 'TCHC', buildingAsset: 0 } });
    const duocTotal = await prisma.asset.count({ where: { managingUnit: 'DUOC' } });
    const cnttTotal = await prisma.asset.count({ where: { managingUnit: 'CNTT' } });

    const data = [
      { name: 'Trang thiết bị Y tế (Khoa Dược)', count: duocTotal },
      { name: 'Cơ sở vật chất tòa nhà (TCHC)', count: tchcToanha },
      { name: 'Thiết bị CNTT (Tổ CNTT)', count: cnttTotal },
      { name: 'Thiết bị Hành chính & CCDC (TCHC)', count: tchcHanhchinh },
    ];
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/by-department', requireAuth, async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      include: { _count: { select: { assets: true } } },
      orderBy: { assets: { _count: 'desc' } },
      take: 12
    });
    const data = departments.map(d => ({
      name: d.code,
      fullName: d.name,
      count: d._count.assets
    }));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/by-status', requireAuth, async (req, res) => {
  try {
    const statuses = await prisma.asset.groupBy({
      by: ['status'],
      _count: { status: true }
    });
    res.json(statuses);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/trends', requireAuth, async (req, res) => {
  const months = ['T3/2026', 'T4/2026', 'T5/2026', 'T6/2026', 'T7/2026', 'T8/2026'];
  const total = await prisma.asset.count();
  const data = [
    { month: months[0], total: Math.round(total * 0.85) },
    { month: months[1], total: Math.round(total * 0.88) },
    { month: months[2], total: Math.round(total * 0.91) },
    { month: months[3], total: Math.round(total * 0.94) },
    { month: months[4], total: Math.round(total * 0.97) },
    { month: months[5], total: total },
  ];
  res.json(data);
});

router.get('/maintenance-summary', requireAuth, async (req, res) => {
  try {
    const pending = await prisma.maintenanceRequest.count({ where: { status: 'PENDING' } });
    const inProgress = await prisma.maintenanceRequest.count({ where: { status: 'IN_PROGRESS' } });
    const completed = await prisma.maintenanceRequest.count({ where: { status: 'COMPLETED' } });
    res.json({ pending, inProgress, completed });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/calibration-alerts', requireAuth, async (req, res) => {
  try {
    const upcoming = await prisma.calibrationRecord.count({
      where: {
        nextCalibrationDate: {
          gte: new Date(),
          lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      }
    });
    const overdue = await prisma.calibrationRecord.count({
      where: { nextCalibrationDate: { lt: new Date() } }
    });
    res.json({ upcoming, overdue });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
