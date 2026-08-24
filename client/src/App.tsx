import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import AssetDetail from './pages/AssetDetail';
import AssetForm from './pages/AssetForm';
import Transfers from './pages/Transfers';
import Maintenance from './pages/Maintenance';
import Inventory from './pages/Inventory';
import Disposals from './pages/Disposals';
import Depreciation from './pages/Depreciation';
import Calibration from './pages/Calibration';
import QRScanner from './pages/QRScanner';
import Departments from './pages/Departments';

const queryClient = new QueryClient();

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { isAuthenticated, user } = useAuth();
  
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (adminOnly && user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  
  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/qr/:assetCode" element={<AssetDetail />} />
      
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="assets" element={<Assets />} />
        <Route path="assets/new" element={<AssetForm />} />
        <Route path="assets/:id" element={<AssetDetail />} />
        <Route path="assets/:id/edit" element={<AssetForm />} />
        <Route path="transfers" element={<Transfers />} />
        <Route path="maintenance" element={<Maintenance />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="disposals" element={<Disposals />} />
        <Route path="depreciation" element={<Depreciation />} />
        <Route path="calibration" element={<Calibration />} />
        <Route path="qr-scanner" element={<QRScanner />} />
        <Route path="departments" element={
          <ProtectedRoute adminOnly><Departments /></ProtectedRoute>
        } />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
