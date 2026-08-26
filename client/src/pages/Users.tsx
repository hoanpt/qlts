import React, { useState, useEffect } from 'react';
import { 
  Users as UsersIcon, Plus, Search, KeyRound, Edit2, Trash2, 
  ShieldCheck, Building2, Lock, CheckCircle2, AlertTriangle, 
  Monitor, Stethoscope, Layers, RefreshCw, X, Eye, EyeOff
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { User, Department } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Modals state
  const [showUserModal, setShowUserModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // User Form State (Create / Edit)
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    password: '',
    role: 'DEPARTMENT',
    departmentId: ''
  });

  // Reset Password State
  const [resetPassData, setResetPassData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [showPass, setShowPass] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [userRes, deptRes] = await Promise.allSettled([
        apiGet('/users'),
        apiGet('/departments')
      ]);

      if (userRes.status === 'fulfilled' && Array.isArray(userRes.value)) {
        setUsers(userRes.value);
      }
      if (deptRes.status === 'fulfilled' && Array.isArray(deptRes.value)) {
        setDepartments(deptRes.value);
      }
    } catch (e) {
      console.error('Error loading users:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Open Create Modal
  const handleOpenCreate = () => {
    setSelectedUser(null);
    setFormData({
      username: '',
      fullName: '',
      password: '',
      role: 'DEPARTMENT',
      departmentId: departments[0]?.id?.toString() || '1'
    });
    setShowUserModal(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (user: User) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      fullName: user.fullName,
      password: '',
      role: user.role,
      departmentId: user.departmentId ? user.departmentId.toString() : ''
    });
    setShowUserModal(true);
  };

  // Open Reset Password Modal
  const handleOpenReset = (user: User) => {
    setSelectedUser(user);
    setResetPassData({ newPassword: '', confirmPassword: '' });
    setShowResetModal(true);
  };

  // Submit Create or Edit User
  const handleSubmitUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName || !formData.role) {
      alert('Vui lòng điền đầy đủ họ tên và phân quyền!');
      return;
    }

    try {
      if (selectedUser) {
        // Edit User
        await apiPut(`/users/${selectedUser.id}`, {
          fullName: formData.fullName,
          role: formData.role,
          departmentId: formData.departmentId ? parseInt(formData.departmentId) : null,
          username: formData.username
        });
        alert(`Đã cập nhật thông tin tài khoản ${formData.username} thành công!`);
      } else {
        // Create User
        if (!formData.username || !formData.password) {
          alert('Vui lòng nhập tên đăng nhập và mật khẩu khởi tạo!');
          return;
        }
        await apiPost('/users', {
          username: formData.username,
          password: formData.password,
          fullName: formData.fullName,
          role: formData.role,
          departmentId: formData.departmentId ? parseInt(formData.departmentId) : null
        });
        alert(`Đã tạo tài khoản ${formData.username} thành công!`);
      }

      setShowUserModal(false);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi lưu thông tin người dùng');
    }
  };

  // Submit Reset Password
  const handleSubmitResetPass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (resetPassData.newPassword.length < 6) {
      alert('Mật khẩu mới phải có tối thiểu 6 ký tự!');
      return;
    }

    if (resetPassData.newPassword !== resetPassData.confirmPassword) {
      alert('Xác nhận mật khẩu mới không trùng khớp!');
      return;
    }

    try {
      await apiPut(`/users/${selectedUser.id}/reset-password`, {
        newPassword: resetPassData.newPassword
      });
      alert(`Đã đặt lại mật khẩu cho tài khoản ${selectedUser.username} thành công!`);
      setShowResetModal(false);
    } catch (err: any) {
      alert(err.message || 'Lỗi khi đặt lại mật khẩu');
    }
  };

  // Delete User
  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      alert('Bạn không thể tự xóa tài khoản của chính mình!');
      return;
    }

    if (user.username === 'admin') {
      alert('Không được phép xóa tài khoản Quản trị viên tối cao (admin)!');
      return;
    }

    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.username}" (${user.fullName}) khỏi hệ thống?`)) {
      return;
    }

    try {
      await apiDelete(`/users/${user.id}`);
      alert(`Đã xóa tài khoản ${user.username} thành công!`);
      loadData();
    } catch (err: any) {
      alert(err.message || 'Lỗi khi xóa người dùng');
    }
  };

  // Filter users
  const filteredUsers = users.filter(u => {
    const searchMatch = !search ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.fullName.toLowerCase().includes(search.toLowerCase()) ||
      u.department?.name?.toLowerCase().includes(search.toLowerCase());

    const roleMatch = roleFilter === 'ALL' || u.role === roleFilter;
    const deptMatch = deptFilter === 'ALL' || u.departmentId?.toString() === deptFilter;

    return searchMatch && roleMatch && deptMatch;
  });

  // Calculate statistics
  const totalUsers = users.length;
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const managerCount = users.filter(u => u.role.startsWith('MANAGER_')).length;
  const deptUserCount = users.filter(u => u.role === 'DEPARTMENT').length;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-bold text-[11px] flex items-center gap-1 w-fit"><ShieldCheck className="w-3.5 h-3.5" /> Quản Trị Tối Cao</span>;
      case 'MANAGER_DUOC':
        return <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[11px] flex items-center gap-1 w-fit"><Stethoscope className="w-3.5 h-3.5" /> Quản Lý Dược (TBYT)</span>;
      case 'MANAGER_CNTT':
        return <span className="px-2.5 py-1 bg-blue-100 text-blue-800 rounded-full font-bold text-[11px] flex items-center gap-1 w-fit"><Monitor className="w-3.5 h-3.5" /> Quản Lý Tổ CNTT</span>;
      case 'MANAGER_TCHC':
        return <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[11px] flex items-center gap-1 w-fit"><Building2 className="w-3.5 h-3.5" /> Quản Lý Phòng TCHC</span>;
      case 'DEPARTMENT':
      default:
        return <span className="px-2.5 py-1 bg-purple-100 text-purple-800 rounded-full font-bold text-[11px] flex items-center gap-1 w-fit"><Layers className="w-3.5 h-3.5" /> Khoa / Phòng</span>;
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 1. TOP HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800">Bảo mật & Phân quyền</span>
            <h1 className="text-2xl font-bold text-slate-900">Quản Trị Người Dùng & Phân Quyền</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quản lý danh sách tài khoản, thêm/bớt người dùng, phân quyền truy cập và đặt lại mật khẩu.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 border border-slate-200 bg-white hover:bg-slate-50 rounded-xl text-slate-700 transition cursor-pointer"
            title="Tải lại dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm Người Dùng Mới
          </button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng số tài khoản</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalUsers}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/40 shadow-2xs">
          <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">Quản trị viên (Admin)</div>
          <div className="text-2xl font-bold text-rose-800 mt-1">{adminCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-blue-200 bg-blue-50/40 shadow-2xs">
          <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Quản lý chuyên trách (3 khối)</div>
          <div className="text-2xl font-bold text-blue-800 mt-1">{managerCount}</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-purple-200 bg-purple-50/40 shadow-2xs">
          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Khoa / Phòng trực thuộc</div>
          <div className="text-2xl font-bold text-purple-800 mt-1">{deptUserCount}</div>
        </div>
      </div>

      {/* 3. TABLE & FILTER CONTAINER */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Filters Bar */}
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={e => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">-- Vai trò / Quyền hạn (Tất cả) --</option>
              <option value="ADMIN">Quản Trị Viên Tối Cao (Admin)</option>
              <option value="MANAGER_DUOC">Quản Lý TBYT - Khoa Dược</option>
              <option value="MANAGER_CNTT">Quản Lý Thiết Bị - Tổ CNTT</option>
              <option value="MANAGER_TCHC">Quản Lý CSVC - Phòng TCHC</option>
              <option value="DEPARTMENT">Người Dùng Khoa / Phòng</option>
            </select>

            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="ALL">-- Khoa / Phòng (Tất cả) --</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
              ))}
            </select>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo username, họ tên, khoa phòng..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none w-64 sm:w-72"
            />
          </div>
        </div>

        {/* User Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5 w-12 text-center">STT</th>
                <th className="p-3.5 min-w-[140px]">Tên đăng nhập</th>
                <th className="p-3.5 min-w-[200px]">Họ và tên</th>
                <th className="p-3.5 min-w-[190px]">Phân quyền / Vai trò</th>
                <th className="p-3.5 min-w-[200px]">Khoa / Phòng liên kết</th>
                <th className="p-3.5 text-center min-w-[160px]">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-medium">
                    Không tìm thấy tài khoản người dùng nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u, idx) => (
                  <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3.5 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="p-3.5">
                      <span className="font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60">
                        {u.username}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <div className="font-bold text-slate-900 text-sm">{u.fullName}</div>
                    </td>
                    <td className="p-3.5">
                      {getRoleBadge(u.role)}
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">
                      {u.department ? `${u.department.code} - ${u.department.name}` : (
                        <span className="text-slate-400 italic">Toàn cơ quan</span>
                      )}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenReset(u)}
                          title="Đặt lại mật khẩu (Reset pass)"
                          className="p-1.5 text-amber-600 bg-amber-50 hover:bg-amber-100 rounded-lg transition cursor-pointer"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEdit(u)}
                          title="Chỉnh sửa thông tin & phân quyền"
                          className="p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          disabled={u.id === currentUser?.id || u.username === 'admin'}
                          title={u.username === 'admin' ? 'Không thể xóa Quản trị viên tối cao' : 'Xóa tài khoản'}
                          className="p-1.5 text-red-600 bg-red-50 hover:bg-red-100 disabled:opacity-40 disabled:hover:bg-red-50 rounded-lg transition cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: THÊM MỚI / CHỈNH SỬA TÀI KHOẢN & PHÂN QUYỀN                      */}
      {/* ========================================================================= */}
      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  {selectedUser ? `Chỉnh Sửa Tài Khoản: ${selectedUser.username}` : 'Thêm Tài Khoản Người Dùng Mới'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Thiết lập thông tin đăng nhập và phân quyền chuyên trách</p>
              </div>
              <button onClick={() => setShowUserModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmitUser} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Tên đăng nhập (*)</label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(selectedUser)}
                    placeholder="vd: pkdk, manager_cntt..."
                    value={formData.username}
                    onChange={e => setFormData({ ...formData, username: e.target.value.toLowerCase() })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                  />
                </div>

                {!selectedUser && (
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Mật khẩu khởi tạo (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="vd: 123456"
                      value={formData.password}
                      onChange={e => setFormData({ ...formData, password: e.target.value })}
                      className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Họ và tên / Tên đơn vị hiển thị (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Phòng Khám Đa Khoa, Quản Lý Tổ CNTT, BS. Nguyễn Văn A..."
                  value={formData.fullName}
                  onChange={e => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-900"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Phân quyền vai trò (*)</label>
                <select
                  value={formData.role}
                  onChange={e => {
                    const r = e.target.value;
                    let defaultDeptId = formData.departmentId;
                    if (r === 'ADMIN') defaultDeptId = '';
                    setFormData({ ...formData, role: r, departmentId: defaultDeptId });
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="DEPARTMENT">🏢 Người Dùng Khoa / Phòng (Xem tài sản khoa, báo hỏng, kiểm kê, đề xuất thanh lý)</option>
                  <option value="MANAGER_CNTT">💻 Quản Lý Tài Sản - Tổ CNTT (Chuyên trách quản lý 713 thiết bị CNTT)</option>
                  <option value="MANAGER_DUOC">🩺 Quản Lý Tài Sản - Khoa Dược (Chuyên trách quản lý 1.497 TBYT & Hiệu chuẩn)</option>
                  <option value="MANAGER_TCHC">🏢 Quản Lý Tài Sản - Phòng TCHC (Chuyên trách CSVC & Thiết bị Hành chính)</option>
                  <option value="ADMIN">👑 Quản Trị Viên Tối Cao (Ban Giám Đốc - Toàn quyền hệ thống)</option>
                </select>
              </div>

              {formData.role === 'DEPARTMENT' && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Thuộc Khoa / Phòng (*)</label>
                  <select
                    value={formData.departmentId}
                    onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.code} - {d.name.replace(/\s*\((?:Cơ sở|Cs)\s*[12]\)/gi, '')}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Lưu Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: ADMIN ĐẶT LẠI MẬT KHẨU (RESET PASSWORD)                          */}
      {/* ========================================================================= */}
      {showResetModal && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Đặt Lại Mật Khẩu Người Dùng</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tài khoản: <strong>{selectedUser.username}</strong> ({selectedUser.fullName})</p>
              </div>
              <button onClick={() => setShowResetModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmitResetPass} className="space-y-3.5 text-xs">
              <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 text-amber-800 text-[11px] space-y-1">
                <div>⚠️ Quản trị viên đang thực hiện đặt lại mật khẩu cho người dùng này.</div>
                <div>Gợi ý nhanh: Bạn có thể bấm nút bên dưới để gán nhanh về <strong>123456</strong>.</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Mật khẩu mới (*)</label>
                <div className="relative">
                  <input
                    type={showPass ? 'text' : 'password'}
                    required
                    placeholder="Nhập tối thiểu 6 ký tự..."
                    value={resetPassData.newPassword}
                    onChange={e => setResetPassData({ ...resetPassData, newPassword: e.target.value })}
                    className="w-full p-2.5 pr-10 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-mono"
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
                <label className="block font-bold text-slate-700 uppercase mb-1">Xác nhận mật khẩu mới (*)</label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  placeholder="Nhập lại mật khẩu mới..."
                  value={resetPassData.confirmPassword}
                  onChange={e => setResetPassData({ ...resetPassData, confirmPassword: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none font-mono"
                />
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setResetPassData({ newPassword: '123456', confirmPassword: '123456' })}
                  className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline cursor-pointer"
                >
                  ⚡ Đặt về mật khẩu mặc định "123456"
                </button>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <KeyRound className="w-3.5 h-3.5" /> Xác Nhận Đặt Lại Mật Khẩu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
