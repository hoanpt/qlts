import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Monitor, ArrowLeftRight, Wrench,
  ClipboardList, Trash2, TrendingDown, Award, QrCode,
  Building2, Menu, X, LogOut, User as UserIcon, Users as UsersIcon,
  KeyRound, Eye, EyeOff, CheckCircle2
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { apiPost } from '../lib/api';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Change Password Modal State
  const [showChangePassModal, setShowChangePassModal] = useState(false);
  const [changePassForm, setChangePassForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPass, setShowPass] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passError, setPassError] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');

    if (changePassForm.newPassword.length < 6) {
      setPassError('Mật khẩu mới phải có tối thiểu 6 ký tự!');
      return;
    }

    if (changePassForm.newPassword !== changePassForm.confirmPassword) {
      setPassError('Xác nhận mật khẩu mới không trùng khớp!');
      return;
    }

    setPassLoading(true);
    try {
      await apiPost('/auth/change-password', {
        currentPassword: changePassForm.currentPassword,
        newPassword: changePassForm.newPassword
      });
      alert('Đổi mật khẩu thành công! Hãy ghi nhớ mật khẩu mới của bạn.');
      setShowChangePassModal(false);
      setChangePassForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err: any) {
      setPassError(err.message || 'Lỗi khi đổi mật khẩu');
    } finally {
      setPassLoading(false);
    }
  };

  const getRoleLabel = () => {
    if (!user) return 'Khách';
    if (user.role === 'ADMIN') return '👑 Quản Trị Viên Tối Cao';
    if (user.role === 'MANAGER_DUOC') return '🩺 Quản Lý Tài Sản - Khoa Dược';
    if (user.role === 'MANAGER_CNTT') return '💻 Quản Lý Tài Sản - Tổ CNTT';
    if (user.role === 'MANAGER_TCHC') return '🏢 Quản Lý Tài Sản - Phòng TCHC';
    return `🏢 ${user.department?.name || 'Khoa / Phòng'}`;
  };

  // Nav Items configured strictly by Role
  const isDeptUser = user?.role === 'DEPARTMENT';
  const isCnttManager = user?.role === 'MANAGER_CNTT';
  const isDuocManager = user?.role === 'MANAGER_DUOC';
  const isTchcManager = user?.role === 'MANAGER_TCHC';
  const isAdmin = user?.role === 'ADMIN';

  const navItems = [
    { 
      to: '/', 
      icon: LayoutDashboard, 
      label: isCnttManager ? 'Dashboard CNTT' : 
             isDuocManager ? 'Dashboard Dược (TBYT)' : 
             isTchcManager ? 'Dashboard TCHC' : 
             isDeptUser ? 'Tổng quan khoa' : 'Trang chủ' 
    },
    { 
      to: '/assets', 
      icon: Monitor, 
      label: isCnttManager ? 'Thiết bị CNTT' : 
             isDuocManager ? 'Trang thiết bị Y tế' : 
             isTchcManager ? 'Tài sản TCHC & Tòa nhà' : 
             isDeptUser ? 'Tài sản khoa phòng' : 'Quản lý thiết bị' 
    },
    { 
      to: '/maintenance', 
      icon: Wrench, 
      label: isCnttManager ? 'Báo hỏng & Sửa CNTT' : 
             isDuocManager ? 'Sửa chữa & Bảo trì TBYT' : 
             isTchcManager ? 'Sửa chữa điện & CSVC' : 
             isDeptUser ? 'Báo hỏng thiết bị' : 'Báo hỏng & Sửa chữa' 
    },
    { 
      to: '/transfers', 
      icon: ArrowLeftRight, 
      label: isDeptUser ? 'Lịch sử điều chuyển' : 'Điều chuyển tài sản' 
    },
    { 
      to: '/disposals', 
      icon: Trash2, 
      label: isDeptUser ? 'Đề xuất thanh lý' : 'Thanh lý tài sản' 
    },
    { 
      to: '/inventory', 
      icon: ClipboardList, 
      label: isDeptUser ? 'Biên bản kiểm kê' : 'Kiểm kê tài sản' 
    },
    { to: '/qr-scanner', icon: QrCode, label: 'Quét mã QR' },
  ];

  // Only Dược and Admin have ISO 17025 Calibration module
  if (isDuocManager || isAdmin) {
    navItems.push({ to: '/calibration', icon: Award, label: 'Hiệu chuẩn TBYT' });
  }

  // Admin / Specialists have Depreciation calculation
  if (isAdmin || isDuocManager || isTchcManager) {
    navItems.push({ to: '/depreciation', icon: TrendingDown, label: 'Tính khấu hao' });
  }

  // Admin only: Quản lý khoa phòng & Quản lý người dùng
  if (isAdmin) {
    navItems.push({ to: '/departments', icon: Building2, label: 'Quản lý khoa/phòng' });
    navItems.push({ to: '/users', icon: UsersIcon, label: 'Quản trị người dùng' });
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
          <button
            onClick={() => setShowChangePassModal(true)}
            className="p-1.5 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
            title="Đổi mật khẩu"
          >
            <KeyRound className="w-4 h-4" />
          </button>
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

          {/* User Profile Card with Change Password Button */}
          <div className="p-3.5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 bg-white rounded-xl text-blue-600 border border-slate-200 shadow-2xs shrink-0">
                <UserIcon className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{user?.fullName}</p>
                <p className="text-[10px] font-semibold text-slate-500 truncate mt-0.5">{getRoleLabel()}</p>
              </div>
            </div>

            <button
              onClick={() => setShowChangePassModal(true)}
              title="Đổi mật khẩu"
              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg border border-transparent hover:border-slate-200 transition cursor-pointer shrink-0"
            >
              <KeyRound className="w-4 h-4" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-270px)]">
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

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-100 space-y-1.5">
          <button
            onClick={() => setShowChangePassModal(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Đổi mật khẩu cá nhân</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-red-600 bg-red-50/70 hover:bg-red-100 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
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

      {/* ========================================================================= */}
      {/* MODAL: ĐỔI MẬT KHẨU CÁ NHÂN (DÀNH CHO TẤT CẢ USER)                        */}
      {/* ========================================================================= */}
      {showChangePassModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Đổi Mật Khẩu Tài Khoản</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tài khoản: <strong>{user?.username}</strong> ({user?.fullName})</p>
              </div>
              <button onClick={() => setShowChangePassModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
            </div>

            {passError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs font-medium">
                {passError}
              </div>
            )}

            <form onSubmit={handleChangePassword} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Mật khẩu hiện tại (*)</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    placeholder="Nhập mật khẩu đang sử dụng..."
                    value={changePassForm.currentPassword}
                    onChange={e => setChangePassForm({ ...changePassForm, currentPassword: e.target.value })}
                    className="w-full p-2.5 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Mật khẩu mới (*)</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Tối thiểu 6 ký tự..."
                  value={changePassForm.newPassword}
                  onChange={e => setChangePassForm({ ...changePassForm, newPassword: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Xác nhận mật khẩu mới (*)</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Nhập lại mật khẩu mới..."
                  value={changePassForm.confirmPassword}
                  onChange={e => setChangePassForm({ ...changePassForm, confirmPassword: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowChangePassModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={passLoading}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-bold shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> {passLoading ? 'Đang lưu...' : 'Xác Nhận Đổi Mật Khẩu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

