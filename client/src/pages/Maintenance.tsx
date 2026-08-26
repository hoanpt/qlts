import React, { useState, useEffect } from 'react';
import { 
  Plus, Search, Filter, Wrench, AlertTriangle, CheckCircle, Clock, 
  XCircle, Printer, Building2, Monitor, Stethoscope, Layers, FileText,
  Calendar, DollarSign, User, Phone, CheckCircle2, ChevronRight, BarChart2, Users
} from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../lib/api';
import { MaintenanceRequest, Asset, Department, PRIORITY_LABELS } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function Maintenance() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'LIST' | 'REPORT'>('LIST');

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [unitFilter, setUnitFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');

  // Periodic Report Filter State
  const [reportPeriodType, setReportPeriodType] = useState<'MONTH' | 'QUARTER' | 'YEAR'>('MONTH');
  const [reportYear, setReportYear] = useState('2026');
  const [reportMonth, setReportMonth] = useState('1');
  const [reportQuarter, setReportQuarter] = useState('1');
  const [reportData, setReportData] = useState<any>(null);
  const [reportLoading, setReportLoading] = useState(false);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<MaintenanceRequest | null>(null);

  // Create Form State with Cascading Selections
  const [formData, setFormData] = useState({
    departmentId: user?.departmentId ? user.departmentId.toString() : '1',
    managingUnit: 'CNTT',
    assetId: '',
    requestedBy: user?.fullName || '',
    contactPhone: '',
    locationDetail: '',
    issueDescription: '',
    priority: 'MEDIUM'
  });

  // Process / Update Form State
  const [processData, setProcessData] = useState({
    status: 'IN_PROGRESS',
    technicianName: '',
    repairCost: '',
    repairVendor: '',
    repairNote: '',
    fundingSource: 'Nguồn thu dịch vụ y tế',
    decisionNumber: '',
    servicePackage: '',
    replacementParts: '',
    acceptanceMembers: ''
  });

  // Signatures configuration for Report
  const [showSignaturesModal, setShowSignaturesModal] = useState(false);
  const [signatures, setSignatures] = useState(() => {
    const saved = localStorage.getItem('maintenance_report_signatures');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      reporterTitle: 'NGƯỜI LẬP BÁO CÁO',
      reporterName: user?.fullName || 'Cán bộ quản lý',
      techTitle: user?.role === 'MANAGER_CNTT' ? 'TỔ TRƯỞNG TỔ CNTT' :
                 user?.role === 'MANAGER_DUOC' ? 'TRƯỞNG KHOA DƯỢC - VTYT' :
                 user?.role === 'MANAGER_TCHC' ? 'TRƯỞNG PHÒNG TỔ CHỨC - HÀNH CHÍNH' : 'PHỤ TRÁCH ĐƠN VỊ KỸ THUẬT',
      techName: user?.role === 'MANAGER_CNTT' ? 'KTV. Phan Thanh Hoàn' :
                user?.role === 'MANAGER_DUOC' ? 'DS. Trưởng Khoa Dược' :
                user?.role === 'MANAGER_TCHC' ? 'Trưởng phòng TCHC' : 'Trưởng bộ phận kỹ thuật',
      directorTitle: 'GIÁM ĐỐC / BAN GIÁM ĐỐC',
      directorName: 'Ông. Nguyễn Đại Vĩnh'
    };
  });

  const handleSaveSignatures = (newSigs: typeof signatures) => {
    setSignatures(newSigs);
    localStorage.setItem('maintenance_report_signatures', JSON.stringify(newSigs));
    setShowSignaturesModal(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [reqRes, assetRes, deptRes] = await Promise.allSettled([
        apiGet('/maintenance'),
        apiGet('/assets?limit=1000'),
        apiGet('/departments')
      ]);

      if (reqRes.status === 'fulfilled' && Array.isArray(reqRes.value)) setRequests(reqRes.value);
      if (assetRes.status === 'fulfilled' && assetRes.value?.assets) setAssets(assetRes.value.assets);
      if (deptRes.status === 'fulfilled' && Array.isArray(deptRes.value)) setDepartments(deptRes.value);
    } catch (error) {
      console.error('Error loading maintenance data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Load periodic report data
  const loadReportData = async () => {
    setReportLoading(true);
    try {
      let url = `/maintenance/stats/periodic?year=${reportYear}`;
      if (reportPeriodType === 'MONTH') url += `&month=${reportMonth}`;
      if (reportPeriodType === 'QUARTER') url += `&quarter=${reportQuarter}`;
      const data = await apiGet(url);
      setReportData(data);
    } catch (e) {
      console.error('Error fetching report:', e);
    } finally {
      setReportLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'REPORT') {
      loadReportData();
    }
  }, [activeTab, reportPeriodType, reportYear, reportMonth, reportQuarter]);

  // Filter available assets based on chosen Department AND Managing Unit
  const departmentAssets = assets
    .filter(a => {
      const deptMatch = a.departmentId.toString() === formData.departmentId;
      const unitMatch = (a as any).managingUnit === formData.managingUnit || 
        (formData.managingUnit === 'CNTT' && a.categoryId === 2) ||
        (formData.managingUnit === 'DUOC' && a.categoryId === 1) ||
        (formData.managingUnit === 'TCHC' && (a.categoryId === 3 || a.categoryId === 4));
      return deptMatch && unitMatch;
    })
    .sort((a, b) => (a.assetCode || '').localeCompare(b.assetCode || '', undefined, { numeric: true, sensitivity: 'base' }));

  // Handle Create Request
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.assetId || !formData.requestedBy || !formData.issueDescription) {
      alert('Vui lòng điền đủ: Khoa/phòng, Thiết bị hỏng, Người báo hỏng và Mô tả sự cố!');
      return;
    }

    try {
      await apiPost('/maintenance', formData);
      setShowCreateModal(false);
      setFormData({
        departmentId: user?.departmentId ? user.departmentId.toString() : '1',
        managingUnit: 'CNTT',
        assetId: '',
        requestedBy: user?.fullName || '',
        contactPhone: '',
        locationDetail: '',
        issueDescription: '',
        priority: 'MEDIUM'
      });
      loadData();
      alert('Đã gửi phiếu yêu cầu sửa chữa đến đơn vị quản lý chuyên trách thành công!');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi tạo yêu cầu sửa chữa');
    }
  };

  // Open Process Modal
  const handleOpenProcess = (req: MaintenanceRequest) => {
    setSelectedRequest(req);
    setProcessData({
      status: req.status === 'PENDING' ? 'IN_PROGRESS' : req.status,
      technicianName: req.technicianName || user?.fullName || '',
      repairCost: req.repairCost ? req.repairCost.toString() : '',
      repairVendor: req.repairVendor || '',
      repairNote: req.repairNote || '',
      fundingSource: req.fundingSource || 'Nguồn thu dịch vụ y tế',
      decisionNumber: req.decisionNumber || '',
      servicePackage: req.servicePackage || '',
      replacementParts: req.replacementParts || '',
      acceptanceMembers: req.acceptanceMembers || ''
    });
    setShowProcessModal(true);
  };

  // Submit Process / Status update
  const handleProcessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      await apiPut(`/maintenance/${selectedRequest.id}/process`, processData);
      setShowProcessModal(false);
      loadData();
      alert('Đã cập nhật tiến độ xử lý và đồng bộ lịch sử thiết bị thành công!');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi cập nhật phiếu');
    }
  };

  // Filter requests
  const filteredRequests = requests.filter(r => {
    const searchMatch = !search || 
      r.asset?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.asset?.assetCode?.toLowerCase().includes(search.toLowerCase()) ||
      r.requestedBy?.toLowerCase().includes(search.toLowerCase()) ||
      r.issueDescription?.toLowerCase().includes(search.toLowerCase());

    const statusMatch = statusFilter === 'ALL' || r.status === statusFilter;
    const priorityMatch = priorityFilter === 'ALL' || r.priority === priorityFilter;
    const unitMatch = unitFilter === 'ALL' || (r as any).managingUnit === unitFilter || (r.asset as any)?.managingUnit === unitFilter;
    const deptMatch = deptFilter === 'ALL' || r.departmentId.toString() === deptFilter;

    return searchMatch && statusMatch && priorityMatch && unitMatch && deptMatch;
  });

  // Calculate Statistics
  const totalCount = requests.length;
  const pendingCount = requests.filter(r => r.status === 'PENDING').length;
  const inProgressCount = requests.filter(r => r.status === 'IN_PROGRESS').length;
  const completedCount = requests.filter(r => r.status === 'COMPLETED').length;
  const totalCost = requests.reduce((sum, r) => sum + (r.repairCost || 0), 0);

  return (
    <div className="space-y-6 pb-16">
      {/* 1. TOP HEADER */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Quy trình điều phối & báo cáo</span>
            <h1 className="text-2xl font-bold text-slate-900">Báo Hỏng & Sửa Chữa Thiết Bị</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Khoa/Phòng báo hỏng ➔ Điều phối về **Khoa Dược / Tổ CNTT / Phòng TCHC** ➔ Xử lý & Báo cáo định kỳ
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab(activeTab === 'LIST' ? 'REPORT' : 'LIST')}
            className={`flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold rounded-xl border transition cursor-pointer ${
              activeTab === 'REPORT' 
                ? 'bg-purple-50 border-purple-300 text-purple-800' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <BarChart2 className="w-4 h-4 text-purple-600" /> 
            {activeTab === 'REPORT' ? 'Quay lại danh sách' : 'Báo Cáo Tháng / Quý / Năm'}
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Báo Hỏng / Sửa Chữa Mới
          </button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="print:hidden grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng số ca</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{totalCount}</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-xs">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Chờ tiếp nhận</div>
          <div className="text-xl font-bold text-amber-800 mt-1">{pendingCount}</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-blue-200 bg-blue-50/40 shadow-xs">
          <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Đang xử lý</div>
          <div className="text-xl font-bold text-blue-800 mt-1">{inProgressCount}</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Đã hoàn thành</div>
          <div className="text-xl font-bold text-emerald-800 mt-1">{completedCount}</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Tổng kinh phí</div>
          <div className="text-sm font-bold text-purple-900 mt-1.5">{Number(totalCost).toLocaleString('vi-VN')} đ</div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. TAB 1: DANH SÁCH YÊU CẦU BÁO HỎNG & TIẾP NHẬN XỬ LÝ                     */}
      {/* ========================================================================= */}
      {activeTab === 'LIST' && (
        <div className="print:hidden bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Filters bar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={unitFilter}
                onChange={e => setUnitFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ALL">-- Đơn vị tiếp nhận (Tất cả) --</option>
                <option value="DUOC">Khoa Dược (TBYT)</option>
                <option value="CNTT">Tổ CNTT</option>
                <option value="TCHC">Phòng TCHC</option>
              </select>

              <select
                value={deptFilter}
                onChange={e => setDeptFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ALL">-- Khoa / Phòng gửi yêu cầu --</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ALL">-- Trạng thái --</option>
                <option value="PENDING">Chờ tiếp nhận</option>
                <option value="IN_PROGRESS">Đang xử lý</option>
                <option value="COMPLETED">Đã hoàn thành</option>
                <option value="REJECTED">Từ chối</option>
              </select>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm mã thiết bị, người báo, sự cố..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none w-56 sm:w-64"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Mã TB</th>
                  <th className="p-3.5 min-w-[160px]">Tên thiết bị</th>
                  <th className="p-3.5">Khoa / Phòng yêu cầu</th>
                  <th className="p-3.5">Người báo & SĐT</th>
                  <th className="p-3.5">Đơn vị nhận</th>
                  <th className="p-3.5 min-w-[180px]">Mô tả sự cố & Vị trí</th>
                  <th className="p-3.5">Ưu tiên</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5 text-right">Chi phí (đ)</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={10} className="text-center py-12 text-slate-400">Đang tải danh sách...</td></tr>
                ) : filteredRequests.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-slate-400">Chưa có phiếu báo hỏng nào phù hợp.</td></tr>
                ) : (
                  filteredRequests.map(r => (
                    <tr key={r.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-mono font-bold text-blue-700">{r.asset?.assetCode}</td>
                      <td className="p-3.5 font-bold text-slate-900">{r.asset?.name}</td>
                      <td className="p-3.5 text-slate-700 font-medium">{r.department?.name || 'CDC'}</td>
                      <td className="p-3.5">
                        <div className="font-semibold text-slate-800">{r.requestedBy}</div>
                        {r.contactPhone && <div className="text-[11px] text-slate-500 font-mono">{r.contactPhone}</div>}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          (r as any).managingUnit === 'DUOC' ? 'bg-emerald-100 text-emerald-800' :
                          (r as any).managingUnit === 'CNTT' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {(r as any).managingUnit === 'DUOC' ? 'Khoa Dược' :
                           (r as any).managingUnit === 'CNTT' ? 'Tổ CNTT' : 'Phòng TCHC'}
                        </span>
                      </td>
                      <td className="p-3.5 max-w-xs">
                        <div className="text-slate-900 font-medium line-clamp-2">{r.issueDescription}</div>
                        {r.locationDetail && <div className="text-[10px] text-slate-500 italic mt-0.5">Vị trí: {r.locationDetail}</div>}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                          r.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                          r.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {PRIORITY_LABELS[r.priority] || r.priority}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          r.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          r.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          r.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {r.status === 'COMPLETED' ? 'Đã hoàn thành' :
                           r.status === 'IN_PROGRESS' ? 'Đang xử lý' :
                           r.status === 'REJECTED' ? 'Từ chối' : 'Chờ tiếp nhận'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-slate-800">
                        {r.repairCost ? Number(r.repairCost).toLocaleString('vi-VN') : '-'}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleOpenProcess(r)}
                          className="px-3 py-1 bg-slate-100 hover:bg-blue-600 hover:text-white text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                        >
                          Xử lý / Cập nhật
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB 2: BÁO CÁO TÌNH HÌNH BÁO HỎNG & SỬA CHỮA (THÁNG / QUÝ / NĂM)        */}
      {/* ========================================================================= */}
      {activeTab === 'REPORT' && (
        <div className="space-y-6">
          {/* Period Selectors */}
          <div className="print:hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  onClick={() => setReportPeriodType('MONTH')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    reportPeriodType === 'MONTH' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Theo Tháng
                </button>
                <button
                  onClick={() => setReportPeriodType('QUARTER')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    reportPeriodType === 'QUARTER' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Theo Quý
                </button>
                <button
                  onClick={() => setReportPeriodType('YEAR')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition cursor-pointer ${
                    reportPeriodType === 'YEAR' ? 'bg-white shadow text-blue-700' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Cả Năm
                </button>
              </div>

              {reportPeriodType === 'MONTH' && (
                <select
                  value={reportMonth}
                  onChange={e => setReportMonth(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                    <option key={m} value={m}>Tháng {m}</option>
                  ))}
                </select>
              )}

              {reportPeriodType === 'QUARTER' && (
                <select
                  value={reportQuarter}
                  onChange={e => setReportQuarter(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white"
                >
                  <option value="1">Quý I (Tháng 1 - 3)</option>
                  <option value="2">Quý II (Tháng 4 - 6)</option>
                  <option value="3">Quý III (Tháng 7 - 9)</option>
                  <option value="4">Quý IV (Tháng 10 - 12)</option>
                </select>
              )}

              <select
                value={reportYear}
                onChange={e => setReportYear(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-xl text-xs font-bold bg-white font-mono"
              >
                <option value="2026">Năm 2026</option>
                <option value="2025">Năm 2025</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSignaturesModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Tùy chỉnh chức danh và họ tên người ký dưới báo cáo"
              >
                <Users className="w-4 h-4 text-blue-600" /> Cấu hình Người ký
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
              >
                <Printer className="w-4 h-4" /> In Báo Cáo A4
              </button>
            </div>
          </div>

          {/* PRINTABLE REPORT A4 */}
          <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-md border border-slate-200 font-serif text-slate-900 print:shadow-none print:border-none print:p-0">
            {/* Report Header */}
            <div className="flex justify-between items-start text-xs sm:text-sm font-sans mb-6">
              <div>
                <div className="font-bold uppercase">TRUNG TÂM KIỂM SOÁT BỆNH TẬT TP ĐÀ NẴNG</div>
                <div className="text-slate-600">BỘ PHẬN QUẢN LÝ TRANG THIẾT BỊ</div>
              </div>
              <div className="text-right">
                <div className="font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="italic text-xs">Độc lập - Tự do - Hạnh phúc</div>
              </div>
            </div>

            <div className="text-center my-6">
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide">
                BÁO CÁO TỔNG HỢP TÌNH HÌNH BÁO HỎNG & SỬA CHỮA THIẾT BỊ
              </h2>
              <p className="text-xs sm:text-sm italic text-slate-600 mt-1 font-sans">
                Kỳ báo cáo: {
                  reportPeriodType === 'MONTH' ? `Tháng ${reportMonth}/${reportYear}` :
                  reportPeriodType === 'QUARTER' ? `Quý ${reportQuarter} Năm ${reportYear}` :
                  `Cả Năm ${reportYear}`
                }
              </p>
            </div>

            {/* KPI Summary Row */}
            <div className="grid grid-cols-4 gap-3 font-sans text-xs mb-6 text-center">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-slate-500 font-medium">Tổng số ca báo hỏng</div>
                <div className="text-lg font-bold text-slate-900 mt-0.5">{reportData?.summary?.total || 0}</div>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                <div className="text-emerald-700 font-medium">Đã hoàn thành sửa</div>
                <div className="text-lg font-bold text-emerald-900 mt-0.5">{reportData?.summary?.completed || 0}</div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="text-blue-700 font-medium">Đang trong tiến trình</div>
                <div className="text-lg font-bold text-blue-900 mt-0.5">{reportData?.summary?.inProgress || 0}</div>
              </div>
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl">
                <div className="text-purple-700 font-medium">Tổng kinh phí thực hiện</div>
                <div className="text-base font-bold text-purple-900 mt-0.5">
                  {reportData?.summary?.totalCost ? Number(reportData.summary.totalCost).toLocaleString('vi-VN') : 0} đ
                </div>
              </div>
            </div>

            {/* 1. Tổng hợp theo Đơn vị chuyên trách tiếp nhận */}
            <div className="font-sans text-xs mb-6">
              <h4 className="font-bold text-sm uppercase text-slate-900 mb-2">1. Tổng hợp theo Khối Quản lý tiếp nhận & xử lý</h4>
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2.5">Đơn vị chuyên trách</th>
                      <th className="p-2.5 text-center">Số ca báo hỏng</th>
                      <th className="p-2.5 text-center">Đã sửa xong</th>
                      <th className="p-2.5 text-right">Tổng chi phí sửa chữa (đ)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData?.byUnit?.map((u: any, idx: number) => (
                      <tr key={idx}>
                        <td className="p-2.5 font-bold text-slate-900">{u.name}</td>
                        <td className="p-2.5 text-center font-bold">{u.count}</td>
                        <td className="p-2.5 text-center text-emerald-700 font-bold">{u.completed}</td>
                        <td className="p-2.5 text-right font-mono font-bold">{Number(u.cost).toLocaleString('vi-VN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 2. Chi tiết từng ca báo hỏng */}
            <div className="font-sans text-xs mb-8">
              <h4 className="font-bold text-sm uppercase text-slate-900 mb-2">2. Danh sách chi tiết các sự cố thiết bị</h4>
              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300 text-center">
                    <tr>
                      <th className="p-2 w-8">STT</th>
                      <th className="p-2 text-left">Mã & Tên thiết bị</th>
                      <th className="p-2 text-left">Khoa / Phòng yêu cầu</th>
                      <th className="p-2 text-left min-w-[160px]">Nội dung sự cố & Khắc phục</th>
                      <th className="p-2 text-left">Kỹ thuật viên</th>
                      <th className="p-2 text-right">Kinh phí (đ)</th>
                      <th className="p-2">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {reportData?.records?.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-6 text-slate-400">Không có dữ liệu trong kỳ này.</td></tr>
                    ) : (
                      reportData?.records?.map((r: any, idx: number) => (
                        <tr key={r.id}>
                          <td className="p-2 text-center text-slate-500">{idx + 1}</td>
                          <td className="p-2">
                            <div className="font-bold text-slate-900">{r.asset?.name}</div>
                            <div className="font-mono text-[10px] text-blue-700">{r.asset?.assetCode}</div>
                          </td>
                          <td className="p-2 font-medium">{r.department?.name || 'CDC'}</td>
                          <td className="p-2">
                            <div className="text-slate-800">{r.issueDescription}</div>
                            {r.repairNote && <div className="text-[10px] text-emerald-700 italic mt-0.5">Xử lý: {r.repairNote}</div>}
                          </td>
                          <td className="p-2 font-medium">{r.technicianName || '-'}</td>
                          <td className="p-2 text-right font-mono font-bold">
                            {r.repairCost ? Number(r.repairCost).toLocaleString('vi-VN') : '-'}
                          </td>
                          <td className="p-2 text-center font-bold">
                            {r.status === 'COMPLETED' ? <span className="text-emerald-700">Đã sửa xong</span> :
                             r.status === 'IN_PROGRESS' ? <span className="text-blue-700">Đang sửa</span> :
                             <span className="text-amber-700">Chờ sửa</span>}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Report Signatures */}
            <div className="font-sans text-xs sm:text-sm pt-4">
              <div className="text-right italic mb-4">Đà Nẵng, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</div>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="font-bold uppercase text-slate-900">{signatures.reporterTitle}</div>
                  <div className="text-[11px] italic text-slate-500 mb-20">(Ký, ghi rõ họ tên)</div>
                  <div className="font-bold text-slate-800">{signatures.reporterName}</div>
                </div>

                <div>
                  <div className="font-bold uppercase text-slate-900">{signatures.techTitle}</div>
                  <div className="text-[11px] italic text-slate-500 mb-20">(Ký, ghi rõ họ tên)</div>
                  <div className="font-bold text-slate-800">{signatures.techName}</div>
                </div>

                <div>
                  <div className="font-bold uppercase text-slate-900">{signatures.directorTitle}</div>
                  <div className="text-[11px] italic text-slate-500 mb-20">(Ký, đóng dấu)</div>
                  <div className="font-bold text-slate-800">{signatures.directorName}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: TẠO YÊU CẦU BÁO HỎNG / SỬA CHỮA MỚI (KHOA / PHÒNG GỬI)            */}
      {/* ========================================================================= */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Phiếu Báo Hỏng & Đề Nghị Sửa Chữa Thiết Bị</h3>
                <p className="text-xs text-slate-500 mt-0.5">Khoa/Phòng gửi trực tiếp đến đơn vị kỹ thuật phụ trách</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-3.5 text-xs">
              {/* Row 1: Khoa/Phòng + Khối Tiếp Nhận */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Khoa / Phòng yêu cầu (*)</label>
                  <select
                    required
                    value={formData.departmentId}
                    onChange={e => setFormData({ ...formData, departmentId: e.target.value, assetId: '' })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.code} - {d.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Loại thiết bị / Đơn vị tiếp nhận (*)</label>
                  <select
                    required
                    value={formData.managingUnit}
                    onChange={e => setFormData({ ...formData, managingUnit: e.target.value, assetId: '' })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-blue-50/50 text-blue-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="CNTT">💻 Thiết bị CNTT (Tổ CNTT tiếp nhận)</option>
                    <option value="DUOC">🩺 Trang thiết bị Y tế (Khoa Dược tiếp nhận)</option>
                    <option value="TCHC">🏢 Hành chính & Tòa nhà (Phòng TCHC tiếp nhận)</option>
                  </select>
                </div>
              </div>

              {/* Row 2: Chọn thiết bị đã map */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="font-bold text-slate-700 uppercase">Chọn thiết bị hư hỏng (*)</label>
                  <span className="text-[11px] text-blue-600 font-medium">({departmentAssets.length} thiết bị phù hợp)</span>
                </div>
                <select
                  required
                  value={formData.assetId}
                  onChange={e => {
                    const sel = departmentAssets.find(a => a.id.toString() === e.target.value);
                    setFormData({
                      ...formData,
                      assetId: e.target.value,
                      locationDetail: sel?.locationDetail || ''
                    });
                  }}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                >
                  <option value="">-- Chọn thiết bị trong danh mục của Khoa --</option>
                  {departmentAssets.map(a => (
                    <option key={a.id} value={a.id}>
                      [{a.assetCode}] {a.name} {a.assignedTo ? `(Người SD: ${a.assignedTo})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Row 3: Người báo hỏng + SĐT */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Họ tên người báo hỏng (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: BS. Nguyễn Văn A..."
                    value={formData.requestedBy}
                    onChange={e => setFormData({ ...formData, requestedBy: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Số điện thoại liên hệ</label>
                  <input
                    type="text"
                    placeholder="0905 xxx xxx"
                    value={formData.contactPhone}
                    onChange={e => setFormData({ ...formData, contactPhone: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Row 4: Vị trí cụ thể + Mức độ ưu tiên */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Vị trí phòng máy cụ thể</label>
                  <input
                    type="text"
                    placeholder="Phòng 204 (Tầng 2), Khu xét nghiệm..."
                    value={formData.locationDetail}
                    onChange={e => setFormData({ ...formData, locationDetail: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Mức độ ưu tiên (*)</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none font-bold"
                  >
                    <option value="LOW">Thấp (Có thể chờ lịch bảo trì)</option>
                    <option value="MEDIUM">Trung bình (Ảnh hưởng công việc thông thường)</option>
                    <option value="HIGH">Cao (Máy phục vụ tiếp đón / khám bệnh)</option>
                    <option value="URGENT">Khẩn cấp (Ngừng trệ xét nghiệm / cấp cứu)</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Mô tả sự cố */}
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Mô tả chi tiết tình trạng hư hỏng (*)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Mô tả cụ thể: Không lên nguồn, quạt kêu to, kẹt giấy, màn hình sọc, máy xét nghiệm báo lỗi cảm biến..."
                  value={formData.issueDescription}
                  onChange={e => setFormData({ ...formData, issueDescription: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" /> Gửi Yêu Cầu Sửa Chữa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: TIẾP NHẬN & XỬ LÝ SỬA CHỮA (KỸ THUẬT VIÊN / QUẢN LÝ)             */}
      {/* ========================================================================= */}
      {showProcessModal && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Tiếp Nhận & Xử Lý Sự Cố Thiết Bị</h3>
                <p className="text-xs text-slate-500 mt-0.5">[{selectedRequest.asset?.assetCode}] {selectedRequest.asset?.name}</p>
              </div>
              <button onClick={() => setShowProcessModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
            </div>

            {/* Request Summary Box */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
              <div><strong>Khoa/Phòng:</strong> {selectedRequest.department?.name}</div>
              <div><strong>Người báo hỏng:</strong> {selectedRequest.requestedBy} {selectedRequest.contactPhone ? `(${selectedRequest.contactPhone})` : ''}</div>
              <div><strong>Hiện trạng sự cố:</strong> <span className="text-red-700 font-medium">{selectedRequest.issueDescription}</span></div>
            </div>

            <form onSubmit={handleProcessSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Cập nhật trạng thái xử lý (*)</label>
                <select
                  value={processData.status}
                  onChange={e => setProcessData({ ...processData, status: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="IN_PROGRESS">🔄 Đang xử lý / Đang sửa chữa</option>
                  <option value="COMPLETED">✅ Đã hoàn thành (Thiết bị hoạt động bình thường)</option>
                  <option value="REJECTED">❌ Từ chối / Chuyển đề xuất thanh lý</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Cán bộ kỹ thuật tiếp nhận / xử lý (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: KS. Phan Thanh Hoàn (Tổ CNTT)..."
                  value={processData.technicianName}
                  onChange={e => setProcessData({ ...processData, technicianName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Quyết định số / Phê duyệt</label>
                  <input
                    type="text"
                    placeholder="QĐ số 12/QĐ-TTKSBT..."
                    value={processData.decisionNumber}
                    onChange={e => setProcessData({ ...processData, decisionNumber: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Nguồn kinh phí thực hiện</label>
                  <select
                    value={processData.fundingSource}
                    onChange={e => setProcessData({ ...processData, fundingSource: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  >
                    <option value="Nguồn thu dịch vụ y tế">Nguồn thu dịch vụ y tế</option>
                    <option value="Nguồn ngân sách nhà nước cấp">Nguồn ngân sách nhà nước cấp</option>
                    <option value="Quỹ phát triển hoạt động sự nghiệp">Quỹ phát triển hoạt động sự nghiệp</option>
                    <option value="Nguồn dự án / Viện trợ">Nguồn dự án / Viện trợ</option>
                    <option value="Nguồn chi thường xuyên">Nguồn chi thường xuyên</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Chi phí sửa chữa (đ)</label>
                  <input
                    type="number"
                    placeholder="0"
                    value={processData.repairCost}
                    onChange={e => setProcessData({ ...processData, repairCost: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Đơn vị / Hãng sửa chữa</label>
                  <input
                    type="text"
                    placeholder="Tự sửa / Tên nhà cung cấp..."
                    value={processData.repairVendor}
                    onChange={e => setProcessData({ ...processData, repairVendor: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Linh kiện thay thế</label>
                  <input
                    type="text"
                    placeholder="Nguồn, RAM, Ổ cứng SSD, Sensor..."
                    value={processData.replacementParts}
                    onChange={e => setProcessData({ ...processData, replacementParts: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Thành phần nghiệm thu</label>
                  <input
                    type="text"
                    placeholder="Người dùng, Kỹ thuật viên, Phòng TCKT..."
                    value={processData.acceptanceMembers}
                    onChange={e => setProcessData({ ...processData, acceptanceMembers: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Nội dung công việc & Kết quả nghiệm thu</label>
                <textarea
                  rows={3}
                  placeholder="Ghi rõ linh kiện đã thay thế, giải pháp xử lý, tình trạng máy sau khi sửa..."
                  value={processData.repairNote}
                  onChange={e => setProcessData({ ...processData, repairNote: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowProcessModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Lưu Cập Nhật Tiến Độ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TÙY CHỈNH CHỮ KÝ VÀ NGƯỜI KÝ DƯỚI BÁO CÁO                         */}
      {/* ========================================================================= */}
      {showSignaturesModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Cấu Hình Người Ký Báo Cáo Sửa Chữa</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tùy chỉnh chức danh & họ tên in dưới chân trang báo cáo</p>
              </div>
              <button onClick={() => setShowSignaturesModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleSaveSignatures(signatures);
              }}
              className="space-y-4 text-xs"
            >
              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 mr-1">Gợi ý nhanh:</span>
                <button
                  type="button"
                  onClick={() => setSignatures({
                    ...signatures,
                    techTitle: 'TỔ TRƯỞNG TỔ CNTT',
                    techName: 'KTV. Phan Thanh Hoàn'
                  })}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold text-[11px] hover:bg-blue-200 cursor-pointer"
                >
                  💻 Khối CNTT
                </button>
                <button
                  type="button"
                  onClick={() => setSignatures({
                    ...signatures,
                    techTitle: 'TRƯỞNG KHOA DƯỢC - VTYT',
                    techName: 'DS. Trưởng Khoa Dược'
                  })}
                  className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[11px] hover:bg-emerald-200 cursor-pointer"
                >
                  🩺 Khối Dược (TBYT)
                </button>
                <button
                  type="button"
                  onClick={() => setSignatures({
                    ...signatures,
                    techTitle: 'TRƯỞNG PHÒNG TỔ CHỨC - HÀNH CHÍNH',
                    techName: 'Trưởng phòng TCHC'
                  })}
                  className="px-2 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold text-[11px] hover:bg-amber-200 cursor-pointer"
                >
                  🏢 Khối TCHC
                </button>
              </div>

              {/* 1. Người lập */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">1. Vị trí Bên Trái (Người lập báo cáo)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Chức danh</label>
                    <input
                      type="text"
                      value={signatures.reporterTitle}
                      onChange={e => setSignatures({ ...signatures, reporterTitle: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Họ và tên</label>
                    <input
                      type="text"
                      value={signatures.reporterName}
                      onChange={e => setSignatures({ ...signatures, reporterName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Đơn vị kỹ thuật */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">2. Vị trí Ở Giữa (Phụ trách đơn vị kỹ thuật)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Chức danh</label>
                    <input
                      type="text"
                      value={signatures.techTitle}
                      onChange={e => setSignatures({ ...signatures, techTitle: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Họ và tên</label>
                    <input
                      type="text"
                      value={signatures.techName}
                      onChange={e => setSignatures({ ...signatures, techName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Ban Giám Đốc */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">3. Vị trí Bên Phải (Ban Giám Đốc phê duyệt)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Chức danh</label>
                    <input
                      type="text"
                      value={signatures.directorTitle}
                      onChange={e => setSignatures({ ...signatures, directorTitle: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Họ và tên</label>
                    <input
                      type="text"
                      value={signatures.directorName}
                      onChange={e => setSignatures({ ...signatures, directorName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSignaturesModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Lưu Cấu Hình Người Ký
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
