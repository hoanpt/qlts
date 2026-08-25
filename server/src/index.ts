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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

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

app.listen(PORT, () => {
  console.log(`QLTS Server is running on port ${PORT}`);
});
