import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Building2, Monitor, Stethoscope, Layers, ShieldCheck } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet, apiPost, apiPut } from '../lib/api';
import { AssetCategory, Department } from '../types';
import { useAuth } from '../contexts/AuthContext';

const FALLBACK_CATEGORIES: AssetCategory[] = [
  { id: 1, code: 'DUOC', name: 'Trang thiết bị Y tế (Khoa Dược quản lý)', description: 'Máy xét nghiệm, siêu âm, chẩn đoán, vắc xin...' },
  { id: 2, code: 'CNTT', name: 'Thiết bị Công nghệ thông tin (Tổ CNTT quản lý)', description: 'PC, Laptop, Máy in, Scan, Mạng, Server...' },
  { id: 3, code: 'TCHC', name: 'Thiết bị Hành chính & CCDC (Phòng TCHC quản lý)', description: 'Bàn ghế, tủ sắt, quạt, giường inox...' },
  { id: 4, code: 'TBVP_TOANHA', name: 'Cơ sở vật chất & Hạ tầng tòa nhà theo tầng (TCHC)', description: 'Công tắc, ổ cắm, đèn led, tủ điện, PCCC theo tầng' }
];

const FLOORS = ['Tầng Hầm', 'Tầng 1', 'Tầng 2', 'Tầng 3', 'Tầng 4', 'Tầng 5', 'Tầng 6', 'Tầng 7'];

export default function AssetForm() {
  const { user } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [categories, setCategories] = useState<AssetCategory[]>(FALLBACK_CATEGORIES);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);

  // Determine initial managingUnit and default category code by role
  const isCntt = user?.role === 'MANAGER_CNTT';
  const isDuoc = user?.role === 'MANAGER_DUOC';
  const isTchc = user?.role === 'MANAGER_TCHC';
  const isAdmin = user?.role === 'ADMIN';

  const defaultRoleUnit = isCntt ? 'CNTT' : isTchc ? 'TCHC' : 'DUOC';

  const [formData, setFormData] = useState({
    assetCode: '',
    name: '',
    categoryId: isCntt ? '2' : isTchc ? '3' : '1',
    departmentId: '1',
    managingUnit: defaultRoleUnit,
    floor: 'Tầng 1',
    buildingAsset: 0,
    location: 'Cơ sở 1',
    locationDetail: '',
    assignedTo: '',
    yearInUse: new Date().getFullYear().toString(),
    originalPrice: '',
    depreciationRate: '10',
    fundingSource: 'Nguồn ngân sách nhà nước cấp',
    decisionNumber: '',
    manufacturer: '',
    countryOfOrigin: '',
    specifications: '',
    status: 'DANG_SU_DUNG',
    note: ''
  });

  // Filter categories strictly according to user role
  const allowedCategories = categories.filter(c => {
    if (!user || user.role === 'ADMIN') return true;
    if (isCntt) return c.code === 'CNTT';
    if (isDuoc) return c.code === 'DUOC';
    if (isTchc) return c.code === 'TCHC' || c.code === 'TBVP_TOANHA';
    return true;
  });

  useEffect(() => {
    const init = async () => {
      try {
        const [cRes, dRes] = await Promise.allSettled([
          apiGet('/categories'),
          apiGet('/departments')
        ]);
        let loadedCats = FALLBACK_CATEGORIES;
        if (cRes.status === 'fulfilled' && Array.isArray(cRes.value) && cRes.value.length > 0) {
          loadedCats = cRes.value;
          setCategories(loadedCats);
        }
        if (dRes.status === 'fulfilled' && Array.isArray(dRes.value)) {
          setDepartments(dRes.value);
        }

        if (isEdit && id) {
          const assetData = await apiGet(`/assets/${id}`);
          if (assetData) {
            setFormData({
              assetCode: assetData.assetCode || '',
              name: assetData.name || '',
              categoryId: assetData.categoryId?.toString() || '1',
              departmentId: assetData.departmentId?.toString() || '1',
              managingUnit: assetData.managingUnit || defaultRoleUnit,
              floor: assetData.floor || 'Tầng 1',
              buildingAsset: assetData.buildingAsset || 0,
              location: assetData.location || 'Cơ sở 1',
              locationDetail: assetData.locationDetail || '',
              assignedTo: assetData.assignedTo || '',
              yearInUse: assetData.yearInUse?.toString() || '',
              originalPrice: assetData.originalPrice?.toString() || '',
              depreciationRate: assetData.depreciationRate?.toString() || '10',
              fundingSource: assetData.fundingSource || 'Nguồn ngân sách nhà nước cấp',
              decisionNumber: assetData.decisionNumber || '',
              manufacturer: assetData.manufacturer || '',
              countryOfOrigin: assetData.countryOfOrigin || '',
              specifications: assetData.specifications || '',
              status: assetData.status || 'DANG_SU_DUNG',
              note: assetData.note || ''
            });
          }
        } else {
          // Set initial category correctly for current role
          const targetCode = isCntt ? 'CNTT' : isTchc ? 'TCHC' : 'DUOC';
          const matchCat = loadedCats.find(c => c.code === targetCode) || loadedCats[0];
          if (matchCat) {
            setFormData(prev => ({
              ...prev,
              categoryId: matchCat.id.toString(),
              managingUnit: targetCode
            }));
          }
        }
      } catch (e) {
        console.error('Error initializing form:', e);
      }
    };
    init();
  }, [id, isEdit]);

  // When category changes, auto set managing unit
  const handleCategoryChange = (catIdStr: string) => {
    const catId = parseInt(catIdStr);
    const cat = categories.find(c => c.id === catId);
    let mUnit = 'DUOC';
    let isBuilding = 0;

    if (cat?.code === 'CNTT') {
      mUnit = 'CNTT';
      isBuilding = 0;
    } else if (cat?.code === 'TCHC') {
      mUnit = 'TCHC';
      isBuilding = 0;
    } else if (cat?.code === 'TBVP_TOANHA') {
      mUnit = 'TCHC';
      isBuilding = 1;
    } else {
      mUnit = 'DUOC';
      isBuilding = 0;
    }

    // Role override
    if (isCntt) mUnit = 'CNTT';
    if (isDuoc) mUnit = 'DUOC';
    if (isTchc) mUnit = 'TCHC';

    setFormData(prev => ({
      ...prev,
      categoryId: catIdStr,
      managingUnit: mUnit,
      buildingAsset: isBuilding
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assetCode || !formData.name || !formData.categoryId || !formData.departmentId) {
      alert('Vui lòng điền các trường bắt buộc: Mã tài sản, Tên tài sản, Danh mục, Khoa phòng');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        categoryId: parseInt(formData.categoryId),
        departmentId: parseInt(formData.departmentId),
        yearInUse: formData.yearInUse ? parseInt(formData.yearInUse) : undefined,
        originalPrice: formData.originalPrice ? parseFloat(formData.originalPrice) : undefined,
        depreciationRate: formData.depreciationRate ? parseFloat(formData.depreciationRate) : undefined,
      };

      if (isEdit && id) {
        await apiPut(`/assets/${id}`, payload);
        alert('Cập nhật thông tin thiết bị thành công!');
      } else {
        await apiPost('/assets', payload);
        alert('Thêm mới thiết bị thành công!');
      }
      navigate('/assets');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi lưu thiết bị');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex items-center gap-3">
        <button 
          onClick={() => navigate(-1)} 
          className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isEdit ? 'Chỉnh sửa thông tin thiết bị' : 'Thêm mới thiết bị & Tài sản'}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Phân loại rõ vào 1 trong 3 khối: <strong>Khoa Dược (TBYT)</strong>, <strong>Tổ CNTT</strong> hoặc <strong>Phòng TCHC</strong>
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: PHÂN LOẠI & ĐỊNH DANH */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
              Định danh & Phân loại danh mục
            </h3>
            
            {/* Role indicator banner */}
            {!isAdmin && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-xs font-semibold text-blue-800">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  {isCntt ? '💻 Quyền hạn Tổ CNTT: Chỉ thêm & quản lý tài sản thuộc danh mục Thiết bị CNTT.' :
                   isDuoc ? '🩺 Quyền hạn Khoa Dược: Chỉ thêm & quản lý tài sản thuộc danh mục Trang thiết bị Y tế.' :
                   isTchc ? '🏢 Quyền hạn Phòng TCHC: Chỉ thêm & quản lý tài sản thuộc danh mục Hành chính & Tòa nhà.' :
                   'Phân quyền theo đơn vị của bạn.'}
                </span>
              </div>
            )}

            {/* Category Cards Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-2">
                Danh mục quản lý tài sản (*)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {allowedCategories.map(c => (
                  <div
                    key={c.id}
                    onClick={() => handleCategoryChange(c.id.toString())}
                    className={`p-3.5 rounded-xl border-2 cursor-pointer transition flex items-start gap-3 ${
                      formData.categoryId === c.id.toString()
                        ? 'border-blue-600 bg-blue-50/60 shadow-xs'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${
                      c.code === 'DUOC' ? 'bg-emerald-100 text-emerald-700' :
                      c.code === 'CNTT' ? 'bg-blue-100 text-blue-700' :
                      c.code === 'TBVP_TOANHA' ? 'bg-orange-100 text-orange-700' :
                      'bg-amber-100 text-amber-700'
                    }`}>
                      {c.code === 'DUOC' ? <Stethoscope className="w-4 h-4" /> :
                       c.code === 'CNTT' ? <Monitor className="w-4 h-4" /> :
                       c.code === 'TBVP_TOANHA' ? <Layers className="w-4 h-4" /> :
                       <Building2 className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">{c.name}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{c.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mã tài sản (*)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: TSPK008, MH/PKDK-001, BXN 03..."
                  value={formData.assetCode}
                  onChange={e => setFormData({ ...formData, assetCode: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 font-semibold"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tên thiết bị / Tài sản (*)</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: Máy xét nghiệm sinh hóa tự động, Màn hình LCD Dell 19.5 inch..."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 font-medium"
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Khoa / Phòng sử dụng (*)</label>
                <select 
                  required
                  value={formData.departmentId}
                  onChange={e => setFormData({ ...formData, departmentId: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.code} - {d.name} ({d.location})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Trạng thái thiết bị (*)</label>
                <select 
                  value={formData.status}
                  onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white font-medium"
                >
                  <option value="DANG_SU_DUNG">Đang sử dụng</option>
                  <option value="BAO_TRI">Bảo trì / Sửa chữa</option>
                  <option value="HONG">Hỏng / Đề nghị sửa</option>
                  <option value="CHO_PHAN_BO">Chờ phân bổ</option>
                  <option value="CHO_THANH_LY">Chờ thanh lý</option>
                  <option value="KHONG_SU_DUNG">Không sử dụng</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 2: VỊ TRÍ & SỬ DỤNG */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
              Vị trí & Cán bộ phụ trách
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cơ sở đặt máy</label>
                <select 
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Cơ sở 1">Cơ sở 1 (118 Lê Đình Lý)</option>
                  <option value="Cơ sở 2">Cơ sở 2 (Bàn Thạch)</option>
                </select>
              </div>

              {formData.buildingAsset === 1 && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tầng tòa nhà</label>
                  <select 
                    value={formData.floor}
                    onChange={e => setFormData({ ...formData, floor: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white font-semibold text-orange-800"
                  >
                    {FLOORS.map(fl => (
                      <option key={fl} value={fl}>{fl}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className={formData.buildingAsset === 1 ? '' : 'md:col-span-2'}>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Phòng / Vị trí chi tiết</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Phòng tiêm chủng, Labo Xét nghiệm T6, Phòng Giám đốc..."
                  value={formData.locationDetail}
                  onChange={e => setFormData({ ...formData, locationDetail: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cán bộ phụ trách / Sử dụng</label>
                <input 
                  type="text" 
                  placeholder="Họ tên cán bộ..."
                  value={formData.assignedTo}
                  onChange={e => setFormData({ ...formData, assignedTo: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Năm đưa vào sử dụng</label>
                <input 
                  type="number" 
                  placeholder="2026..."
                  value={formData.yearInUse}
                  onChange={e => setFormData({ ...formData, yearInUse: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nguyên giá (VNĐ)</label>
                <input 
                  type="number" 
                  placeholder="Nhập số tiền..."
                  value={formData.originalPrice}
                  onChange={e => setFormData({ ...formData, originalPrice: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: THÔNG SỐ KỸ THUẬT */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-2 uppercase tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">3</span>
              Thông số kỹ thuật & Ghi chú
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Nguồn kinh phí hình thành</label>
                <select
                  value={formData.fundingSource}
                  onChange={e => setFormData({ ...formData, fundingSource: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="Nguồn ngân sách nhà nước cấp">Nguồn ngân sách nhà nước cấp</option>
                  <option value="Nguồn thu dịch vụ y tế">Nguồn thu dịch vụ y tế</option>
                  <option value="Quỹ phát triển hoạt động sự nghiệp">Quỹ phát triển hoạt động sự nghiệp</option>
                  <option value="Nguồn dự án / Viện trợ phi chính phủ">Nguồn dự án / Viện trợ phi chính phủ</option>
                  <option value="Nguồn viện trợ ODA">Nguồn viện trợ ODA</option>
                  <option value="Nguồn xã hội hóa">Nguồn xã hội hóa</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Quyết định số / Căn cứ mua sắm</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: QĐ số 15/QĐ-SYT, QĐ số 28/QĐ-TTKSBT..."
                  value={formData.decisionNumber}
                  onChange={e => setFormData({ ...formData, decisionNumber: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hãng / Nước sản xuất</label>
                <input 
                  type="text" 
                  placeholder="Ví dụ: Dell (Mỹ), Olympus (Nhật Bản), Rạng Đông (Việt Nam)..."
                  value={formData.manufacturer}
                  onChange={e => setFormData({ ...formData, manufacturer: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ghi chú bổ sung</label>
                <input 
                  type="text" 
                  placeholder="Nguồn kinh phí, mua sắm năm 2026, dự án viện trợ..."
                  value={formData.note}
                  onChange={e => setFormData({ ...formData, note: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Cấu hình chi tiết / Thông số máy</label>
                <textarea 
                  rows={3} 
                  placeholder="Mô tả cấu hình máy tính (CPU, RAM, SSD) hoặc thông số máy xét nghiệm, công suất điều hòa..."
                  value={formData.specifications}
                  onChange={e => setFormData({ ...formData, specifications: e.target.value })}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button 
              type="button" 
              onClick={() => navigate(-1)} 
              className="px-5 py-2.5 border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow flex items-center gap-2 transition cursor-pointer disabled:opacity-70"
            >
              <Save className="w-4 h-4" /> {loading ? 'Đang lưu...' : 'Lưu thông tin thiết bị'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
