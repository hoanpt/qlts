import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
  Monitor, Laptop, Printer, Network, HardDrive, Tv, Plus, Search, 
  RefreshCw, Download, Eye, Sparkles, CheckCircle2, AlertTriangle, Clock, Trash2,
  Stethoscope, Building2, Wrench, Layers, ShieldCheck, ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Asset, STATUS_LABELS, STATUS_COLORS } from '../types';

const DONUT_COLORS = ['#0284C7', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1'];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({
    totalAssets: 0,
    dangSuDung: 0,
    baoTri: 0,
    choPhanBo: 0,
    choThanhLy: 0,
    daThanhLy: 0,
    totalValue: 0,
    badges: []
  });

  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [recentAssets, setRecentAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUnit, setSelectedUnit] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [sRes, cRes, dRes, tRes, aRes] = await Promise.allSettled([
        apiGet('/dashboard/stats'),
        apiGet('/dashboard/by-category'),
        apiGet('/dashboard/by-department'),
        apiGet('/dashboard/trends'),
        apiGet('/assets?limit=10')
      ]);

      if (sRes.status === 'fulfilled' && sRes.value) {
        setStats(sRes.value);
      }
      if (cRes.status === 'fulfilled' && Array.isArray(cRes.value)) {
        setCategoryData(cRes.value.map(c => ({ ...c, value: c.count })));
      }
      if (dRes.status === 'fulfilled' && Array.isArray(dRes.value)) {
        setDeptData(dRes.value);
      }
      if (tRes.status === 'fulfilled' && Array.isArray(tRes.value)) {
        setTrendData(tRes.value);
      }
      if (aRes.status === 'fulfilled' && aRes.value?.assets) {
        setRecentAssets(aRes.value.assets);
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isCntt = user?.role === 'MANAGER_CNTT';
  const isDuoc = user?.role === 'MANAGER_DUOC';
  const isTchc = user?.role === 'MANAGER_TCHC';
  const isAdmin = !user || user.role === 'ADMIN';

  return (
    <div className="space-y-6 pb-12">
      {/* Top Welcome & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">CDC Đà Nẵng</span>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              {isCntt ? 'Bảng Điều Khiển Thiết Bị CNTT' :
               isDuoc ? 'Bảng Điều Khiển Trang Thiết Bị Y Tế' :
               isTchc ? 'Bảng Điều Khiển Tài Sản & Tòa Nhà TCHC' :
               user?.role === 'DEPARTMENT' ? `Tổng Quan Tài Sản - ${user.fullName}` :
               'Bảng Điều Khiển & Quản Lý Tài Sản'}
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isCntt ? 'Phân hệ quản lý chuyên trách: 713 thiết bị CNTT (Bộ máy vi tính, Laptop, Máy in/Scan, Mạng) tại 16 khoa/phòng' :
             isDuoc ? 'Phân hệ quản lý chuyên trách: 1.497 Trang thiết bị Y tế & Hồ sơ Hiệu chuẩn ISO 17025' :
             isTchc ? 'Phân hệ quản lý chuyên trách: 1.291 Tài sản Hành chính, CCDC & Hạ tầng 8 tầng' :
             'Hệ thống quản trị tài sản toàn trung tâm: Khoa Dược (1.497), Tổ CNTT (713) và Phòng TCHC (1.291)'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-sm transition cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Làm mới
          </button>
          
          <button 
            onClick={() => navigate('/assets/new')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {isCntt ? 'Thêm thiết bị CNTT' : 'Thêm thiết bị'}
          </button>
        </div>
      </div>

      {/* ADMIN ONLY: 3 PRIMARY MANAGING DIVISIONS */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Khối 1: Khoa Dược (TBYT) */}
          <div 
            onClick={() => navigate('/assets?managingUnit=DUOC')}
            className="group relative bg-gradient-to-br from-emerald-500 to-teal-700 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-sm">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-white/20 rounded-full">Khoa Dược chủ trì</span>
            </div>
            <div className="mt-4">
              <div className="text-xs text-emerald-100 font-medium uppercase tracking-wider">Trang thiết bị Y tế chuyên dụng</div>
              <div className="text-3xl font-extrabold mt-1">1,497 <span className="text-sm font-normal text-emerald-200">máy/thiết bị</span></div>
              <p className="text-xs text-emerald-100 mt-2 line-clamp-1">
                Xét nghiệm, Siêu âm, X-Quang, Vắc xin, Đo y tế tại 16 khoa
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-emerald-100 group-hover:text-white">
              <span>Xem danh mục TBYT</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Khối 2: Tổ CNTT */}
          <div 
            onClick={() => navigate('/assets?managingUnit=CNTT')}
            className="group relative bg-gradient-to-br from-blue-600 to-indigo-800 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-sm">
                <Monitor className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-white/20 rounded-full">Tổ CNTT chủ trì</span>
            </div>
            <div className="mt-4">
              <div className="text-xs text-blue-100 font-medium uppercase tracking-wider">Thiết bị Công nghệ thông tin</div>
              <div className="text-3xl font-extrabold mt-1">713 <span className="text-sm font-normal text-blue-200">thiết bị</span></div>
              <p className="text-xs text-blue-100 mt-2 line-clamp-1">
                282 Bộ máy vi tính, 25 Laptop, 232 Máy in/Scan, Mạng & Server
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-blue-100 group-hover:text-white">
              <span>Xem danh mục CNTT</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
            </div>
          </div>

          {/* Khối 3: Phòng TCHC */}
          <div 
            onClick={() => navigate('/assets?managingUnit=TCHC')}
            className="group relative bg-gradient-to-br from-amber-500 to-orange-700 rounded-2xl p-5 text-white shadow-md hover:shadow-lg transition-all cursor-pointer overflow-hidden"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/15 rounded-xl backdrop-blur-sm">
                <Building2 className="w-6 h-6 text-white" />
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-white/20 rounded-full">Phòng TCHC chủ trì</span>
            </div>
            <div className="mt-4">
              <div className="text-xs text-amber-100 font-medium uppercase tracking-wider">Hành chính & Hạ tầng Tòa nhà</div>
              <div className="text-3xl font-extrabold mt-1">1,291 <span className="text-sm font-normal text-amber-200">tài sản</span></div>
              <p className="text-xs text-amber-100 mt-2 line-clamp-1">
                294 TB hành chính + 997 hạ tầng theo 8 tầng (T.Hầm, T1-T7)
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs font-semibold text-amber-100 group-hover:text-white">
              <span>Xem danh mục TCHC & Tòa nhà</span>
              <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition" />
            </div>
          </div>
        </div>
      )}

      {/* MANAGER CNTT DEDICATED BANNER */}
      {isCntt && (
        <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-3xl p-6 text-white shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3.5 bg-white/15 rounded-2xl backdrop-blur-sm">
                <Monitor className="w-8 h-8 text-white" />
              </div>
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/20 text-white uppercase tracking-wider">
                  Khối Chuyên Trách: Tổ Công Nghệ Thông Tin
                </span>
                <h2 className="text-xl sm:text-2xl font-black mt-1">Tổng Quan 713 Thiết Bị CNTT Toàn Trung Tâm</h2>
                <p className="text-xs text-blue-100 mt-0.5">
                  Bao gồm 282 Bộ máy vi tính (Màn hình + CPU), 25 Laptop, 232 Máy in/Scan, 174 Thiết bị mạng & Server tại 16 khoa/phòng
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/assets')}
              className="px-4 py-2.5 bg-white text-blue-800 rounded-xl text-xs font-bold shadow hover:bg-blue-50 transition cursor-pointer flex items-center gap-1.5 shrink-0"
            >
              <span>Xem danh sách 713 thiết bị CNTT</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Overview Stat Cards (5 cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Tổng tài sản</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.totalAssets?.toLocaleString('vi-VN')}</div>
          <div className="text-[11px] text-blue-600 mt-1 font-semibold">100% dữ liệu chuẩn hóa</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Đang sử dụng</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats.dangSuDung?.toLocaleString('vi-VN')}</div>
          <div className="text-[11px] text-slate-400 mt-1">Hoạt động bình thường</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Bảo trì / Sửa chữa</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">{stats.baoTri?.toLocaleString('vi-VN')}</div>
          <div className="text-[11px] text-amber-600 mt-1 font-medium">Đang theo dõi kỹ thuật</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">Chờ thanh lý</div>
          <div className="text-2xl font-bold text-red-600 mt-1">{stats.choThanhLy?.toLocaleString('vi-VN')}</div>
          <div className="text-[11px] text-red-500 mt-1">Lập hội đồng thanh lý</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-xs text-slate-500 font-medium">Tổng nguyên giá</div>
          <div className="text-lg font-bold text-slate-900 mt-1 font-mono text-blue-700">
            {stats.totalValue ? (stats.totalValue / 1e9).toFixed(1) : '149.2'} tỷ đ
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Sổ sách kiểm kê 2026</div>
        </div>
      </div>

      {/* Category Pills Breakdown */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
          Phân bổ theo nhóm & phân loại thiết bị
        </div>
        <div className="flex flex-wrap gap-2">
          {stats.badges?.map((b: any, idx: number) => (
            <div 
              key={idx}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition cursor-pointer"
              onClick={() => {
                if (b.key === 'DUOC') navigate('/assets?managingUnit=DUOC');
                else if (b.key === 'CNTT') navigate('/assets?managingUnit=CNTT');
                else if (b.key === 'TCHC_TOANHA') navigate('/assets?managingUnit=TCHC&buildingAsset=1');
                else if (b.key === 'TCHC_HC') navigate('/assets?managingUnit=TCHC&buildingAsset=0');
                else navigate('/assets');
              }}
            >
              <span className="font-semibold text-slate-900">{b.name}:</span>
              <span className="font-bold text-blue-600">{b.count}</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-slate-200 text-slate-600 rounded-full font-semibold">{b.percent}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3 Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. Pie Chart: 3 Management Divisions / CNTT Subcategories */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">
              {isCntt ? 'Cơ cấu 4 nhóm thiết bị CNTT' : 
               isDuoc ? 'Cơ cấu Trang thiết bị Y tế' : 
               isTchc ? 'Cơ cấu Tài sản TCHC' : 
               'Cơ cấu theo 3 khối quản lý'}
            </h3>
            <p className="text-xs text-slate-400">
              {isCntt ? 'Tỷ trọng PC, Laptop, Máy in/Scan và Mạng' : 'Tỉ trọng tài sản Dược, CNTT và TCHC'}
            </p>
          </div>
          
          <div className="h-56 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs">
            {categoryData.map((c, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: DONUT_COLORS[idx % DONUT_COLORS.length] }}></span>
                  <span className="text-slate-600 truncate max-w-[170px]">{c.name}</span>
                </div>
                <span className="font-bold text-slate-900">{c.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Bar Chart: Top Departments */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">
              {user?.role === 'DEPARTMENT' ? 'Phân bổ tài sản của khoa' :
               isCntt ? 'Phân bổ 713 thiết bị CNTT theo khoa/phòng' : 'Tài sản theo đơn vị sử dụng (Top 8)'}
            </h3>
            <p className="text-xs text-slate-400">
              {user?.role === 'DEPARTMENT' ? `Số lượng tài sản do ${user.fullName} trực tiếp quản lý` :
               isCntt ? 'Số lượng thiết bị CNTT các khoa đang trực tiếp sử dụng' : 'Khoa / phòng có số lượng thiết bị lớn'}
            </p>
          </div>

          <div className="h-64 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={deptData.slice(0, 8)} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis dataKey="name" type="category" width={45} tick={{ fontSize: 11, fontWeight: 'bold' }} />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#3B82F6" radius={[0, 4, 4, 0]} name="Số lượng" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Line Chart: Trend */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900 mb-1">Tăng trưởng tài sản kiểm kê</h3>
            <p className="text-xs text-slate-400">Diễn biến cập nhật 6 tháng gần nhất</p>
          </div>

          <div className="h-64 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ left: -10, right: 10, top: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 200', 'dataMax + 100']} />
                <RechartsTooltip />
                <Line type="monotone" dataKey="total" stroke="#10B981" strokeWidth={3} dot={{ r: 4 }} name="Tổng tài sản" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Filter & Asset List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900">Danh mục thiết bị mới cập nhật</h3>
            <p className="text-xs text-slate-500">
              {user?.role === 'DEPARTMENT' ? `Tài sản thuộc quản lý của ${user.fullName}` : 'Xem nhanh tài sản theo từng khối quản lý'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedUnit}
              onChange={e => setSelectedUnit(e.target.value)}
              className="px-3 py-1.5 text-xs font-semibold border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Tất cả khối quản lý</option>
              <option value="DUOC">Khoa Dược (TBYT)</option>
              <option value="CNTT">Tổ CNTT</option>
              <option value="TCHC">Phòng TCHC & Tòa nhà</option>
            </select>

            <button
              onClick={() => navigate('/assets')}
              className="px-4 py-1.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
            >
              {user?.role === 'DEPARTMENT' ? `Xem tất cả ${stats.totalAssets || 0} tài sản của khoa →` : 'Xem tất cả 3,684 tài sản →'}
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-100">
              <tr>
                <th className="p-3">Mã tài sản</th>
                <th className="p-3">Tên thiết bị</th>
                <th className="p-3">Khối quản lý</th>
                <th className="p-3">Khoa / Phòng sử dụng</th>
                <th className="p-3">Vị trí / Tầng</th>
                <th className="p-3">Trạng thái</th>
                <th className="p-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentAssets.map(a => (
                <tr key={a.id} className="hover:bg-slate-50/70 transition">
                  <td className="p-3 font-mono font-bold text-blue-600">{a.assetCode}</td>
                  <td className="p-3 font-semibold text-slate-900 max-w-[240px] truncate">{a.name}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                      a.managingUnit === 'DUOC' ? 'bg-emerald-100 text-emerald-800' :
                      a.managingUnit === 'CNTT' ? 'bg-blue-100 text-blue-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {a.managingUnit === 'DUOC' ? 'Khoa Dược' : a.managingUnit === 'CNTT' ? 'Tổ CNTT' : 'TCHC'}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">{a.department?.name || 'CDC'}</td>
                  <td className="p-3 text-slate-500">{a.floor || a.locationDetail || a.location || 'Cơ sở 1'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${STATUS_COLORS[a.status]}`}>
                      {STATUS_LABELS[a.status] || a.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <button
                      onClick={() => navigate(`/assets/${a.id}`)}
                      className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-blue-600 transition"
                      title="Xem chi tiết"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
