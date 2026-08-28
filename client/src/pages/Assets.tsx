import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Search, Plus, Download, Printer, Filter, Eye, Edit, Trash2, QrCode, RefreshCw,
  Stethoscope, Monitor, Building2, Layers, ChevronLeft, ChevronRight, X
} from 'lucide-react';
import { STATUS_LABELS, STATUS_COLORS, Asset, Department, AssetCategory } from '../types';
import { apiGet, apiDelete } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';

const FLOORS = ['Tất cả tầng', 'Tầng Hầm', 'Tầng 1', 'Tầng 2', 'Tầng 3', 'Tầng 4', 'Tầng 5', 'Tầng 6', 'Tầng 7'];

export default function Assets() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Default active division tab by role
  const defaultTabByRole = 
    user?.role === 'MANAGER_CNTT' ? 'CNTT' :
    user?.role === 'MANAGER_DUOC' ? 'DUOC' :
    user?.role === 'MANAGER_TCHC' ? 'TCHC_HC' : 'ALL';

  // Active division filter: 'ALL', 'DUOC', 'CNTT', 'TCHC_HC', 'TCHC_TOANHA'
  const initialUnit = searchParams.get('managingUnit') || defaultTabByRole;
  const initialBuilding = searchParams.get('buildingAsset');
  
  const [activeTab, setActiveTab] = useState<string>(
    initialBuilding === '1' ? 'TCHC_TOANHA' :
    initialBuilding === '0' && initialUnit === 'TCHC' ? 'TCHC_HC' :
    initialUnit
  );

  // Filters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedFloor, setSelectedFloor] = useState(searchParams.get('floor') || 'Tất cả tầng');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 15;

  const isDeptUser = user?.role === 'DEPARTMENT';
  const defaultDept = isDeptUser && user.departmentId ? user.departmentId.toString() : '';

  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>(defaultDept);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');

  const fetchAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (searchTerm.trim()) params.append('search', searchTerm.trim());
      
      // Managing unit & building asset logic
      if (activeTab === 'DUOC') {
        params.append('managingUnit', 'DUOC');
      } else if (activeTab === 'CNTT') {
        params.append('managingUnit', 'CNTT');
      } else if (activeTab === 'TCHC_HC') {
        params.append('managingUnit', 'TCHC');
        params.append('buildingAsset', '0');
      } else if (activeTab === 'TCHC_TOANHA') {
        params.append('managingUnit', 'TCHC');
        params.append('buildingAsset', '1');
      }

      if (selectedFloor && selectedFloor !== 'Tất cả tầng') {
        params.append('floor', selectedFloor);
      }

      const effectiveDept = isDeptUser && user.departmentId ? user.departmentId.toString() : selectedDept;
      if (effectiveDept) params.append('departmentId', effectiveDept);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedLocation) params.append('location', selectedLocation);
      
      params.append('page', page.toString());
      params.append('limit', limit.toString());

      const res = await apiGet(`/assets?${params.toString()}`);
      if (res && res.assets) {
        setAssets(res.assets);
        setTotal(res.total);
      }
    } catch (e) {
      console.error('Error loading assets:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchFilters = async () => {
    try {
      const [dRes, cRes] = await Promise.allSettled([
        apiGet('/departments'),
        apiGet('/categories')
      ]);
      if (dRes.status === 'fulfilled' && Array.isArray(dRes.value)) setDepartments(dRes.value);
      if (cRes.status === 'fulfilled' && Array.isArray(cRes.value)) setCategories(cRes.value);
    } catch (e) {
      console.error('Error fetching filter lists:', e);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, [page, activeTab, selectedFloor, selectedDept, selectedStatus, selectedLocation]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAssets();
  };

  const resetFilters = () => {
    setSearchTerm('');
    if (!isDeptUser) setSelectedDept('');
    setSelectedStatus('');
    setSelectedLocation('');
    setSelectedFloor('Tất cả tầng');
    setPage(1);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa thiết bị "${name}"?`)) return;
    try {
      await apiDelete(`/assets/${id}`);
      fetchAssets();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi xóa tài sản');
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isDeptUser ? `Danh mục Tài sản - ${user?.fullName}` : 'Danh mục thiết bị & Tài sản CDC'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isDeptUser 
              ? `Tổng số: ${total.toLocaleString('vi-VN')} tài sản do khoa/phòng trực tiếp quản lý và sử dụng`
              : `Tổng số: ${total.toLocaleString('vi-VN')} tài sản theo đúng 3 khối quản lý chuyên trách`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              const params = new URLSearchParams();
              if (activeTab === 'DUOC') params.append('managingUnit', 'DUOC');
              else if (activeTab === 'CNTT') params.append('managingUnit', 'CNTT');
              else if (activeTab === 'TCHC_HC' || activeTab === 'TCHC_TOANHA') params.append('managingUnit', 'TCHC');
              const effectiveDept = isDeptUser && user.departmentId ? user.departmentId.toString() : selectedDept;
              if (effectiveDept) params.append('departmentId', effectiveDept);
              if (selectedStatus) params.append('status', selectedStatus);
              window.open(`/api/export/assets?${params.toString()}`, '_blank');
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition cursor-pointer"
          >
            <Download className="w-4 h-4 text-emerald-600" /> Xuất Excel
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-xl hover:bg-slate-50 shadow-sm transition cursor-pointer"
            title="Xuất trực tiếp danh sách tài sản sang file PDF hoặc in"
          >
            <Printer className="w-4 h-4 text-rose-600" /> Xuất PDF / In
          </button>
          <button
            onClick={() => navigate('/assets/new')}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm thiết bị
          </button>
        </div>
      </div>

      {/* 3 PRIMARY DIVISION TABS (Các Khối Quản Lý Tài Sản Chuyên Trách: CNTT, TCHC, DƯỢC) */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex flex-wrap gap-1.5">
          {/* Tab: Tất cả tài sản */}
          <button
            onClick={() => { setActiveTab('ALL'); setPage(1); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'ALL'
                ? 'bg-slate-900 text-white shadow'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span>{user?.role === 'DEPARTMENT' ? 'Tất cả tài sản của Khoa' : 'Tất cả tài sản'}</span>
          </button>

          {/* 1. Thiết bị CNTT */}
          {(!user || user.role === 'ADMIN' || user.role === 'MANAGER_CNTT' || user.role === 'DEPARTMENT') && (
            <button
              onClick={() => { setActiveTab('CNTT'); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'CNTT'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-700 hover:bg-blue-50 hover:text-blue-700'
              }`}
            >
              <Monitor className="w-4 h-4" />
              <span>{user?.role === 'DEPARTMENT' ? 'Khối Thiết bị CNTT của Khoa' : 'Khối Thiết bị CNTT (Tổ CNTT)'}</span>
            </button>
          )}

          {/* 2. TCHC - Thiết bị hành chính / Văn phòng */}
          {(!user || user.role === 'ADMIN' || user.role === 'MANAGER_TCHC' || user.role === 'DEPARTMENT') && (
            <button
              onClick={() => { setActiveTab('TCHC_HC'); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'TCHC_HC'
                  ? 'bg-amber-600 text-white shadow'
                  : 'text-slate-700 hover:bg-amber-50 hover:text-amber-700'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>{user?.role === 'DEPARTMENT' ? 'Khối Thiết bị TCHC / VP của Khoa' : 'TCHC (Thiết bị hành chính)'}</span>
            </button>
          )}

          {/* 3. Khoa Dược (TBYT) */}
          {(!user || user.role === 'ADMIN' || user.role === 'MANAGER_DUOC' || user.role === 'DEPARTMENT') && (
            <button
              onClick={() => { setActiveTab('DUOC'); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'DUOC'
                  ? 'bg-emerald-600 text-white shadow'
                  : 'text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
              }`}
            >
              <Stethoscope className="w-4 h-4" />
              <span>{user?.role === 'DEPARTMENT' ? 'Khối Trang thiết bị Y tế (Dược)' : 'Khối Trang thiết bị Y tế (Khoa Dược)'}</span>
            </button>
          )}

          {/* 4. TCHC - Cơ sở vật chất tòa nhà theo tầng (Chỉ cho Admin và TCHC) */}
          {(!user || user.role === 'ADMIN' || user.role === 'MANAGER_TCHC') && (
            <button
              onClick={() => { setActiveTab('TCHC_TOANHA'); setPage(1); }}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeTab === 'TCHC_TOANHA'
                  ? 'bg-orange-600 text-white shadow'
                  : 'text-slate-700 hover:bg-orange-50 hover:text-orange-700'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>TCHC (Hạ tầng tòa nhà theo tầng)</span>
            </button>
          )}

          {/* Khoa phòng banner if department user */}
          {user?.role === 'DEPARTMENT' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-800 rounded-xl text-xs font-bold ml-auto">
              <span>🏢 Danh mục tài sản {user.fullName} đang quản lý theo 3 khối (CNTT, TCHC, Dược)</span>
            </div>
          )}
        </div>

        {/* Floor Pills (Hiển thị khi chọn Tòa nhà hoặc xem toàn bộ) */}
        {(activeTab === 'TCHC_TOANHA' || activeTab === 'ALL') && (
          <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-3 border-t border-slate-100 px-2">
            <span className="text-xs font-bold text-slate-500 mr-1">Tầng:</span>
            {FLOORS.map(fl => (
              <button
                key={fl}
                onClick={() => { setSelectedFloor(fl); setPage(1); }}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  selectedFloor === fl
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {fl}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Search & Secondary Filter Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã tài sản, tên thiết bị, cấu hình, vị trí..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {searchTerm && (
              <button 
                type="button" 
                onClick={() => { setSearchTerm(''); setPage(1); }}
                className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <button
            type="submit"
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition cursor-pointer"
          >
            Tìm kiếm
          </button>
        </form>

        <div className={`grid gap-3 pt-2 border-t border-slate-100 text-xs ${isDeptUser ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
          {/* Department Filter (Only for Admin / Managers) */}
          {!isDeptUser && (
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Khoa / Phòng sử dụng</label>
              <select
                value={selectedDept}
                onChange={e => { setSelectedDept(e.target.value); setPage(1); }}
                className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="">Tất cả 16 khoa/phòng</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Location Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Cơ sở</label>
            <select
              value={selectedLocation}
              onChange={e => { setSelectedLocation(e.target.value); setPage(1); }}
              className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Tất cả cơ sở</option>
              <option value="Cơ sở 1">Cơ sở 1 (118 Lê Đình Lý)</option>
              <option value="Cơ sở 2">Cơ sở 2 (Bàn Thạch)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Trạng thái thiết bị</label>
            <select
              value={selectedStatus}
              onChange={e => { setSelectedStatus(e.target.value); setPage(1); }}
              className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="DANG_SU_DUNG">Đang sử dụng</option>
              <option value="BAO_TRI">Bảo trì / Sửa chữa</option>
              <option value="HONG">Hỏng</option>
              <option value="CHO_PHAN_BO">Chờ phân bổ</option>
              <option value="CHO_THANH_LY">Chờ thanh lý</option>
              <option value="KHONG_SU_DUNG">Không sử dụng</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={resetFilters}
              className="w-full p-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer text-center"
            >
              Đặt lại tất cả bộ lọc
            </button>
          </div>
        </div>
      </div>

      {/* Asset Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5 w-12 text-center">STT</th>
                <th className="p-3.5 min-w-[100px]">Mã tài sản</th>
                <th className="p-3.5 min-w-[220px]">Tên thiết bị / Tài sản</th>
                <th className="p-3.5 min-w-[130px]">Khối quản lý</th>
                <th className="p-3.5 min-w-[150px]">Khoa / Phòng SD</th>
                <th className="p-3.5 min-w-[130px]">Vị trí / Tầng</th>
                <th className="p-3.5 min-w-[90px] text-center">Năm SD</th>
                <th className="p-3.5 min-w-[100px]">Trạng thái</th>
                <th className="p-3.5 text-right min-w-[110px]">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Đang tải danh sách tài sản...
                  </td>
                </tr>
              ) : assets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-400">
                    Không tìm thấy thiết bị nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              ) : (
                assets.map((asset, idx) => (
                  <tr key={asset.id} className="hover:bg-blue-50/40 transition">
                    <td className="p-3.5 text-center text-slate-500 font-medium">
                      {(page - 1) * limit + idx + 1}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-blue-700">
                      {asset.assetCode}
                    </td>
                    <td className="p-3.5">
                      <div className="font-semibold text-slate-900">{asset.name}</div>
                      {asset.specifications && (
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{asset.specifications}</div>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-md font-bold text-[10px] ${
                        asset.managingUnit === 'DUOC' ? 'bg-emerald-100 text-emerald-800' :
                        asset.managingUnit === 'CNTT' ? 'bg-blue-100 text-blue-800' :
                        asset.buildingAsset === 1 ? 'bg-orange-100 text-orange-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {asset.managingUnit === 'DUOC' ? 'Khoa Dược (TBYT)' :
                         asset.managingUnit === 'CNTT' ? 'Tổ CNTT' :
                         asset.buildingAsset === 1 ? 'TCHC (Tòa nhà)' : 'TCHC (Hành chính)'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700 font-medium">
                      {asset.department?.name || 'CDC Đà Nẵng'}
                    </td>
                    <td className="p-3.5 text-slate-600">
                      <div>{asset.floor || asset.locationDetail || 'Tại khoa'}</div>
                      <div className="text-[10px] text-slate-400">{asset.location || 'Cơ sở 1'}</div>
                    </td>
                    <td className="p-3.5 text-center text-slate-600 font-mono">
                      {asset.yearInUse || '-'}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-semibold ${STATUS_COLORS[asset.status]}`}>
                        {STATUS_LABELS[asset.status] || asset.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-1">
                      <button
                        onClick={() => navigate(`/assets/${asset.id}`)}
                        className="p-1.5 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg transition"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/assets/${asset.id}/edit`)}
                        className="p-1.5 hover:bg-amber-50 text-slate-500 hover:text-amber-600 rounded-lg transition"
                        title="Chỉnh sửa"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id, asset.name)}
                        className="p-1.5 hover:bg-red-50 text-slate-500 hover:text-red-600 rounded-lg transition"
                        title="Xóa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
          <div>
            Hiển thị <strong>{assets.length > 0 ? (page - 1) * limit + 1 : 0}</strong> - <strong>{Math.min(page * limit, total)}</strong> trên tổng số <strong>{total.toLocaleString('vi-VN')}</strong> thiết bị
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-white transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <span className="px-3 py-1 font-semibold text-slate-800">
              Trang {page} / {totalPages || 1}
            </span>

            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border border-slate-300 rounded-lg disabled:opacity-40 hover:bg-white transition cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
