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

// Health check endpoint for Coolify / Docker
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
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
    // 1. Dynamic safe column patch for existing SQLite databases (prevents missing column errors)
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
        await prisma.$executeRawUnsafe(`ALTER TABLE ${item.table} ADD COLUMN ${item.column} ${item.type};`);
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
    console.log('[Database] Auto-migration and user synchronization verified.');
  } catch (err) {
    console.warn('[Database] Auto-migration notice:', err);
  }
}

app.listen(PORT, async () => {
  console.log(`QLTS Server is running on port ${PORT}`);
  await autoMigrateAndSeed();
});
