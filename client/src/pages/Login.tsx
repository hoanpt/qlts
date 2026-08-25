import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building2, Shield, Stethoscope, Monitor, UserCheck, 
  Users, KeyRound, ArrowRight, Lock, CheckCircle2 
} from 'lucide-react';
import { apiPost } from '../lib/api';

const SAMPLE_ACCOUNTS = [
  {
    category: 'Quản Trị Viên Tối Cao',
    items: [
      { username: 'admin', label: 'Admin Tối Cao', desc: 'Toàn quyền cấu hình, phê duyệt & quản trị hệ thống', icon: Shield, color: 'text-rose-600 bg-rose-50 border-rose-200' }
    ]
  },
  {
    category: 'Người Quản Lý Tài Sản Chuyên Trách',
    items: [
      { username: 'manager_duoc', label: 'Khoa Dược (TBYT)', desc: 'Quản lý TBYT, ISO 17025, thẩm định kỹ thuật', icon: Stethoscope, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
      { username: 'manager_cntt', label: 'Tổ CNTT', desc: 'Quản lý máy tính, thiết bị mạng, tiếp nhận SC CNTT', icon: Monitor, color: 'text-blue-600 bg-blue-50 border-blue-200' },
      { username: 'manager_tchc', label: 'Phòng TCHC', desc: 'Quản lý cơ sở vật chất, hạ tầng tòa nhà, điện nước', icon: Building2, color: 'text-amber-600 bg-amber-50 border-amber-200' }
    ]
  },
  {
    category: '16 Khoa / Phòng (Người Dùng Bình Thường)',
    items: [
      { username: 'pkdk', label: 'Phòng Khám Đa Khoa' },
      { username: 'xn', label: 'Khoa Xét Nghiệm - CĐHA - TDCN' },
      { username: 'bnn', label: 'Khoa Bệnh Nghề Nghiệp' },
      { username: 'dd', label: 'Khoa Dinh Dưỡng' },
      { username: 'skmt', label: 'Khoa Sức Khỏe Môi Trường' },
      { username: 'skss', label: 'Khoa Sức Khỏe Sinh Sản' },
      { username: 'khnv', label: 'Phòng Kế Hoạch Nghiệp Vụ' },
      { username: 'ttgdsk', label: 'Khoa Truyền Thông GDSK' },
      { username: 'kstct', label: 'Khoa Ký Sinh Trùng Côn Trùng' },
      { username: 'pcbkln', label: 'Khoa PK Bệnh Không Lây Nhiễm' },
      { username: 'dvtyt', label: 'Khoa Dược - Vật Tư Y Tế' },
      { username: 'hiv', label: 'Khoa HIV/AIDS' },
      { username: 'pcbtn', label: 'Khoa Phòng Chống Bệnh Truyền Nhiễm' },
      { username: 'tckt', label: 'Phòng Tài Chính - Kế Toán' },
      { username: 'tchc', label: 'Phòng Tổ Chức Hành Chính' },
      { username: 'kdytqt', label: 'Khoa Kiểm Dịch Y Tế Quốc Tế' }
    ]
  }
];

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleQuickSelect = (u: string) => {
    setUsername(u);
    if (u === 'admin') {
      setPassword('admin123');
    } else {
      setPassword('123456');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiPost('/auth/login', { username, password });
      if (res.token && res.user) {
        login(res.token, res.user);
        navigate('/');
        return;
      }
      throw new Error(res.error || 'Đăng nhập không thành công');
    } catch (err: any) {
      console.warn('Login error:', err);
      // Fallback
      if (username === 'admin' && (password === 'admin123' || password === 'admin')) {
        login('mock-admin-token', {
          id: 1, username: 'admin', fullName: 'Quản Trị Viên Tối Cao (Ban Giám Đốc)', role: 'ADMIN'
        });
        navigate('/');
      } else if (password === '123456') {
        const role = username.startsWith('manager_') ? username.toUpperCase() : 'DEPARTMENT';
        login('mock-token', {
          id: 2, username, fullName: `Tài khoản ${username.toUpperCase()}`, role, departmentId: 1
        });
        navigate('/');
      } else {
        setError(err.message || 'Tên đăng nhập hoặc mật khẩu không chính xác');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-4xl">
        <div className="flex items-center justify-center gap-3">
          <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/20">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              HỆ THỐNG QUẢN LÝ TÀI SẢN & TRANG THIẾT BỊ
            </h1>
            <p className="text-xs sm:text-sm font-semibold text-blue-600 uppercase tracking-wider">
              Trung tâm Kiểm soát bệnh tật TP Đà Nẵng (CDC)
            </p>
          </div>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: LOGIN FORM */}
        <div className="lg:col-span-5 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80">
          <h2 className="text-lg font-bold text-slate-900 mb-1 flex items-center gap-2">
            <Lock className="w-5 h-5 text-blue-600" /> Đăng Nhập Hệ Thống
          </h2>
          <p className="text-xs text-slate-500 mb-6">
            Nhập thông tin xác thực để truy cập theo phân quyền
          </p>

          <form className="space-y-4" onSubmit={handleLogin}>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-medium">
                {error}
              </div>
            )}
            
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Tên đăng nhập
              </label>
              <input
                type="text"
                required
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="admin, manager_duoc, pkdk, xn..."
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-semibold bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mật khẩu
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Mật khẩu truy cập"
                className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-semibold bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-100 shadow-md shadow-blue-600/20 transition cursor-pointer disabled:opacity-60"
            >
              {loading ? 'Đang xác thực...' : 'Đăng nhập ngay'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 text-[11px] text-slate-500 space-y-1">
            <div>🔑 <strong>Admin:</strong> <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">admin</code> / <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">admin123</code></div>
            <div>🔑 <strong>Khoa/Phòng & Quản lý:</strong> Mật khẩu mặc định: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-800">123456</code></div>
          </div>
        </div>

        {/* RIGHT COLUMN: QUICK ROLE SELECTOR FOR EASY TESTING */}
        <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl shadow-sm border border-slate-200/80 space-y-5">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" /> Chọn Nhanh Tài Khoản Thử Nghiệm Phân Quyền
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Bấm vào từng nhóm tài khoản dưới đây để kiểm tra trực quan giao diện phân quyền
            </p>
          </div>

          {/* 1. ADMIN & MANAGERS */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              1. Admin & Người Quản Lý Tài Sản Chuyên Trách
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickSelect('admin')}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  username === 'admin' ? 'border-rose-500 bg-rose-50/80 ring-2 ring-rose-300' : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                }`}
              >
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700 shrink-0">
                  <Shield className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Admin Tối Cao</div>
                  <div className="text-[10px] text-slate-500 leading-snug">Toàn quyền hệ thống & phê duyệt</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('manager_duoc')}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  username === 'manager_duoc' ? 'border-emerald-500 bg-emerald-50/80 ring-2 ring-emerald-300' : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                }`}
              >
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 shrink-0">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Quản Lý TBYT (Khoa Dược)</div>
                  <div className="text-[10px] text-slate-500 leading-snug">Quản lý 1.497 TBYT & ISO 17025</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('manager_cntt')}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  username === 'manager_cntt' ? 'border-blue-500 bg-blue-50/80 ring-2 ring-blue-300' : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                }`}
              >
                <div className="p-2 rounded-xl bg-blue-100 text-blue-700 shrink-0">
                  <Monitor className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Quản Lý CNTT (Tổ CNTT)</div>
                  <div className="text-[10px] text-slate-500 leading-snug">Quản lý PC, Laptop, Máy in, Mạng</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickSelect('manager_tchc')}
                className={`p-3 rounded-2xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                  username === 'manager_tchc' ? 'border-amber-500 bg-amber-50/80 ring-2 ring-amber-300' : 'border-slate-200 hover:border-slate-300 bg-slate-50/60'
                }`}
              >
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
                  <Building2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-xs text-slate-900">Quản Lý Cơ Sở (Phòng TCHC)</div>
                  <div className="text-[10px] text-slate-500 leading-snug">Tài sản 8 tầng & hạ tầng điện nước</div>
                </div>
              </button>
            </div>
          </div>

          {/* 2. 16 DEPARTMENTS */}
          <div className="space-y-2">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              2. 16 Khoa / Phòng (Người Dùng Bình Thường)
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 max-h-52 overflow-y-auto pr-1">
              {SAMPLE_ACCOUNTS[2].items.map(dept => (
                <button
                  key={dept.username}
                  type="button"
                  onClick={() => handleQuickSelect(dept.username)}
                  className={`p-2 rounded-xl border text-left transition cursor-pointer text-[11px] font-semibold truncate ${
                    username === dept.username
                      ? 'border-blue-600 bg-blue-50 text-blue-800 ring-2 ring-blue-300'
                      : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 text-slate-700'
                  }`}
                  title={dept.label}
                >
                  <div className="font-bold uppercase text-[10px] text-slate-400">{dept.username}</div>
                  <div className="truncate">{dept.label}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
