import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import authRoutes from './routes/auth';
import departmentRoutes from './routes/departments';
import categoryRoutes from './routes/categories';
import assetRoutes from './routes/assets';
import transferRoutes from './routes/transfers';
import maintenanceRoutes from './routes/maintenance';
import inventoryRoutes from './routes/inventory';
import disposalRoutes from './routes/disposals';
import depreciationRoutes from './routes/depreciation';
import calibrationRoutes from './routes/calibrations';
import dashboardRoutes from './routes/dashboard';
import exportRoutes from './routes/export';
import committeeRoutes from './routes/committee';
import userRoutes from './routes/users';

const app = express();
const PORT = process.env.PORT || 3001;

// 1. Ensure Persistent Storage & SQLite Database Initialization
const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
if (dbUrl.startsWith('file:')) {
  const dbFilePath = dbUrl.replace('file:', '').trim();
  const dbDir = path.dirname(dbFilePath);
  
  if (dbDir && dbDir !== '.' && !fs.existsSync(dbDir)) {
    try {
      fs.mkdirSync(dbDir, { recursive: true });
      console.log(`[Storage] Created persistent database directory: ${dbDir}`);
    } catch (e) {
      console.warn(`[Storage] Warning creating directory ${dbDir}:`, e);
    }
  }

  // If persistent database file does not exist yet (first deploy), copy initial bundled database
  if (!fs.existsSync(dbFilePath)) {
    const bundledCandidates = [
      path.join(__dirname, '../prisma/dev.db'),
      path.join(__dirname, '../../prisma/dev.db'),
      path.join(process.cwd(), 'prisma/dev.db'),
      path.join(process.cwd(), 'server/prisma/dev.db')
    ];
    const foundBundled = bundledCandidates.find(p => fs.existsSync(p));
    if (foundBundled) {
      try {
        fs.copyFileSync(foundBundled, dbFilePath);
        console.log(`[Storage] Initialized persistent database from ${foundBundled} -> ${dbFilePath}`);
      } catch (e) {
        console.warn('[Storage] Could not copy initial database:', e);
      }
    }
  }
}

// 2. Ensure Uploads Directory
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
}

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/disposals', disposalRoutes);
app.use('/api/depreciation', depreciationRoutes);
app.use('/api/calibrations', calibrationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/export', exportRoutes);
app.use('/api/committee', committeeRoutes);
app.use('/api/users', userRoutes);

// Health check & Database connection diagnostic endpoint for Coolify / Docker
app.get('/api/health', async (req, res) => {
  try {
    const userCount = await prisma.user.count();
    const assetCount = await prisma.asset.count();
    res.json({
      status: 'ok',
      database: 'connected',
      userCount,
      assetCount,
      time: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({
      status: 'database_error',
      database: 'disconnected',
      error: err?.message || String(err),
      time: new Date().toISOString()
    });
  }
});

// Serve frontend static assets in production if client/dist exists
const possibleDistPaths = [
  path.join(__dirname, '../../client/dist'),
  path.join(__dirname, '../client/dist'),
  path.join(process.cwd(), '../client/dist'),
  path.join(process.cwd(), 'client/dist'),
  '/app/client/dist'
];
const staticPath = possibleDistPaths.find(p => fs.existsSync(p)) || null;

if (staticPath) {
  console.log(`Serving static client files from: ${staticPath}`);
  app.use(express.static(staticPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function autoMigrateAndSeed() {
  try {
    // 0. Auto-seed if database is empty or outdated (sync all 11,254 assets for all 16 departments)
    const assetCount = await prisma.asset.count().catch(() => 0);
    if (assetCount < 8000) {
      console.log(`[Database] Syncing comprehensive master dataset (${assetCount} -> 11,254 assets across all 16 departments)...`);
      const seedDataCandidates = [
        path.join(__dirname, '../prisma/initial-seed-data.json'),
        path.join(__dirname, '../../prisma/initial-seed-data.json'),
        path.join(process.cwd(), 'prisma/initial-seed-data.json'),
        path.join(process.cwd(), 'server/prisma/initial-seed-data.json')
      ];
      const foundSeed = seedDataCandidates.find(p => fs.existsSync(p));
      if (foundSeed) {
        try {
          const raw = fs.readFileSync(foundSeed, 'utf-8');
          const data = JSON.parse(raw);

          // Seed categories
          for (const cat of data.categories) {
            await prisma.assetCategory.upsert({
              where: { id: cat.id },
              update: { code: cat.code, name: cat.name, description: cat.description },
              create: { id: cat.id, code: cat.code, name: cat.name, description: cat.description }
            });
          }

          // Seed departments
          for (const dept of data.departments) {
            await prisma.department.upsert({
              where: { id: dept.id },
              update: { code: dept.code, name: dept.name, location: dept.location, description: dept.description },
              create: { id: dept.id, code: dept.code, name: dept.name, location: dept.location, description: dept.description }
            });
          }

          // Seed users
          for (const user of data.users) {
            await prisma.user.upsert({
              where: { username: user.username },
              update: { fullName: user.fullName, role: user.role, departmentId: user.departmentId, password: user.password },
              create: { username: user.username, password: user.password, fullName: user.fullName, role: user.role, departmentId: user.departmentId }
            });
          }

          // Seed committee
          if (data.committee && data.committee.length > 0) {
            for (const mem of data.committee) {
              await prisma.inventoryCommitteeMember.upsert({
                where: { id: mem.id },
                update: { fullName: mem.fullName, position: mem.position, role: mem.role, departmentId: mem.departmentId, scope: mem.scope, isActive: mem.isActive, displayOrder: mem.displayOrder },
                create: { id: mem.id, fullName: mem.fullName, position: mem.position, role: mem.role, departmentId: mem.departmentId, scope: mem.scope, isActive: mem.isActive, displayOrder: mem.displayOrder }
              });
            }
          }

          // Seed assets in chunks
          const chunkSize = 100;
          for (let i = 0; i < data.assets.length; i += chunkSize) {
            const chunk = data.assets.slice(i, i + chunkSize);
            await Promise.all(
              chunk.map((asset: any) =>
                prisma.asset.upsert({
                  where: { id: asset.id },
                  update: {
                    assetCode: asset.assetCode,
                    name: asset.name,
                    categoryId: asset.categoryId,
                    departmentId: asset.departmentId,
                    location: asset.location,
                    locationDetail: asset.locationDetail,
                    assignedTo: asset.assignedTo,
                    yearInUse: asset.yearInUse,
                    originalPrice: asset.originalPrice,
                    currentValue: asset.currentValue,
                    depreciationRate: asset.depreciationRate,
                    manufacturer: asset.manufacturer,
                    countryOfOrigin: asset.countryOfOrigin,
                    specifications: asset.specifications,
                    status: asset.status,
                    managingUnit: asset.managingUnit,
                    floor: asset.floor,
                    buildingAsset: asset.buildingAsset,
                    bookQuantity: asset.bookQuantity,
                    actualQuantity: asset.actualQuantity,
                    quantityDifference: asset.quantityDifference,
                    source: asset.source,
                    fundingSource: asset.fundingSource,
                    decisionNumber: asset.decisionNumber,
                    note: asset.note,
                    qrCode: asset.qrCode
                  },
                  create: {
                    id: asset.id,
                    assetCode: asset.assetCode,
                    name: asset.name,
                    categoryId: asset.categoryId,
                    departmentId: asset.departmentId,
                    location: asset.location,
                    locationDetail: asset.locationDetail,
                    assignedTo: asset.assignedTo,
                    yearInUse: asset.yearInUse,
                    originalPrice: asset.originalPrice,
                    currentValue: asset.currentValue,
                    depreciationRate: asset.depreciationRate,
                    manufacturer: asset.manufacturer,
                    countryOfOrigin: asset.countryOfOrigin,
                    specifications: asset.specifications,
                    status: asset.status,
                    managingUnit: asset.managingUnit,
                    floor: asset.floor,
                    buildingAsset: asset.buildingAsset,
                    bookQuantity: asset.bookQuantity,
                    actualQuantity: asset.actualQuantity,
                    quantityDifference: asset.quantityDifference,
                    source: asset.source,
                    fundingSource: asset.fundingSource,
                    decisionNumber: asset.decisionNumber,
                    note: asset.note,
                    qrCode: asset.qrCode
                  }
                })
              )
            );
          }
          console.log(`[Database] Successfully auto-seeded ${data.assets.length} assets into PostgreSQL database!`);
        } catch (seedErr) {
          console.error('[Database] Error auto-seeding data:', seedErr);
        }
      }
    }

    const seedDataCandidates = [
      path.join(__dirname, '../prisma/initial-seed-data.json'),
      path.join(__dirname, '../../prisma/initial-seed-data.json'),
      path.join(process.cwd(), 'prisma/initial-seed-data.json'),
      path.join(process.cwd(), 'server/prisma/initial-seed-data.json')
    ];
    const foundSeed = seedDataCandidates.find(p => fs.existsSync(p));

    // Ensure Calibrations are seeded (Hiệu chuẩn / Kiểm định TBYT)
    const calibCount = await prisma.calibrationRecord.count().catch(() => 0);
    if (calibCount === 0 && foundSeed) {
      try {
        const raw = fs.readFileSync(foundSeed, 'utf-8');
        const data = JSON.parse(raw);
        if (data.calibrations && data.calibrations.length > 0) {
          console.log(`[Database] Auto-seeding ${data.calibrations.length} calibration records for TBYT...`);
          for (const cal of data.calibrations) {
            await prisma.calibrationRecord.upsert({
              where: { id: cal.id },
              update: {
                assetId: cal.assetId,
                calibrationDate: new Date(cal.calibrationDate),
                nextCalibrationDate: cal.nextCalibrationDate ? new Date(cal.nextCalibrationDate) : null,
                performedBy: cal.performedBy,
                vendor: cal.vendor,
                result: cal.result,
                certificateNumber: cal.certificateNumber,
                note: cal.note,
                serviceType: cal.serviceType,
                servicePackage: cal.servicePackage,
                cost: cal.cost,
                decisionNumber: cal.decisionNumber,
                acceptanceMembers: cal.acceptanceMembers,
                fundingSource: cal.fundingSource,
                deviceStatusAfter: cal.deviceStatusAfter,
                departmentLocation: cal.departmentLocation
              },
              create: {
                id: cal.id,
                assetId: cal.assetId,
                calibrationDate: new Date(cal.calibrationDate),
                nextCalibrationDate: cal.nextCalibrationDate ? new Date(cal.nextCalibrationDate) : null,
                performedBy: cal.performedBy,
                vendor: cal.vendor,
                result: cal.result,
                certificateNumber: cal.certificateNumber,
                note: cal.note,
                serviceType: cal.serviceType,
                servicePackage: cal.servicePackage,
                cost: cal.cost,
                decisionNumber: cal.decisionNumber,
                acceptanceMembers: cal.acceptanceMembers,
                fundingSource: cal.fundingSource,
                deviceStatusAfter: cal.deviceStatusAfter,
                departmentLocation: cal.departmentLocation
              }
            });
          }
          console.log(`[Database] Successfully seeded ${data.calibrations.length} calibration records!`);
        }
      } catch (err) {
        console.error('[Database] Error seeding calibration records:', err);
      }
    }

    // Ensure Maintenance/Repair records are seeded (Sửa chữa / Bảo trì TBYT & CNTT)
    const maintCount = await prisma.maintenanceRequest.count().catch(() => 0);
    if (maintCount === 0 && foundSeed) {
      try {
        const raw = fs.readFileSync(foundSeed, 'utf-8');
        const data = JSON.parse(raw);
        if (data.maintenance && data.maintenance.length > 0) {
          console.log(`[Database] Auto-seeding ${data.maintenance.length} maintenance/repair records...`);
          for (const m of data.maintenance) {
            await prisma.maintenanceRequest.upsert({
              where: { id: m.id },
              update: {
                assetId: m.assetId,
                requestedBy: m.requestedBy,
                contactPhone: m.contactPhone,
                departmentId: m.departmentId,
                managingUnit: m.managingUnit,
                locationDetail: m.locationDetail,
                issueDescription: m.issueDescription,
                priority: m.priority,
                status: m.status,
                repairCost: m.repairCost,
                repairVendor: m.repairVendor,
                repairNote: m.repairNote,
                technicianName: m.technicianName,
                maintenanceType: m.maintenanceType,
                servicePackage: m.servicePackage,
                replacementParts: m.replacementParts,
                acceptanceMembers: m.acceptanceMembers,
                fundingSource: m.fundingSource,
                decisionNumber: m.decisionNumber,
                deviceStatusAfter: m.deviceStatusAfter,
                proposalDate: m.proposalDate ? new Date(m.proposalDate) : null,
                approvalDate: m.approvalDate ? new Date(m.approvalDate) : null,
                requestDate: m.requestDate ? new Date(m.requestDate) : new Date(),
                completedDate: m.completedDate ? new Date(m.completedDate) : null
              },
              create: {
                id: m.id,
                assetId: m.assetId,
                requestedBy: m.requestedBy,
                contactPhone: m.contactPhone,
                departmentId: m.departmentId,
                managingUnit: m.managingUnit,
                locationDetail: m.locationDetail,
                issueDescription: m.issueDescription,
                priority: m.priority,
                status: m.status,
                repairCost: m.repairCost,
                repairVendor: m.repairVendor,
                repairNote: m.repairNote,
                technicianName: m.technicianName,
                maintenanceType: m.maintenanceType,
                servicePackage: m.servicePackage,
                replacementParts: m.replacementParts,
                acceptanceMembers: m.acceptanceMembers,
                fundingSource: m.fundingSource,
                decisionNumber: m.decisionNumber,
                deviceStatusAfter: m.deviceStatusAfter,
                proposalDate: m.proposalDate ? new Date(m.proposalDate) : null,
                approvalDate: m.approvalDate ? new Date(m.approvalDate) : null,
                requestDate: m.requestDate ? new Date(m.requestDate) : new Date(),
                completedDate: m.completedDate ? new Date(m.completedDate) : null
              }
            });
          }
          console.log(`[Database] Successfully seeded ${data.maintenance.length} maintenance records!`);
        }
      } catch (err) {
        console.error('[Database] Error seeding maintenance records:', err);
      }
    }

    // Ensure Campaigns are seeded
    const campCount = await prisma.disposalCampaign.count().catch(() => 0);
    if (campCount === 0 && foundSeed) {
      try {
        const raw = fs.readFileSync(foundSeed, 'utf-8');
        const data = JSON.parse(raw);
        if (data.campaigns && data.campaigns.length > 0) {
          for (const c of data.campaigns) {
            await prisma.disposalCampaign.upsert({
              where: { id: c.id },
              update: {
                title: c.title,
                campaignCode: c.campaignCode,
                startDate: new Date(c.startDate),
                endDate: c.endDate ? new Date(c.endDate) : null,
                status: c.status,
                description: c.description,
                issuedBy: c.issuedBy
              },
              create: {
                id: c.id,
                title: c.title,
                campaignCode: c.campaignCode,
                startDate: new Date(c.startDate),
                endDate: c.endDate ? new Date(c.endDate) : null,
                status: c.status,
                description: c.description,
                issuedBy: c.issuedBy
              }
            });
          }
        }
      } catch (err) {
        console.error('[Database] Error seeding disposal campaigns:', err);
      }
    }

    // 1. Dynamic safe column patch for existing databases (prevents missing column errors)
    const tablesToPatch = [
      { table: 'Asset', column: 'fundingSource', type: 'TEXT' },
      { table: 'Asset', column: 'decisionNumber', type: 'TEXT' },
      { table: 'MaintenanceRequest', column: 'fundingSource', type: 'TEXT' },
      { table: 'MaintenanceRequest', column: 'decisionNumber', type: 'TEXT' },
      { table: 'MaintenanceRequest', column: 'servicePackage', type: 'TEXT' },
      { table: 'MaintenanceRequest', column: 'replacementParts', type: 'TEXT' },
      { table: 'MaintenanceRequest', column: 'acceptanceMembers', type: 'TEXT' },
      { table: 'Disposal', column: 'decisionNumber', type: 'TEXT' },
      { table: 'Disposal', column: 'fundingSource', type: 'TEXT' },
      { table: 'Disposal', column: 'campaignName', type: 'TEXT' },
      { table: 'Disposal', column: 'technicalAssessment', type: 'TEXT' },
      { table: 'Disposal', column: 'technicalInspector', type: 'TEXT' },
      { table: 'Disposal', column: 'disposalMethod', type: 'TEXT' },
      { table: 'InventorySession', column: 'decisionNumber', type: 'TEXT' },
      { table: 'InventorySession', column: 'fundingSource', type: 'TEXT' }
    ];

    for (const item of tablesToPatch) {
      try {
        await prisma.$executeRawUnsafe(`ALTER TABLE "${item.table}" ADD COLUMN IF NOT EXISTS "${item.column}" ${item.type};`);
      } catch {}
    }

    // 2. Ensure 20 default users exist and passwords are valid
    const defaultUsers = [
      { username: 'admin', role: 'ADMIN', fullName: 'Quản Trị Viên Tối Cao (Ban Giám Đốc)', pass: 'admin123' },
      { username: 'manager_duoc', role: 'MANAGER_DUOC', fullName: 'Quản Lý Tài Sản - Khoa Dược (TBYT)', pass: '123456' },
      { username: 'manager_cntt', role: 'MANAGER_CNTT', fullName: 'Quản Lý Tài Sản - Tổ CNTT', pass: '123456' },
      { username: 'manager_tchc', role: 'MANAGER_TCHC', fullName: 'Quản Lý Tài Sản - Phòng TCHC', pass: '123456' },
      { username: 'pkdk', role: 'DEPARTMENT', fullName: 'Phòng Khám Đa Khoa', deptCode: 'PKDK', pass: '123456' },
      { username: 'xn', role: 'DEPARTMENT', fullName: 'Khoa Xét Nghiệm - CĐHA - TDCN', deptCode: 'XN', pass: '123456' },
      { username: 'bnn', role: 'DEPARTMENT', fullName: 'Khoa Bệnh Nghề Nghiệp', deptCode: 'BNN', pass: '123456' },
      { username: 'dd', role: 'DEPARTMENT', fullName: 'Khoa Dinh Dưỡng', deptCode: 'DD', pass: '123456' },
      { username: 'skmt', role: 'DEPARTMENT', fullName: 'Khoa Sức Khỏe Môi Trường - YTTH', deptCode: 'SKMT', pass: '123456' },
      { username: 'skss', role: 'DEPARTMENT', fullName: 'Khoa Sức Khỏe Sinh Sản', deptCode: 'SKSS', pass: '123456' },
      { username: 'khnv', role: 'DEPARTMENT', fullName: 'Phòng Kế Hoạch Nghiệp Vụ', deptCode: 'KHNV', pass: '123456' },
      { username: 'ttgdsk', role: 'DEPARTMENT', fullName: 'Khoa Truyền Thông Giáo Dục Sức Khỏe', deptCode: 'TTGDSK', pass: '123456' },
      { username: 'kstct', role: 'DEPARTMENT', fullName: 'Khoa Ký Sinh Trùng - Côn Trùng', deptCode: 'KSTCT', pass: '123456' },
      { username: 'pcbkln', role: 'DEPARTMENT', fullName: 'Khoa Phòng Chống Bệnh Không Lây Nhiễm', deptCode: 'PCBKLN', pass: '123456' },
      { username: 'dvtyt', role: 'DEPARTMENT', fullName: 'Khoa Dược - Vật Tư Y Tế', deptCode: 'DVTYT', pass: '123456' },
      { username: 'hiv', role: 'DEPARTMENT', fullName: 'Khoa HIV/AIDS và QLĐTNC', deptCode: 'HIV', pass: '123456' },
      { username: 'pcbtn', role: 'DEPARTMENT', fullName: 'Khoa Phòng Chống Bệnh Truyền Nhiễm', deptCode: 'PCBTN', pass: '123456' },
      { username: 'tckt', role: 'DEPARTMENT', fullName: 'Phòng Tài Chính - Kế Toán', deptCode: 'TCKT', pass: '123456' },
      { username: 'tchc', role: 'DEPARTMENT', fullName: 'Phòng Tổ Chức - Hành Chính', deptCode: 'TCHC', pass: '123456' },
      { username: 'kdytqt', role: 'DEPARTMENT', fullName: 'Khoa Kiểm Dịch Y Tế Quốc Tế', deptCode: 'KDYTQT', pass: '123456' },
    ];

    for (const u of defaultUsers) {
      const existing = await prisma.user.findFirst({ where: { username: u.username } });
      let deptId: number | null = null;
      if (u.deptCode) {
        const dept = await prisma.department.findUnique({ where: { code: u.deptCode } });
        if (dept) deptId = dept.id;
      }
      if (!existing) {
        const hash = await bcrypt.hash(u.pass, 10);
        await prisma.user.create({
          data: {
            username: u.username,
            password: hash,
            fullName: u.fullName,
            role: u.role,
            departmentId: deptId
          }
        });
      } else if (existing.role !== u.role || (deptId && existing.departmentId !== deptId)) {
        await prisma.user.update({
          where: { id: existing.id },
          data: { role: u.role, departmentId: deptId || existing.departmentId }
        });
      }
    }
    // 3. Automated cleanup & unification of CNTT PC sets (gộp màn hình & cpu)
    const plusItems = await prisma.asset.findMany({
      where: {
        OR: [
          { name: { startsWith: '+' } },
          { name: { startsWith: '   +' } },
          { name: { startsWith: '- ' } }
        ]
      }
    });

    if (plusItems.length > 0) {
      console.log(`[Database] Cleaning ${plusItems.length} sub-items...`);
      for (const item of plusItems) {
        const cleanName = item.name.replace(/^[\+\s\-]+/, '').trim();
        await prisma.asset.update({
          where: { id: item.id },
          data: { name: cleanName }
        });
      }
    }

    // Also check if any asset has purely numeric code like "1", "2" and replace with standardized code
    const numericCodes = await prisma.asset.findMany({
      where: {
        assetCode: { in: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15'] },
        managingUnit: 'CNTT'
      },
      include: { department: true }
    });

    for (const numItem of numericCodes) {
      const deptCode = numItem.department?.code || 'CNTT';
      const newCode = `PC/${deptCode}-${numItem.assetCode.padStart(3, '0')}`;
      try {
        await prisma.asset.update({
          where: { id: numItem.id },
          data: { assetCode: newCode }
        });
      } catch {}
    }

    console.log('[Database] Auto-migration and user synchronization verified.');
  } catch (err) {
    console.warn('[Database] Auto-migration notice:', err);
  }
}

app.listen(PORT, async () => {
  console.log(`QLTS Server is running on port ${PORT}`);
  await autoMigrateAndSeed();
});
