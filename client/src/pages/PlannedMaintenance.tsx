import React, { useState, useEffect, useMemo } from 'react';
import { 
  Plus, AlertTriangle, CheckCircle2, Clock, Calendar, 
  Search, Printer, DollarSign, FileText, CheckCircle, XCircle, Users,
  Layers, ShieldCheck, Sparkles, Download, Edit3, Trash2, CalendarCheck,
  Building2, UserCheck, Wrench, RefreshCw, X, ChevronRight, Check, Eye
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Asset, PlannedMaintenance as PlannedMaintenanceType, Department } from '../types';

export default function PlannedMaintenance() {
  const { user } = useAuth();
  const [records, setRecords] = useState<PlannedMaintenanceType[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [detailRecord, setDetailRecord] = useState<PlannedMaintenanceType | null>(null);

  // Tabs: 'ALL' | 'UPCOMING' | 'OVERDUE' | 'PRINT'
  const [activeTab, setActiveTab] = useState<'ALL' | 'UPCOMING' | 'OVERDUE' | 'PRINT'>('ALL');

  // Filters
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [resultFilter, setResultFilter] = useState('ALL');
  const [unitFilter, setUnitFilter] = useState(
    user?.role === 'MANAGER_DUOC' ? 'DUOC' :
    user?.role === 'MANAGER_CNTT' ? 'CNTT' :
    user?.role === 'MANAGER_TCHC' ? 'TCHC' : 'ALL'
  );

  // Asset selector in modal
  const [assetSearch, setAssetSearch] = useState('');

  // Create Form State
  const [formData, setFormData] = useState({
    assetId: '',
    maintenanceDate: new Date().toISOString().split('T')[0],
    nextMaintenanceDate: '',
    cycleMonths: 6,
    performedBy: user?.fullName || 'Tổ Kỹ thuật / Kỹ sư bảo trì',
    vendor: 'Trung tâm Bảo trì Thiết bị Y tế / Đại diện Hãng',
    planContent: 'Bảo dưỡng định kỳ: Vệ sinh máy, kiểm tra nguồn điện, hiệu chỉnh độ ổn định, bôi trơn linh kiện chuyển động',
    result: 'PASS',
    cost: '500000',
    decisionNumber: 'Kế hoạch số 15/KH-TTKSBT năm 2026',
    acceptanceMembers: 'Ds. Tính, Ds. Lộc, Cn. Hải, Cn. Sơn',
    fundingSource: 'Nguồn thu sự nghiệp / Quỹ PTHĐSN',
    deviceStatusAfter: 'Hoạt động tốt, ổn định',
    note: ''
  });

  // Edit Form State
  const [editData, setEditData] = useState<any>({
    id: 0,
    assetId: '',
    maintenanceDate: '',
    nextMaintenanceDate: '',
    cycleMonths: 6,
    performedBy: '',
    vendor: '',
    planContent: '',
    result: 'PASS',
    cost: '',
    decisionNumber: '',
    acceptanceMembers: '',
    fundingSource: '',
    deviceStatusAfter: '',
    note: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, aRes, dRes, sRes] = await Promise.allSettled([
        apiGet('/planned-maintenance'),
        apiGet('/assets?limit=5000'),
        apiGet('/departments'),
        apiGet('/planned-maintenance/stats/summary')
      ]);

      if (rRes.status === 'fulfilled' && Array.isArray(rRes.value)) setRecords(rRes.value);
      if (aRes.status === 'fulfilled' && aRes.value?.assets) setAssets(aRes.value.assets);
      if (dRes.status === 'fulfilled' && Array.isArray(dRes.value)) setDepartments(dRes.value);
      if (sRes.status === 'fulfilled' && sRes.value) setStats(sRes.value);
    } catch (e) {
      console.error('Error fetching planned maintenance data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Update next maintenance date automatically when maintenanceDate or cycleMonths changes
  const updateNextDate = (dateStr: string, months: number, isEdit: boolean = false) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    d.setMonth(d.getMonth() + Number(months));
    const nextStr = d.toISOString().split('T')[0];
    if (isEdit) {
      setEditData((prev: any) => ({ ...prev, nextMaintenanceDate: nextStr }));
    } else {
      setFormData((prev: any) => ({ ...prev, nextMaintenanceDate: nextStr }));
    }
  };

  // Open Create Modal
  const handleOpenCreate = () => {
    const today = new Date().toISOString().split('T')[0];
    const nextD = new Date();
    nextD.setMonth(nextD.getMonth() + 6);
    setFormData({
      assetId: '',
      maintenanceDate: today,
      nextMaintenanceDate: nextD.toISOString().split('T')[0],
      cycleMonths: 6,
      performedBy: user?.fullName || 'Tổ Kỹ thuật / Kỹ sư bảo dưỡng',
      vendor: 'Trung tâm Dịch vụ Kỹ thuật Thiết bị',
      planContent: 'Bảo dưỡng định kỳ: Vệ sinh, tra dầu mỡ, kiểm tra an toàn điện và cân chỉnh thông số kỹ thuật',
      result: 'PASS',
      cost: '500000',
      decisionNumber: 'Kế hoạch số 15/KH-TTKSBT năm 2026',
      acceptanceMembers: 'Trưởng bộ phận sử dụng, Cán bộ phụ trách',
      fundingSource: 'Nguồn thu sự nghiệp / Quỹ PTHĐSN',
      deviceStatusAfter: 'Hoạt động tốt, ổn định',
      note: ''
    });
    setAssetSearch('');
    setShowModal(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assetId) {
      alert('Vui lòng chọn thiết bị thực hiện bảo trì định kỳ!');
      return;
    }
    try {
      await apiPost('/planned-maintenance', formData);
      setShowModal(false);
      fetchData();
      alert('Đã lập kế hoạch & ghi nhật ký bảo trì định kỳ thành công!');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi tạo hồ sơ bảo trì');
    }
  };

  // Open Edit Modal
  const handleOpenEdit = (rec: PlannedMaintenanceType) => {
    setEditingRecord(rec);
    setEditData({
      id: rec.id,
      assetId: rec.assetId ? rec.assetId.toString() : '',
      maintenanceDate: rec.maintenanceDate ? new Date(rec.maintenanceDate).toISOString().split('T')[0] : '',
      nextMaintenanceDate: rec.nextMaintenanceDate ? new Date(rec.nextMaintenanceDate).toISOString().split('T')[0] : '',
      cycleMonths: rec.cycleMonths || 6,
      performedBy: rec.performedBy || '',
      vendor: rec.vendor || '',
      planContent: rec.planContent || '',
      result: rec.result || 'PASS',
      cost: rec.cost !== undefined ? rec.cost.toString() : '',
      decisionNumber: rec.decisionNumber || '',
      acceptanceMembers: rec.acceptanceMembers || '',
      fundingSource: rec.fundingSource || '',
      deviceStatusAfter: rec.deviceStatusAfter || 'Hoạt động tốt',
      note: rec.note || ''
    });
    setAssetSearch('');
    setShowEditModal(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPut(`/planned-maintenance/${editData.id}`, editData);
      setShowEditModal(false);
      fetchData();
      alert('Đã cập nhật kế hoạch bảo trì thành công!');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi cập nhật kế hoạch bảo trì');
    }
  };

  // Open Detail Modal
  const handleOpenDetail = (rec: PlannedMaintenanceType) => {
    setDetailRecord(rec);
    setShowDetailModal(true);
  };

  // Delete Record
  const handleDelete = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa bản ghi bảo trì kế hoạch này? Thao tác không thể hoàn tác.')) return;
    try {
      await apiDelete(`/planned-maintenance/${id}`);
      fetchData();
      alert('Đã xóa bản ghi bảo trì thành công!');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi xóa bản ghi bảo trì');
    }
  };

  // Filter Records
  const now = new Date();
  const future30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // Tab status filter
      if (activeTab === 'UPCOMING') {
        if (!r.nextMaintenanceDate) return false;
        const d = new Date(r.nextMaintenanceDate);
        if (d < now || d > future30) return false;
      } else if (activeTab === 'OVERDUE') {
        if (!r.nextMaintenanceDate) return false;
        const d = new Date(r.nextMaintenanceDate);
        if (d >= now) return false;
      }

      // Dropdown filters
      if (resultFilter !== 'ALL' && r.result !== resultFilter) return false;
      if (deptFilter !== 'ALL' && r.asset?.departmentId?.toString() !== deptFilter) return false;
      if (unitFilter !== 'ALL' && (r.asset as any)?.managingUnit !== unitFilter) return false;

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchName = r.asset?.name?.toLowerCase().includes(q);
        const matchCode = r.asset?.assetCode?.toLowerCase().includes(q);
        const matchVendor = r.vendor?.toLowerCase().includes(q);
        const matchPerf = r.performedBy?.toLowerCase().includes(q);
        const matchContent = r.planContent?.toLowerCase().includes(q);
        const matchDept = r.asset?.department?.name?.toLowerCase().includes(q);
        if (!matchName && !matchCode && !matchVendor && !matchPerf && !matchContent && !matchDept) return false;
      }

      return true;
    });
  }, [records, activeTab, resultFilter, deptFilter, unitFilter, search]);

  // Asset search for modal selector
  const filteredAssetsForSelector = useMemo(() => {
    let list = assets;
    if (user?.role === 'MANAGER_DUOC') {
      list = list.filter(a => a.managingUnit === 'DUOC');
    } else if (user?.role === 'MANAGER_CNTT') {
      list = list.filter(a => a.managingUnit === 'CNTT');
    } else if (user?.role === 'MANAGER_TCHC') {
      list = list.filter(a => a.managingUnit === 'TCHC');
    } else if (user?.role === 'DEPARTMENT' && user.departmentId) {
      list = list.filter(a => a.departmentId === user.departmentId);
    }

    if (!assetSearch.trim()) return list.slice(0, 30);
    const q = assetSearch.toLowerCase();
    return list.filter(a => 
      a.name.toLowerCase().includes(q) ||
      a.assetCode.toLowerCase().includes(q) ||
      a.assignedTo?.toLowerCase().includes(q) ||
      a.locationDetail?.toLowerCase().includes(q) ||
      a.department?.name?.toLowerCase().includes(q)
    ).slice(0, 40);
  }, [assets, assetSearch, user]);

  return (
    <div className="space-y-6 pb-16">
      {/* 1. TOP HEADER */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
              Quy trình bảo dưỡng định kỳ
            </span>
            <h1 className="text-2xl font-bold text-slate-900">Bảo Trì Định Kỳ Theo Kế Hoạch</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Lập kế hoạch & theo dõi chu kỳ bảo trì (1, 3, 6, 12 tháng) đảm bảo máy móc hoạt động bền bỉ, an toàn
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'PRINT' ? 'ALL' : 'PRINT')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition cursor-pointer ${
              activeTab === 'PRINT' 
                ? 'bg-purple-50 border-purple-300 text-purple-800' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Printer className="w-4 h-4 text-purple-600" />
            {activeTab === 'PRINT' ? 'Quay lại danh sách' : 'In Kế Hoạch A4'}
          </button>

          <button
            onClick={fetchData}
            className="p-2 text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Lập Kế Hoạch Bảo Trì
          </button>
        </div>
      </div>

      {/* 2. STATS SUMMARY CARDS */}
      <div className="print:hidden grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Tổng lượt bảo trì</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats?.total || records.length}</div>
          <div className="text-[11px] text-emerald-600 mt-1 font-semibold">Theo kế hoạch năm 2026</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Đạt tiêu chuẩn</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{stats?.passCount || records.filter(r => r.result === 'PASS').length}</div>
          <div className="text-[11px] text-slate-400 mt-1">Hoạt động ổn định</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Sắp đến hạn (30 ngày)</div>
          <div className="text-2xl font-bold text-amber-600 mt-1">
            {stats?.upcomingCount || records.filter(r => r.nextMaintenanceDate && new Date(r.nextMaintenanceDate) >= now && new Date(r.nextMaintenanceDate) <= future30).length}
          </div>
          <div className="text-[11px] text-amber-600 mt-1 font-medium">Cần chuẩn bị bảo trì</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Quá hạn bảo trì</div>
          <div className="text-2xl font-bold text-red-600 mt-1">
            {stats?.overdueCount || records.filter(r => r.nextMaintenanceDate && new Date(r.nextMaintenanceDate) < now).length}
          </div>
          <div className="text-[11px] text-red-500 mt-1 font-medium">Cần thực hiện ngay</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-xs text-slate-500 font-medium">Tổng kinh phí bảo trì</div>
          <div className="text-lg font-bold text-slate-900 mt-1 font-mono text-emerald-700">
            {stats?.totalCost ? Number(stats.totalCost).toLocaleString('vi-VN') : '0'} đ
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Sự nghiệp & Quỹ PTHĐSN</div>
        </div>
      </div>

      {/* 3. TABS & FILTERS */}
      {activeTab !== 'PRINT' && (
        <div className="print:hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          {/* Navigation Sub-Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'ALL' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                Tất cả hồ sơ ({records.length})
              </button>

              <button
                onClick={() => setActiveTab('UPCOMING')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'UPCOMING' ? 'bg-amber-500 text-white shadow-sm' : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                Sắp đến hạn (30 ngày)
              </button>

              <button
                onClick={() => setActiveTab('OVERDUE')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'OVERDUE' ? 'bg-red-600 text-white shadow-sm' : 'bg-red-50 text-red-800 hover:bg-red-100'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Quá hạn bảo trì
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm mã TS, tên máy, đơn vị, cán bộ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            <select
              value={deptFilter}
              onChange={e => setDeptFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="ALL">Tất cả khoa / phòng</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
              ))}
            </select>

            <select
              value={unitFilter}
              onChange={e => setUnitFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="ALL">Tất cả khối quản lý</option>
              <option value="DUOC">Khối Trang thiết bị Y tế (Dược)</option>
              <option value="CNTT">Khối Thiết bị CNTT</option>
              <option value="TCHC">Khối Thiết bị Điện & CSVC (TCHC)</option>
            </select>

            <select
              value={resultFilter}
              onChange={e => setResultFilter(e.target.value)}
              className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
            >
              <option value="ALL">Tất cả kết quả bảo trì</option>
              <option value="PASS">Đạt tiêu chuẩn / Tốt</option>
              <option value="NEEDS_REPAIR">Cần sửa chữa thêm</option>
              <option value="PENDING">Đang thực hiện</option>
              <option value="FAIL">Không đạt</option>
            </select>
          </div>
        </div>
      )}

      {/* 4. MAIN DATA TABLE */}
      {activeTab !== 'PRINT' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-700 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3.5 text-center w-10">STT</th>
                  <th className="p-3.5">Mã tài sản</th>
                  <th className="p-3.5">Tên thiết bị & Khoa sử dụng</th>
                  <th className="p-3.5">Ngày bảo trì</th>
                  <th className="p-3.5">Hạn bảo trì tiếp</th>
                  <th className="p-3.5">Chu kỳ</th>
                  <th className="p-3.5">Đơn vị & Cán bộ thực hiện</th>
                  <th className="p-3.5">Nội dung bảo trì</th>
                  <th className="p-3.5">Kết quả</th>
                  <th className="p-3.5 text-right">Chi phí</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={11} className="text-center py-12 text-slate-400">Đang tải danh sách kế hoạch bảo trì...</td></tr>
                ) : filteredRecords.length === 0 ? (
                  <tr><td colSpan={11} className="text-center py-12 text-slate-400">Không tìm thấy bản ghi bảo trì nào phù hợp.</td></tr>
                ) : (
                  filteredRecords.map((r, idx) => {
                    const isOverdue = r.nextMaintenanceDate && new Date(r.nextMaintenanceDate) < now;
                    const isUpcoming = r.nextMaintenanceDate && new Date(r.nextMaintenanceDate) >= now && new Date(r.nextMaintenanceDate) <= future30;

                    return (
                      <tr key={r.id} className="hover:bg-slate-50/80 transition">
                        <td className="p-3.5 text-center text-slate-500">{idx + 1}</td>
                        <td className="p-3.5 font-mono font-bold text-emerald-700">
                          {r.asset?.assetCode || '-'}
                        </td>
                        <td className="p-3.5 max-w-xs">
                          <div className="font-bold text-slate-900">{r.asset?.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            🏢 {r.asset?.department?.name || 'CDC'} 
                            {r.asset?.locationDetail && ` • 📍 ${r.asset.locationDetail}`}
                          </div>
                        </td>
                        <td className="p-3.5 text-slate-700 whitespace-nowrap">
                          {new Date(r.maintenanceDate).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="p-3.5 whitespace-nowrap">
                          {r.nextMaintenanceDate ? (
                            <div>
                              <div className={`font-semibold ${isOverdue ? 'text-red-600' : isUpcoming ? 'text-amber-600' : 'text-slate-800'}`}>
                                {new Date(r.nextMaintenanceDate).toLocaleDateString('vi-VN')}
                              </div>
                              {isOverdue && (
                                <span className="inline-block px-1.5 py-0.2 bg-red-100 text-red-800 rounded text-[9px] font-bold mt-0.5">
                                  Quá hạn
                                </span>
                              )}
                              {isUpcoming && (
                                <span className="inline-block px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold mt-0.5">
                                  Sắp đến hạn
                                </span>
                              )}
                            </div>
                          ) : '-'}
                        </td>
                        <td className="p-3.5 text-slate-600">
                          {r.cycleMonths ? `${r.cycleMonths} tháng` : '6 tháng'}
                        </td>
                        <td className="p-3.5 max-w-[180px]">
                          <div className="font-medium text-slate-800 truncate">{r.vendor || 'Đơn vị kỹ thuật'}</div>
                          <div className="text-[11px] text-slate-500 truncate">👤 {r.performedBy || '-'}</div>
                        </td>
                        <td className="p-3.5 max-w-[200px]">
                          <div className="text-slate-700 line-clamp-2" title={r.planContent || ''}>
                            {r.planContent || 'Bảo dưỡng định kỳ'}
                          </div>
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.result === 'PASS' ? 'bg-emerald-100 text-emerald-800' :
                            r.result === 'NEEDS_REPAIR' ? 'bg-orange-100 text-orange-800' :
                            r.result === 'PENDING' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {r.result === 'PASS' ? 'Đạt yêu cầu' :
                             r.result === 'NEEDS_REPAIR' ? 'Cần sửa chữa' :
                             r.result === 'PENDING' ? 'Đang thực hiện' : 'Không đạt'}
                          </span>
                        </td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                          {r.cost ? Number(r.cost).toLocaleString('vi-VN') : '0'} đ
                        </td>
                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenDetail(r)}
                              className="p-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white rounded-lg transition cursor-pointer"
                              title="Xem chi tiết bảo trì thiết bị"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenDetail(r)}
                              className="p-1.5 bg-purple-50 text-purple-700 hover:bg-purple-600 hover:text-white rounded-lg transition cursor-pointer"
                              title="In biên bản bảo dưỡng định kỳ thiết bị (A4)"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleOpenEdit(r)}
                              className="p-1.5 bg-blue-50 text-blue-700 hover:bg-blue-600 hover:text-white rounded-lg transition cursor-pointer"
                              title="Chỉnh sửa hồ sơ bảo trì"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(r.id)}
                              className="p-1.5 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition cursor-pointer"
                              title="Xóa hồ sơ bảo trì"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. PRINTABLE REPORT A4 (CHUẨN KẾ HOẠCH BẢO TRÌ ĐỊNH KỲ CDC ĐÀ NẴNG)          */}
      {/* ========================================================================= */}
      {activeTab === 'PRINT' && (
        <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-md border border-slate-200 font-serif text-slate-900 print:shadow-none print:border-none print:p-0">
          <div className="flex justify-between items-start text-xs sm:text-sm font-sans mb-4">
            <div>
              <div className="font-bold uppercase">TRUNG TÂM KIỂM SOÁT BỆNH TẬT TP ĐÀ NẴNG</div>
              <div className="font-bold text-slate-700">KHOA DƯỢC - VẬT TƯ Y TẾ / TỔ KỸ THUẬT</div>
            </div>
            <div className="text-right">
              <div className="font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div className="italic text-xs">Độc lập - Tự do - Hạnh phúc</div>
            </div>
          </div>

          <div className="text-center my-6">
            <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide">
              KẾ HOẠCH & BẢNG THEO DÕI BẢO TRÌ ĐỊNH KỲ THIẾT BỊ NĂM 2026
            </h2>
            <p className="text-xs sm:text-sm italic text-slate-600 mt-1 font-sans">
              (Kế hoạch số 15/KH-TTKSBT ngày 15/01/2026 về Bảo dưỡng & Đảm bảo an toàn kỹ thuật trang thiết bị)
            </p>
          </div>

          <div className="border border-slate-400 rounded-lg overflow-hidden font-sans text-xs">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-100 text-center font-bold border-b border-slate-400 divide-x divide-slate-300">
                <tr>
                  <th className="p-2 w-8">STT</th>
                  <th className="p-2 min-w-[70px]">Mã TS</th>
                  <th className="p-2 min-w-[180px]">Tên trang thiết bị</th>
                  <th className="p-2 min-w-[90px]">Khoa / Phòng</th>
                  <th className="p-2 min-w-[90px]">Ngày bảo trì</th>
                  <th className="p-2 min-w-[90px]">Hạn tiếp theo</th>
                  <th className="p-2 min-w-[140px]">Nội dung kế hoạch</th>
                  <th className="p-2 min-w-[120px]">Đơn vị thực hiện</th>
                  <th className="p-2 min-w-[80px]">Kinh phí (đ)</th>
                  <th className="p-2 min-w-[70px]">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-300">
                {filteredRecords.map((r, idx) => (
                  <tr key={r.id} className="divide-x divide-slate-200">
                    <td className="p-2 text-center">{idx + 1}</td>
                    <td className="p-2 font-mono font-semibold">{r.asset?.assetCode}</td>
                    <td className="p-2 font-medium">{r.asset?.name}</td>
                    <td className="p-2">{r.asset?.department?.name}</td>
                    <td className="p-2 text-center">{new Date(r.maintenanceDate).toLocaleDateString('vi-VN')}</td>
                    <td className="p-2 text-center">{r.nextMaintenanceDate ? new Date(r.nextMaintenanceDate).toLocaleDateString('vi-VN') : '-'}</td>
                    <td className="p-2">{r.planContent || 'Bảo dưỡng định kỳ'}</td>
                    <td className="p-2">{r.vendor}</td>
                    <td className="p-2 text-right font-mono">{r.cost ? Number(r.cost).toLocaleString('vi-VN') : '0'}</td>
                    <td className="p-2 text-center font-semibold">
                      {r.result === 'PASS' ? 'Đạt' : r.result === 'NEEDS_REPAIR' ? 'Cần sửa' : 'Không đạt'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex justify-between text-xs sm:text-sm font-sans pt-6">
            <div className="text-center">
              <div className="font-bold">NGƯỜI LẬP KẾ HOẠCH</div>
              <div className="italic text-slate-500 text-[11px] mt-0.5">(Ký và ghi rõ họ tên)</div>
              <div className="h-16"></div>
              <div className="font-semibold">{user?.fullName || 'Cán bộ phụ trách'}</div>
            </div>

            <div className="text-center">
              <div className="font-bold">TRƯỞNG BỘ PHẬN CHUYÊN TRÁCH</div>
              <div className="italic text-slate-500 text-[11px] mt-0.5">(Ký và ghi rõ họ tên)</div>
              <div className="h-16"></div>
              <div className="font-semibold">Trưởng Khoa Dược / Tổ CNTT / Phòng TCHC</div>
            </div>

            <div className="text-center">
              <div className="italic text-slate-600 text-xs mb-1">Đà Nẵng, ngày ..... tháng ..... năm 2026</div>
              <div className="font-bold">GIÁM ĐỐC TRUNG TÂM</div>
              <div className="italic text-slate-500 text-[11px] mt-0.5">(Ký tên và đóng dấu)</div>
              <div className="h-16"></div>
              <div className="font-bold">TS. BS. Nguyễn Đại Vĩnh</div>
            </div>
          </div>

          <div className="print:hidden mt-8 text-center border-t border-slate-200 pt-4">
            <button
              onClick={() => window.print()}
              className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-bold shadow hover:bg-purple-700 transition cursor-pointer"
            >
              In văn bản Kế Hoạch Bảo Trì
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CREATE MODAL (BỘ CHỌN THIẾT BỊ TRỰC QUAN BẰNG TICK / CARDS)              */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/15 rounded-xl backdrop-blur-sm">
                  <CalendarCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Lập Kế Hoạch & Nhật Ký Bảo Trì Định Kỳ</h3>
                  <p className="text-xs text-emerald-100">Bảo dưỡng định kỳ theo kế hoạch (chu kỳ 1/3/6/12 tháng)</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 hover:bg-white/20 rounded-xl transition text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Asset Selector */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>1. Chọn thiết bị cần bảo trì định kỳ <span className="text-red-500">*</span></span>
                  <span className="text-[11px] font-normal text-slate-500">Tìm theo mã TS, tên máy, người sử dụng hoặc phòng</span>
                </label>
                
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Gõ mã tài sản, tên thiết bị, cán bộ phụ trách..."
                    value={assetSearch}
                    onChange={e => setAssetSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none transition"
                  />
                </div>

                {/* Cards selector */}
                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-2xl divide-y divide-slate-100 bg-slate-50/50 p-1 space-y-1">
                  {filteredAssetsForSelector.map(a => {
                    const isSelected = formData.assetId === a.id.toString();
                    return (
                      <div
                        key={a.id}
                        onClick={() => setFormData({ ...formData, assetId: a.id.toString() })}
                        className={`p-3 rounded-xl cursor-pointer transition flex items-start justify-between gap-3 ${
                          isSelected ? 'bg-emerald-50 border border-emerald-300 shadow-xs' : 'bg-white hover:bg-slate-100/70 border border-transparent'
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded">
                              {a.assetCode}
                            </span>
                            <span className="font-bold text-xs text-slate-900">{a.name}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 mt-1">
                            <span>🏢 {a.department?.name}</span>
                            {a.assignedTo && <span>👤 Cán bộ: <b className="text-slate-700">{a.assignedTo}</b></span>}
                            {a.locationDetail && <span>📍 Vị trí: {a.locationDetail}</span>}
                          </div>
                        </div>
                        <div className="shrink-0 pt-0.5">
                          <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition ${
                            isSelected ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300 bg-white'
                          }`}>
                            {isSelected && <Check className="w-3.5 h-3.5" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Maintenance Date & Cycle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày thực hiện bảo trì</label>
                  <input
                    type="date"
                    value={formData.maintenanceDate}
                    onChange={e => {
                      setFormData({ ...formData, maintenanceDate: e.target.value });
                      updateNextDate(e.target.value, formData.cycleMonths, false);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chu kỳ bảo trì</label>
                  <select
                    value={formData.cycleMonths}
                    onChange={e => {
                      const m = Number(e.target.value);
                      setFormData({ ...formData, cycleMonths: m });
                      updateNextDate(formData.maintenanceDate, m, false);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-semibold"
                  >
                    <option value={1}>1 tháng (Hàng tháng)</option>
                    <option value={3}>3 tháng (Hàng quý)</option>
                    <option value={6}>6 tháng (Nửa năm)</option>
                    <option value={12}>12 tháng (Hàng năm)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hạn bảo trì tiếp theo</label>
                  <input
                    type="date"
                    value={formData.nextMaintenanceDate}
                    onChange={e => setFormData({ ...formData, nextMaintenanceDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-semibold text-emerald-700"
                  />
                </div>
              </div>

              {/* Vendor & Performed By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị thực hiện bảo trì</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                    placeholder="VD: TT Dịch vụ Kỹ thuật Thiết bị Y tế..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cán bộ phụ trách / thực hiện</label>
                  <input
                    type="text"
                    value={formData.performedBy}
                    onChange={e => setFormData({ ...formData, performedBy: e.target.value })}
                    placeholder="VD: Tổ Kỹ thuật / Kỹ sư bảo trì..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Plan Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung bảo trì theo kế hoạch</label>
                <textarea
                  rows={2}
                  value={formData.planContent}
                  onChange={e => setFormData({ ...formData, planContent: e.target.value })}
                  placeholder="Ghi rõ nội dung: Vệ sinh linh kiện, kiểm tra dầu mỡ, hiệu chỉnh nguồn điện, kiểm tra an toàn..."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Result & Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kết quả bảo trì</label>
                  <select
                    value={formData.result}
                    onChange={e => setFormData({ ...formData, result: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
                  >
                    <option value="PASS">✅ Đạt tiêu chuẩn / Tốt</option>
                    <option value="NEEDS_REPAIR">⚠️ Cần sửa chữa thêm</option>
                    <option value="PENDING">⏳ Đang thực hiện</option>
                    <option value="FAIL">❌ Không đạt</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chi phí bảo trì (đ)</label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={e => setFormData({ ...formData, cost: e.target.value })}
                    placeholder="VD: 500000"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kế hoạch số / QĐ số</label>
                  <input
                    type="text"
                    value={formData.decisionNumber}
                    onChange={e => setFormData({ ...formData, decisionNumber: e.target.value })}
                    placeholder="VD: KH số 15/KH-TTKSBT"
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Acceptance Members & Funding Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Người nghiệm thu</label>
                  <input
                    type="text"
                    value={formData.acceptanceMembers}
                    onChange={e => setFormData({ ...formData, acceptanceMembers: e.target.value })}
                    placeholder="VD: Trưởng khoa phòng, cán bộ phụ trách..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nguồn kinh phí</label>
                  <input
                    type="text"
                    value={formData.fundingSource}
                    onChange={e => setFormData({ ...formData, fundingSource: e.target.value })}
                    placeholder="VD: Nguồn thu sự nghiệp / Quỹ PTHĐSN..."
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow transition cursor-pointer"
                >
                  Lưu Kế Hoạch Bảo Trì
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. EDIT MODAL                                                              */}
      {/* ========================================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-700 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-white/15 rounded-xl backdrop-blur-sm">
                  <Edit3 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Chỉnh Sửa Hồ Sơ Bảo Trì Định Kỳ</h3>
                  <p className="text-xs text-blue-100">Cập nhật nội dung, kết quả và chi phí bảo trì</p>
                </div>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 hover:bg-white/20 rounded-xl transition text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
              {/* Asset Display */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                      {editingRecord?.asset?.assetCode}
                    </span>
                    <span className="font-bold text-xs text-slate-900">{editingRecord?.asset?.name}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    🏢 {editingRecord?.asset?.department?.name} • 📍 {editingRecord?.asset?.locationDetail || 'Cơ sở 1'}
                  </div>
                </div>
              </div>

              {/* Maintenance Date & Cycle */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Ngày thực hiện bảo trì</label>
                  <input
                    type="date"
                    value={editData.maintenanceDate}
                    onChange={e => {
                      setEditData({ ...editData, maintenanceDate: e.target.value });
                      updateNextDate(e.target.value, editData.cycleMonths, true);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chu kỳ bảo trì</label>
                  <select
                    value={editData.cycleMonths}
                    onChange={e => {
                      const m = Number(e.target.value);
                      setEditData({ ...editData, cycleMonths: m });
                      updateNextDate(editData.maintenanceDate, m, true);
                    }}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold"
                  >
                    <option value={1}>1 tháng</option>
                    <option value={3}>3 tháng</option>
                    <option value={6}>6 tháng</option>
                    <option value={12}>12 tháng</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Hạn bảo trì tiếp theo</label>
                  <input
                    type="date"
                    value={editData.nextMaintenanceDate}
                    onChange={e => setEditData({ ...editData, nextMaintenanceDate: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-emerald-700"
                  />
                </div>
              </div>

              {/* Vendor & Performed By */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị thực hiện</label>
                  <input
                    type="text"
                    value={editData.vendor}
                    onChange={e => setEditData({ ...editData, vendor: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cán bộ thực hiện</label>
                  <input
                    type="text"
                    value={editData.performedBy}
                    onChange={e => setEditData({ ...editData, performedBy: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Plan Content */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nội dung bảo trì</label>
                <textarea
                  rows={2}
                  value={editData.planContent}
                  onChange={e => setEditData({ ...editData, planContent: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Result & Cost */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kết quả bảo trì</label>
                  <select
                    value={editData.result}
                    onChange={e => setEditData({ ...editData, result: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  >
                    <option value="PASS">✅ Đạt tiêu chuẩn / Tốt</option>
                    <option value="NEEDS_REPAIR">⚠️ Cần sửa chữa thêm</option>
                    <option value="PENDING">⏳ Đang thực hiện</option>
                    <option value="FAIL">❌ Không đạt</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Chi phí (đ)</label>
                  <input
                    type="number"
                    value={editData.cost}
                    onChange={e => setEditData({ ...editData, cost: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Kế hoạch số / QĐ số</label>
                  <input
                    type="text"
                    value={editData.decisionNumber}
                    onChange={e => setEditData({ ...editData, decisionNumber: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Acceptance Members & Funding Source */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Người nghiệm thu</label>
                  <input
                    type="text"
                    value={editData.acceptanceMembers}
                    onChange={e => setEditData({ ...editData, acceptanceMembers: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nguồn kinh phí</label>
                  <input
                    type="text"
                    value={editData.fundingSource}
                    onChange={e => setEditData({ ...editData, fundingSource: e.target.value })}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow transition cursor-pointer"
                >
                  Cập Nhật Kế Hoạch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. MODAL XEM CHI TIẾT & IN BIÊN BẢN BẢO DƯỠNG ĐỊNH KỲ (KHỔ A4)             */}
      {/* ========================================================================= */}
      {showDetailModal && detailRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-emerald-700 to-teal-800 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/15 rounded-xl backdrop-blur-sm">
                  <CalendarCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-base">Hồ Sơ Bảo Trì Định Kỳ: {detailRecord.asset?.assetCode}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      detailRecord.result === 'PASS' ? 'bg-emerald-500 text-white' :
                      detailRecord.result === 'NEEDS_REPAIR' ? 'bg-orange-500 text-white' :
                      detailRecord.result === 'PENDING' ? 'bg-blue-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                      {detailRecord.result === 'PASS' ? 'Đạt tiêu chuẩn' :
                       detailRecord.result === 'NEEDS_REPAIR' ? 'Cần sửa chữa' :
                       detailRecord.result === 'PENDING' ? 'Đang thực hiện' : 'Không đạt'}
                    </span>
                  </div>
                  <p className="text-xs text-emerald-100 truncate max-w-md">{detailRecord.asset?.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-white text-emerald-800 rounded-xl text-xs font-bold shadow hover:bg-emerald-50 transition cursor-pointer"
                  title="In biên bản bảo dưỡng ra máy in hoặc lưu PDF"
                >
                  <Printer className="w-4 h-4 text-emerald-700" /> In Biên Bản Này (A4)
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="p-1.5 hover:bg-white/20 rounded-xl transition text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Content Body */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-50">
              <div className="bg-white p-8 sm:p-10 rounded-2xl shadow-md border border-slate-200 font-serif text-slate-900 print:shadow-none print:border-none print:p-0 max-w-3xl mx-auto">
                <div className="flex justify-between items-start text-xs sm:text-sm font-sans mb-4 border-b border-slate-200 pb-4">
                  <div>
                    <div className="font-bold uppercase">TRUNG TÂM KIỂM SOÁT BỆNH TẬT TP ĐÀ NẴNG</div>
                    <div className="font-bold text-slate-700">KHOA DƯỢC - VẬT TƯ Y TẾ / TỔ KỸ THUẬT</div>
                    <div className="text-[11px] text-slate-500">Mã phiếu: BT-2026-{detailRecord.id.toString().padStart(4, '0')}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div className="italic text-xs">Độc lập - Tự do - Hạnh phúc</div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Đà Nẵng, ngày {detailRecord.maintenanceDate ? new Date(detailRecord.maintenanceDate).getDate() : new Date().getDate()} tháng {detailRecord.maintenanceDate ? new Date(detailRecord.maintenanceDate).getMonth() + 1 : new Date().getMonth() + 1} năm 2026
                    </div>
                  </div>
                </div>

                <div className="text-center my-5">
                  <h2 className="text-xl font-bold uppercase tracking-wide">
                    BIÊN BẢN BẢO DƯỠNG & KIỂM TRA ĐỊNH KỲ THIẾT BỊ
                  </h2>
                  <p className="text-xs italic text-slate-600 font-sans mt-0.5">
                    ({detailRecord.decisionNumber || 'Kế hoạch số 15/KH-TTKSBT về Bảo trì & Đảm bảo an toàn kỹ thuật trang thiết bị'})
                  </p>
                </div>

                <div className="space-y-4 font-sans text-xs">
                  {/* Phần I: Thông tin thiết bị */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-800 uppercase text-[11px] mb-2 text-emerald-800">
                      I. THÔNG TIN TRANG THIẾT BỊ BẢO DƯỠNG
                    </div>
                    <table className="w-full text-left border-collapse bg-white border border-slate-300">
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="p-2 font-bold w-1/3 bg-slate-100">Tên trang thiết bị:</td>
                          <td className="p-2 font-semibold text-slate-900">{detailRecord.asset?.name}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold bg-slate-100">Mã tài sản:</td>
                          <td className="p-2 font-mono font-bold text-emerald-700">{detailRecord.asset?.assetCode}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold bg-slate-100">Đơn vị quản lý sử dụng:</td>
                          <td className="p-2">
                            <b>{detailRecord.asset?.department?.name}</b>
                            {detailRecord.asset?.locationDetail && ` (Phòng: ${detailRecord.asset.locationDetail})`}
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold bg-slate-100">Cán bộ phụ trách máy:</td>
                          <td className="p-2">{detailRecord.asset?.assignedTo || 'Cán bộ khoa/phòng'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Phần II: Chi tiết bảo dưỡng */}
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="font-bold text-slate-800 uppercase text-[11px] mb-2 text-emerald-800">
                      II. NỘI DUNG & KẾT QUẢ BẢO DƯỠNG ĐỊNH KỲ
                    </div>
                    <table className="w-full text-left border-collapse bg-white border border-slate-300">
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="p-2 font-bold w-1/3 bg-slate-100">Ngày thực hiện:</td>
                          <td className="p-2 font-semibold">{new Date(detailRecord.maintenanceDate).toLocaleDateString('vi-VN')}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold bg-slate-100">Chu kỳ & Hạn tiếp theo:</td>
                          <td className="p-2">
                            <b>{detailRecord.cycleMonths || 6} tháng/lần</b> ➔ Hạn kế tiếp: <b className="text-emerald-700">{detailRecord.nextMaintenanceDate ? new Date(detailRecord.nextMaintenanceDate).toLocaleDateString('vi-VN') : '-'}</b>
                          </td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold bg-slate-100">Đơn vị / Cán bộ bảo trì:</td>
                          <td className="p-2">{detailRecord.vendor || detailRecord.performedBy || 'Tổ Kỹ thuật CDC'}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold bg-slate-100">Nội dung công việc:</td>
                          <td className="p-2 font-medium">{detailRecord.planContent || 'Vệ sinh, kiểm tra an toàn điện, hiệu chỉnh thông số kỹ thuật'}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold bg-slate-100">Tình trạng sau bảo dưỡng:</td>
                          <td className="p-2 font-bold text-emerald-700">{detailRecord.deviceStatusAfter || 'Hoạt động tốt, ổn định'}</td>
                        </tr>
                        <tr>
                          <td className="p-2 font-bold bg-slate-100">Chi phí & Nguồn kinh phí:</td>
                          <td className="p-2">
                            <span className="font-mono font-bold text-slate-900">{detailRecord.cost ? Number(detailRecord.cost).toLocaleString('vi-VN') + ' đ' : '0 đ'}</span>
                            <span className="text-slate-500 ml-2">({detailRecord.fundingSource || 'Nguồn thu sự nghiệp'})</span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  {/* Phần III: Kết luận */}
                  <div className="bg-emerald-50/60 p-3.5 rounded-xl border border-emerald-200">
                    <div className="font-bold text-emerald-900 uppercase text-[11px] mb-1">
                      III. ĐÁNH GIÁ & KẾT LUẬN
                    </div>
                    <p className="text-slate-800 font-medium">
                      Thiết bị đã được kiểm tra, bảo dưỡng kỹ thuật theo đúng quy trình. Kết quả: <b>{detailRecord.result === 'PASS' ? 'ĐẠT TIÊU CHUẨN VẬN HÀNH' : detailRecord.result === 'NEEDS_REPAIR' ? 'CẦN SỬA CHỮA THÊM' : 'CHƯA ĐẠT'}</b>. Bàn giao đơn vị tiếp tục sử dụng an toàn.
                    </p>
                  </div>
                </div>

                {/* Chữ ký 4 bên */}
                <div className="mt-8 grid grid-cols-4 text-center text-xs font-sans pt-6 border-t border-slate-300">
                  <div>
                    <div className="font-bold">CÁN BỘ BẢO DƯỠNG</div>
                    <div className="italic text-slate-500 text-[10px] mt-0.5">(Ký và ghi rõ họ tên)</div>
                    <div className="h-14"></div>
                    <div className="font-semibold">{detailRecord.performedBy || 'Kỹ sư bảo trì'}</div>
                  </div>

                  <div>
                    <div className="font-bold">NGƯỜI PHỤ TRÁCH MÁY</div>
                    <div className="italic text-slate-500 text-[10px] mt-0.5">(Ký và ghi rõ họ tên)</div>
                    <div className="h-14"></div>
                    <div className="font-semibold">{detailRecord.asset?.assignedTo || 'Cán bộ quản lý'}</div>
                  </div>

                  <div>
                    <div className="font-bold">TRƯỞNG BỘ PHẬN</div>
                    <div className="italic text-slate-500 text-[10px] mt-0.5">(Ký và ghi rõ họ tên)</div>
                    <div className="h-14"></div>
                    <div className="font-semibold">Khoa Dược / CNTT / TCHC</div>
                  </div>

                  <div>
                    <div className="font-bold">GIÁM ĐỐC TRUNG TÂM</div>
                    <div className="italic text-slate-500 text-[10px] mt-0.5">(Ký tên & đóng dấu)</div>
                    <div className="h-14"></div>
                    <div className="font-semibold">TS. BS. Nguyễn Đại Vĩnh</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
