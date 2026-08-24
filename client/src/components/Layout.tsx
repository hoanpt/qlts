import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Monitor, ArrowLeftRight, Wrench,
  ClipboardList, Trash2, TrendingDown, Award, QrCode,
  Building2, Menu, X, LogOut, User as UserIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Trang chủ' },
    { to: '/assets', icon: Monitor, label: 'Quản lý thiết bị' },
    { to: '/transfers', icon: ArrowLeftRight, label: 'Điều chuyển' },
    { to: '/maintenance', icon: Wrench, label: 'Báo hỏng / Sửa chữa' },
    { to: '/inventory', icon: ClipboardList, label: 'Kiểm kê' },
    { to: '/disposals', icon: Trash2, label: 'Thanh lý' },
    { to: '/depreciation', icon: TrendingDown, label: 'Khấu hao' },
    { to: '/calibration', icon: Award, label: 'Hiệu chuẩn TBYT' },
    { to: '/qr-scanner', icon: QrCode, label: 'Quét QR' },
  ];

  if (user?.role === 'ADMIN') {
    navItems.push({ to: '/departments', icon: Building2, label: 'Quản lý khoa/phòng' });
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow flex items-center justify-between p-4 sticky top-0 z-20">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-gray-600">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-lg text-blue-600">CDC Đà Nẵng</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{user?.fullName}</span>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-gray-200 transition-transform transform
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="font-bold text-xl text-blue-600">QLTS CDC</div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-2 text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-gray-200 hidden md:flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-full text-blue-600">
            <UserIcon className="w-5 h-5" />
          </div>
          <div className="overflow-hidden">
            <p className="text-sm font-medium text-gray-900 truncate">{user?.fullName}</p>
            <p className="text-xs text-gray-500 truncate">{user?.role === 'ADMIN' ? 'Quản trị viên' : user?.department?.name}</p>
          </div>
        </div>

        <nav className="p-4 space-y-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setIsMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          ))}
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors mt-4"
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span>Đăng xuất</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
