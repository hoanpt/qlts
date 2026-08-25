import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Monitor, ArrowLeftRight, Wrench,
  ClipboardList, Trash2, TrendingDown, Award, QrCode,
  Building2, Menu, X, LogOut, User as UserIcon, Shield,
  Stethoscope, ChevronDown, Check
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const QUICK_SWITCH_USERS = [
  { username: 'admin', name: 'Admin Tối Cao (Ban Giám Đốc)', role: 'ADMIN', badge: 'Admin Tối Cao', color: 'bg-rose-100 text-rose-800' },
  { username: 'manager_duoc', name: 'Quản Lý Tài Sản - Khoa Dược', role: 'MANAGER_DUOC', badge: 'Quản Lý Dược (TBYT)', color: 'bg-emerald-100 text-emerald-800' },
  { username: 'manager_cntt', name: 'Quản Lý Tài Sản - Tổ CNTT', role: 'MANAGER_CNTT', badge: 'Quản Lý Tổ CNTT', color: 'bg-blue-100 text-blue-800' },
  { username: 'manager_tchc', name: 'Quản Lý Tài Sản - Phòng TCHC', role: 'MANAGER_TCHC', badge: 'Quản Lý Phòng TCHC', color: 'bg-amber-100 text-amber-800' },
  { username: 'pkdk', name: 'Phòng Khám Đa Khoa', role: 'DEPARTMENT', deptId: 1, badge: 'Khoa/Phòng (Người dùng)', color: 'bg-slate-100 text-slate-800' },
  { username: 'xn', name: 'Khoa Xét Nghiệm - CĐHA - TDCN', role: 'DEPARTMENT', deptId: 2, badge: 'Khoa/Phòng (Người dùng)', color: 'bg-slate-100 text-slate-800' },
  { username: 'khnv', name: 'Phòng Kế Hoạch Nghiệp Vụ', role: 'DEPARTMENT', deptId: 7, badge: 'Khoa/Phòng (Người dùng)', color: 'bg-slate-100 text-slate-800' },
  { username: 'hiv', name: 'Khoa HIV/AIDS và QLĐTNC', role: 'DEPARTMENT', deptId: 12, badge: 'Khoa/Phòng (Người dùng)', color: 'bg-slate-100 text-slate-800' }
];

export default function Layout() {
  const { user, logout, login } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleQuickSwitch = (target: typeof QUICK_SWITCH_USERS[0]) => {
    login(`token-${target.username}`, {
      id: 99,
      username: target.username,
      fullName: target.name,
      role: target.role as any,
      departmentId: (target as any).deptId || undefined
    });
    setShowSwitchMenu(false);
  };

  const getRoleLabel = () => {
    if (!user) return 'Khách';
    if (user.role === 'ADMIN') return '👑 Admin Tối Cao';
    if (user.role === 'MANAGER_DUOC') return '🩺 Quản Lý Dược (TBYT)';
    if (user.role === 'MANAGER_CNTT') return '💻 Quản Lý Tổ CNTT';
    if (user.role === 'MANAGER_TCHC') return '🏢 Quản Lý Phòng TCHC';
    return `🏢 Khoa / Phòng`;
  };

  // Nav Items configured by Role
  const isDeptUser = user?.role === 'DEPARTMENT';
  const isDuocManager = user?.role === 'MANAGER_DUOC';

  const navItems = [
    { to: '/', icon: LayoutDashboard, label: 'Trang chủ' },
    { 
      to: '/assets', 
      icon: Monitor, 
      label: isDeptUser ? 'Tài sản khoa phòng' : 'Quản lý thiết bị' 
    },
    { to: '/maintenance', icon: Wrench, label: isDeptUser ? 'Báo hỏng thiết bị' : 'Báo hỏng & Sửa chữa' },
    { to: '/transfers', icon: ArrowLeftRight, label: isDeptUser ? 'Lịch sử điều chuyển' : 'Điều chuyển' },
    { to: '/disposals', icon: Trash2, label: isDeptUser ? 'Đề xuất thanh lý' : 'Hội đồng thanh lý' },
    { to: '/inventory', icon: ClipboardList, label: isDeptUser ? 'Biên bản kiểm kê' : 'Kiểm kê tài sản' },
    { to: '/qr-scanner', icon: QrCode, label: 'Quét mã QR' },
  ];

  // Additional specialist menus for Manager & Admin
  if (!isDeptUser || isDuocManager) {
    navItems.push({ to: '/calibration', icon: Award, label: 'Hiệu chuẩn TBYT' });
  }

  if (user?.role === 'ADMIN' || !isDeptUser) {
    navItems.push({ to: '/depreciation', icon: TrendingDown, label: 'Tính khấu hao' });
  }

  if (user?.role === 'ADMIN') {
    navItems.push({ to: '/departments', icon: Building2, label: 'Quản lý khoa/phòng' });
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      {/* Mobile Header */}
      <div className="md:hidden bg-white shadow-xs flex items-center justify-between p-4 sticky top-0 z-20 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600">
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-base text-blue-600">QLTS CDC ĐÀ NẴNG</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-700 rounded-lg">
            {user?.fullName?.split(' - ')[0] || user?.fullName}
          </span>
        </div>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 left-0 z-40 h-screen w-64 bg-white border-r border-slate-200 transition-transform transform flex flex-col justify-between
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div>
          {/* Brand Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 rounded-xl text-white shadow-xs">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <div className="font-black text-sm text-slate-900 leading-tight">QLTS CDC ĐÀ NẴNG</div>
                <div className="text-[10px] font-semibold text-blue-600 uppercase">Hệ thống quản lý tài sản</div>
              </div>
            </div>
            <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden p-1.5 text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Card & Quick Role Switcher */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 relative">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 bg-white rounded-xl text-blue-600 border border-slate-200 shadow-2xs shrink-0">
                  <UserIcon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-900 truncate">{user?.fullName}</p>
                  <p className="text-[10px] font-semibold text-slate-500 truncate mt-0.5">{getRoleLabel()}</p>
                </div>
              </div>

              {/* Dropdown switch button */}
              <button
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition cursor-pointer"
                title="Đổi nhanh phân quyền để test"
              >
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Role Switcher Dropdown */}
            {showSwitchMenu && (
              <div className="absolute left-2 right-2 top-full mt-1 bg-white rounded-2xl shadow-xl border border-slate-200 z-50 p-2 space-y-1 text-xs">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Chuyển quyền nhanh để thử nghiệm:
                </div>
                {QUICK_SWITCH_USERS.map(target => (
                  <button
                    key={target.username}
                    onClick={() => handleQuickSwitch(target)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-xl flex items-center justify-between transition cursor-pointer ${
                      user?.username === target.username ? 'bg-blue-50 text-blue-700 font-bold' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="truncate">
                      <div>{target.name}</div>
                      <div className="text-[10px] text-slate-400 font-normal">{target.badge}</div>
                    </div>
                    {user?.username === target.username && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-230px)]">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setIsMobileMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-xs font-bold'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`
                }
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Footer Logout Button */}
        <div className="p-3 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-red-600 bg-red-50/70 hover:bg-red-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Đăng xuất ({user?.username})</span>
          </button>
        </div>
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
