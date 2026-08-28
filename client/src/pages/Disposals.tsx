import React, { useState, useEffect } from 'react';
import { 
  Plus, Printer, Trash2, CheckCircle2, XCircle, AlertTriangle, 
  Search, FileText, Download, Users, RefreshCw, Send, ClipboardCheck,
  Building2, Monitor, Stethoscope, Layers, ChevronRight, Bell, Calendar,
  CheckCircle, ArrowRight, CheckSquare, Square
} from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Asset, CommitteeMember, Department } from '../types';

export default function Disposals() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'CAMPAIGNS' | 'PROPOSALS' | 'INSPECTIONS' | 'BOARD_MEETING'>('PROPOSALS');
  
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [disposals, setDisposals] = useState<any[]>([]);
  const [candidateAssets, setCandidateAssets] = useState<Asset[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const defaultUnit = 
    user?.role === 'MANAGER_CNTT' ? 'CNTT' :
    user?.role === 'MANAGER_DUOC' ? 'DUOC' :
    user?.role === 'MANAGER_TCHC' ? 'TCHC' : 'ALL';

  const defaultDept = user?.role === 'DEPARTMENT' && user.departmentId ? user.departmentId.toString() : 'ALL';

  const [selectedManagingUnit, setSelectedManagingUnit] = useState<string>(defaultUnit);
  const [selectedDeptId, setSelectedDeptId] = useState<string>(defaultDept);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Modals state
  const [showCreateProposalModal, setShowCreateProposalModal] = useState(false);
  const [showInspectionModal, setShowInspectionModal] = useState(false);
  const [showCreateCampaignModal, setShowCreateCampaignModal] = useState(false);
  const [selectedDisposal, setSelectedDisposal] = useState<any>(null);

  // Proposal form & multi-select state
  const [proposalData, setProposalData] = useState({
    proposedBy: user?.fullName || '',
    reason: 'Thiết bị hư hỏng nặng, linh kiện hao mòn chập cháy, không thể phục hồi, chi phí sửa chữa không hiệu quả kinh tế',
    campaignName: 'Thông báo rà soát & lập danh mục đề xuất thanh lý tài sản Đợt 1 năm 2026'
  });
  const [selectedAssetIds, setSelectedAssetIds] = useState<number[]>([]);
  const [modalAssetSearch, setModalAssetSearch] = useState<string>('');
  const [modalUnitFilter, setModalUnitFilter] = useState<string>('ALL');

  // Inspection form state
  const [inspectionData, setInspectionData] = useState({
    technicalAssessment: 'Thiết bị đã qua nhiều năm sử dụng, linh kiện hao mòn, bo mạch chính chập cháy hỏng nặng, không có linh kiện thay thế, chi phí sửa chữa không hiệu quả kinh tế.',
    technicalInspector: 'Ông. Phan Thanh Hoàn (Tổ CNTT)',
    decisionNumber: 'QĐ số 45/QĐ-TTKSBT',
    fundingSource: 'Nộp ngân sách nhà nước / Quỹ PTHĐSN',
    disposalMethod: 'Bán phế liệu thu hồi',
    disposalPrice: '500000',
    note: 'Đề nghị Hội đồng thanh lý xem xét cho tiêu hủy / bán phế liệu theo quy định.'
  });

  // Campaign form state
  const [campaignForm, setCampaignForm] = useState({
    title: 'Thông báo rà soát & lập danh mục đề xuất thanh lý tài sản, CCDC Đợt 1 năm 2026',
    campaignCode: 'TB-TL-2026-01',
    endDate: '2026-03-31',
    description: 'Đề nghị các Khoa/Phòng trực thuộc tiến hành kiểm tra, rà soát toàn bộ tài sản, máy móc, trang thiết bị y tế, thiết bị CNTT, CCDC bị hư hỏng không thể phục hồi để lập báo cáo đề xuất gửi về đơn vị chuyên trách (Khoa Dược, Tổ CNTT, Phòng TCHC).'
  });

  // Signatures configuration for Disposals & Board Meeting
  const [showDisposalSignaturesModal, setShowDisposalSignaturesModal] = useState(false);
  const [disposalSignatures, setDisposalSignatures] = useState(() => {
    const saved = localStorage.getItem('disposal_signatures');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      meetingDate: '15 tháng 01 năm 2026',
      decisionNumber: 'QĐ số 45/QĐ-TTKSBT ngày 20/02/2026',
      fundingSource: 'Tiền thu thanh lý nộp Quỹ phát triển hoạt động sự nghiệp / Ngân sách Nhà nước',
      presidentTitle: 'CHỦ TỊCH HỘI ĐỒNG',
      presidentName: 'Ông. Nguyễn Đại Vĩnh',
      memberTcktTitle: 'ỦY VIÊN TÀI CHÍNH',
      memberTcktName: 'Ông. Hồ Phú Quảng',
      memberTechTitle: 'ỦY VIÊN KỸ THUẬT',
      memberTechName: 'Ông. Phan Thanh Hoàn (Tổ CNTT) / Bà. Mai Thị Tính (Khoa Dược)',
      memberDeptTitle: 'ĐẠI DIỆN KHOA / PHÒNG',
      memberDeptName: 'Trưởng / Phó Đơn vị',
      inspectorTitle: 'CÁN BỘ KIỂM TRA KỸ THUẬT',
      inspectorName: 'KTV. Phan Thanh Hoàn'
    };
  });

  const handleSaveDisposalSignatures = (newSigs: typeof disposalSignatures) => {
    setDisposalSignatures(newSigs);
    localStorage.setItem('disposal_signatures', JSON.stringify(newSigs));
    setShowDisposalSignaturesModal(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [cRes, dRes, aRes, deptRes, mRes] = await Promise.allSettled([
        apiGet('/disposals/campaigns'),
        apiGet('/disposals'),
        apiGet('/assets?limit=500'),
        apiGet('/departments'),
        apiGet('/committee')
      ]);

      if (cRes.status === 'fulfilled' && Array.isArray(cRes.value)) setCampaigns(cRes.value);
      if (dRes.status === 'fulfilled' && Array.isArray(dRes.value)) setDisposals(dRes.value);
      if (aRes.status === 'fulfilled' && aRes.value?.assets) {
        const sorted = [...aRes.value.assets].sort((a, b) =>
          (a.assetCode || '').localeCompare(b.assetCode || '', undefined, { numeric: true, sensitivity: 'base' })
        );
        setCandidateAssets(sorted);
      }
      if (deptRes.status === 'fulfilled' && Array.isArray(deptRes.value)) setDepartments(deptRes.value);
      if (mRes.status === 'fulfilled' && Array.isArray(mRes.value)) setCommitteeMembers(mRes.value);
    } catch (e) {
      console.error('Error loading disposal data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Multi-select helpers for proposal modal
  const filteredCandidateAssets = candidateAssets.filter(a => {
    if (user?.role === 'DEPARTMENT' && user.departmentId && a.departmentId !== user.departmentId) {
      return false;
    }
    if (modalUnitFilter !== 'ALL' && (a as any).managingUnit !== modalUnitFilter) {
      return false;
    }
    if (modalAssetSearch.trim()) {
      const q = modalAssetSearch.toLowerCase();
      const matchCode = a.assetCode?.toLowerCase().includes(q);
      const matchName = a.name?.toLowerCase().includes(q);
      const matchSpec = a.specifications?.toLowerCase().includes(q);
      const matchLoc = a.locationDetail?.toLowerCase().includes(q) || (a as any).floor?.toLowerCase().includes(q);
      if (!matchCode && !matchName && !matchSpec && !matchLoc) return false;
    }
    return true;
  });

  const toggleSelectAsset = (id: number) => {
    setSelectedAssetIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAllFilteredAssets = () => {
    const ids = filteredCandidateAssets.map(a => a.id);
    setSelectedAssetIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const deselectAllFilteredAssets = () => {
    const ids = new Set(filteredCandidateAssets.map(a => a.id));
    setSelectedAssetIds(prev => prev.filter(id => !ids.has(id)));
  };

  // Handle Create Proposal (Single or Multiple assets)
  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAssetIds.length === 0) {
      alert('Vui lòng tích chọn ít nhất 1 thiết bị cần gửi đề xuất thanh lý!');
      return;
    }
    if (!proposalData.proposedBy || !proposalData.reason) {
      alert('Vui lòng điền người lập báo cáo và lý do đề xuất thanh lý!');
      return;
    }

    try {
      await apiPost('/disposals', {
        assetIds: selectedAssetIds,
        proposedBy: proposalData.proposedBy,
        reason: proposalData.reason,
        campaignName: proposalData.campaignName,
        departmentId: user?.departmentId || undefined
      });
      setShowCreateProposalModal(false);
      setSelectedAssetIds([]);
      setModalAssetSearch('');
      setProposalData({
        proposedBy: user?.fullName || '',
        reason: 'Thiết bị hư hỏng nặng, linh kiện hao mòn chập cháy, không thể phục hồi, chi phí sửa chữa không hiệu quả kinh tế',
        campaignName: 'Thông báo rà soát & lập danh mục đề xuất thanh lý tài sản Đợt 1 năm 2026'
      });
      loadData();
      alert(`Đã gửi báo cáo đề xuất thanh lý thành công cho ${selectedAssetIds.length} thiết bị!`);
    } catch (e: any) {
      alert(e.message || 'Lỗi khi gửi đề xuất');
    }
  };

  // Open Technical Inspection modal
  const handleOpenInspection = (disp: any) => {
    setSelectedDisposal(disp);
    const unit = disp.asset?.managingUnit;
    let inspectorDefault = 'Ông. Phan Thanh Hoàn (Tổ CNTT)';
    if (unit === 'DUOC') inspectorDefault = 'Bà. Mai Thị Tính (Khoa Dược - VTYT)';
    if (unit === 'TCHC') inspectorDefault = 'Ông. Trần Liên (Phòng TC - HC)';

    setInspectionData(prev => ({
      ...prev,
      technicalInspector: inspectorDefault
    }));
    setShowInspectionModal(true);
  };

  // Submit Technical Inspection
  const handleSubmitInspection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDisposal) return;

    try {
      await apiPut(`/disposals/${selectedDisposal.id}/inspect`, inspectionData);
      setShowInspectionModal(false);
      loadData();
      alert('Đã lập và lưu Biên bản kiểm tra tình trạng kỹ thuật thành công!');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi lập biên bản kiểm tra');
    }
  };

  // Board Approves
  const handleApprove = async (id: number) => {
    if (!window.confirm('Hội đồng thanh lý xác nhận phê duyệt đề xuất thanh lý tài sản này?')) return;
    try {
      await apiPut(`/disposals/${id}/approve`, {});
      loadData();
      alert('Đã phê duyệt đề xuất thanh lý!');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi duyệt');
    }
  };

  // Complete Disposal
  const handleComplete = async (id: number) => {
    if (!window.confirm('Xác nhận hoàn tất thanh lý? Tài sản sẽ chuyển sang trạng thái ĐÃ THANH LÝ.')) return;
    try {
      await apiPut(`/disposals/${id}/complete`, {});
      loadData();
      alert('Đã hoàn tất thanh lý tài sản!');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi hoàn tất');
    }
  };

  // Create Campaign
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiPost('/disposals/campaigns', campaignForm);
      setShowCreateCampaignModal(false);
      loadData();
      alert('Đã ban hành thông báo đợt thanh lý thành công!');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi tạo thông báo');
    }
  };

  // Committee dynamic members
  const president = committeeMembers.find(m => m.role === 'CHUTICH') || { fullName: 'Ông. Nguyễn Đại Vĩnh', position: 'Giám đốc' };
  const memberTCKT = committeeMembers.find(m => m.role === 'UYVIEN' || m.position.includes('TC - KT')) || { fullName: 'Ông. Hồ Phú Quảng', position: 'Trưởng phòng TC - KT' };
  
  // Specific technical leaders & team members
  const leaderDUOC = committeeMembers.find(m => m.role === 'TOTRUONG_TBYT') || { fullName: 'Bà. Mai Thị Tính', position: 'Phụ trách Khoa Dược - VTYT' };
  const leaderCNTT = committeeMembers.find(m => m.role === 'TOTRUONG_CNTT') || { fullName: 'Ông. Trần Văn Vũ', position: 'Trưởng phòng KHNV / Phụ trách CNTT' };
  const leaderTCHC = committeeMembers.find(m => m.role === 'TOTRUONG_TCHC') || { fullName: 'Ông. Trần Liên', position: 'Trưởng phòng TC - HC' };

  const cnttMembers = committeeMembers.filter(m => m.scope === 'CNTT' || m.role === 'THANHVIEN_CNTT');

  // Filtered disposals list
  const filteredDisposals = disposals.filter(d => {
    const unitMatch = selectedManagingUnit === 'ALL' || (d.asset as any)?.managingUnit === selectedManagingUnit;
    const deptMatch = selectedDeptId === 'ALL' || d.asset?.departmentId?.toString() === selectedDeptId;
    const searchMatch = !searchTerm || 
      d.asset?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.asset?.assetCode?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.proposedBy?.toLowerCase().includes(searchTerm.toLowerCase());
    return unitMatch && deptMatch && searchMatch;
  });

  return (
    <div className="space-y-6 pb-16">
      {/* 1. TOP HEADER */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">Quy trình chuẩn 4 bước</span>
            <h1 className="text-2xl font-bold text-slate-900">Quản lý Đề xuất & Thanh lý Tài sản</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Quy trình: <strong>Thông báo đợt ➔ Khoa/Phòng đề xuất ➔ Thẩm định kỹ thuật ➔ Họp Hội đồng thanh lý</strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" /> In Biên bản A4
          </button>
          
          <button 
            onClick={() => setShowCreateProposalModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Khoa/Phòng Lập Đề Xuất
          </button>
        </div>
      </div>

      {/* 2. WORKFLOW 4 STEPS NAVIGATION TABS */}
      <div className="print:hidden grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Step 1 */}
        <div 
          onClick={() => setActiveTab('CAMPAIGNS')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
            activeTab === 'CAMPAIGNS'
              ? 'border-blue-600 bg-blue-50/60 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Bước 1</span>
            <Bell className="w-4 h-4 text-blue-600" />
          </div>
          <div className="font-bold text-sm text-slate-900 mt-1">Thông báo đợt thanh lý</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Ban Giám Đốc ban hành đợt</div>
        </div>

        {/* Step 2 */}
        <div 
          onClick={() => setActiveTab('PROPOSALS')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
            activeTab === 'PROPOSALS'
              ? 'border-blue-600 bg-blue-50/60 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Bước 2</span>
            <FileText className="w-4 h-4 text-amber-600" />
          </div>
          <div className="font-bold text-sm text-slate-900 mt-1">Khoa/Phòng đề xuất</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Gửi báo cáo về Dược / CNTT / TCHC</div>
        </div>

        {/* Step 3 */}
        <div 
          onClick={() => setActiveTab('INSPECTIONS')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
            activeTab === 'INSPECTIONS'
              ? 'border-blue-600 bg-blue-50/60 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Bước 3</span>
            <ClipboardCheck className="w-4 h-4 text-purple-600" />
          </div>
          <div className="font-bold text-sm text-slate-900 mt-1">Kiểm tra tình trạng</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Biên bản thẩm định kỹ thuật</div>
        </div>

        {/* Step 4 */}
        <div 
          onClick={() => setActiveTab('BOARD_MEETING')}
          className={`p-4 rounded-2xl border-2 cursor-pointer transition ${
            activeTab === 'BOARD_MEETING'
              ? 'border-blue-600 bg-blue-50/60 shadow-xs'
              : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Bước 4</span>
            <Users className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="font-bold text-sm text-slate-900 mt-1">Biên bản Hội đồng</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Phê duyệt & Quyết định thanh lý</div>
        </div>
      </div>

      {/* 3. STEP CONTENT */}

      {/* TAB 1: THÔNG BÁO ĐỢT THANH LÝ */}
      {activeTab === 'CAMPAIGNS' && (
        <div className="print:hidden bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Danh sách các Đợt & Kế hoạch thanh lý tài sản</h3>
              <p className="text-xs text-slate-500 mt-0.5">Căn cứ để các Khoa/Phòng lập danh mục đề xuất gửi về các đơn vị chuyên trách</p>
            </div>
            <button
              onClick={() => setShowCreateCampaignModal(true)}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Ban hành Đợt mới
            </button>
          </div>

          <div className="space-y-3">
            {campaigns.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">Chưa có thông báo đợt thanh lý nào.</div>
            ) : (
              campaigns.map((camp: any) => (
                <div key={camp.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-md font-mono">{camp.campaignCode}</span>
                      <h4 className="font-bold text-sm text-slate-900">{camp.title}</h4>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">Đang tiếp nhận đề xuất</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{camp.description}</p>
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                    <span>Đơn vị ban hành: <strong>{camp.issuedBy || 'Ban Giám Đốc CDC'}</strong></span>
                    <span>Hạn nộp báo cáo: <strong>{camp.endDate ? new Date(camp.endDate).toLocaleDateString('vi-VN') : '30/03/2026'}</strong></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2 & 3: DANH SÁCH ĐỀ XUẤT & THẨM ĐỊNH KỸ THUẬT */}
      {(activeTab === 'PROPOSALS' || activeTab === 'INSPECTIONS') && (
        <div className="print:hidden bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-0">
          {/* Filters Bar */}
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedManagingUnit}
                onChange={e => setSelectedManagingUnit(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="ALL">-- Tất cả Khối quản lý --</option>
                <option value="DUOC">Khối Khoa Dược (TBYT)</option>
                <option value="CNTT">Khối Tổ CNTT</option>
                <option value="TCHC">Khối Phòng TCHC</option>
              </select>

              {user?.role !== 'DEPARTMENT' && (
                <select
                  value={selectedDeptId}
                  onChange={e => setSelectedDeptId(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="ALL">-- Tất cả 16 Khoa / Phòng --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id.toString()}>{d.code} - {d.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm mã tài sản, tên thiết bị..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none w-56 sm:w-64"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
                <tr>
                  <th className="p-3.5">Mã tài sản</th>
                  <th className="p-3.5 min-w-[180px]">Tên thiết bị đề xuất</th>
                  <th className="p-3.5">Khoa / Phòng</th>
                  <th className="p-3.5">Khối nhận báo cáo</th>
                  <th className="p-3.5 min-w-[180px]">Lý do đề xuất</th>
                  <th className="p-3.5 min-w-[180px]">Đánh giá kỹ thuật</th>
                  <th className="p-3.5">Trạng thái</th>
                  <th className="p-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">Đang tải danh sách đề xuất...</td></tr>
                ) : filteredDisposals.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-slate-400">Chưa có đề xuất thanh lý nào phù hợp.</td></tr>
                ) : (
                  filteredDisposals.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition">
                      <td className="p-3.5 font-mono font-bold text-blue-700">{item.asset?.assetCode}</td>
                      <td className="p-3.5 font-bold text-slate-900">{item.asset?.name}</td>
                      <td className="p-3.5 text-slate-700 font-medium">{item.asset?.department?.name || 'CDC'}</td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.asset?.managingUnit === 'DUOC' ? 'bg-emerald-100 text-emerald-800' :
                          item.asset?.managingUnit === 'CNTT' ? 'bg-blue-100 text-blue-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {item.asset?.managingUnit === 'DUOC' ? 'Khoa Dược' :
                           item.asset?.managingUnit === 'CNTT' ? 'Tổ CNTT' : 'Phòng TCHC'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-600 max-w-xs">{item.reason}</td>
                      <td className="p-3.5 text-slate-600 max-w-xs">
                        {item.technicalAssessment ? (
                          <span className="text-slate-800 font-medium">{item.technicalAssessment}</span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa thẩm định</span>
                        )}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          item.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          item.status === 'APPROVED' ? 'bg-blue-100 text-blue-800' :
                          item.status === 'INSPECTED' ? 'bg-purple-100 text-purple-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {item.status === 'COMPLETED' ? 'Đã thanh lý' :
                           item.status === 'APPROVED' ? 'HĐ đã duyệt' :
                           item.status === 'INSPECTED' ? 'Đã thẩm định KT' : 'Chờ thẩm định KT'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {item.status === 'PROPOSED' && (
                          <button
                            onClick={() => handleOpenInspection(item)}
                            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Thẩm định KT
                          </button>
                        )}
                        {item.status === 'INSPECTED' && (
                          <button
                            onClick={() => handleApprove(item.id)}
                            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            HĐ Duyệt
                          </button>
                        )}
                        {item.status === 'APPROVED' && (
                          <button
                            onClick={() => handleComplete(item.id)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition cursor-pointer"
                          >
                            Hoàn tất
                          </button>
                        )}
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
      {/* 4. BIÊN BẢN KIỂM TRA TÌNH TRẠNG KỸ THUẬT TÀI SẢN ĐỀ NGHỊ THANH LÝ (A4)   */}
      {/* ========================================================================= */}
      {activeTab === 'INSPECTIONS' && (
        <div className="space-y-4">
          {/* Action Button Bar */}
          <div className="print:hidden flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-600">
              Biên bản thẩm định kỹ thuật dành cho: <strong className="text-blue-700">{selectedManagingUnit === 'CNTT' ? 'Tổ CNTT' : selectedManagingUnit === 'DUOC' ? 'Khoa Dược (TBYT)' : selectedManagingUnit === 'TCHC' ? 'Phòng TCHC' : 'Toàn đơn vị'}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDisposalSignaturesModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Tùy chỉnh Hội đồng & Người ký"
              >
                <Users className="w-4 h-4 text-blue-600" /> Cấu hình Người ký
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
                title="Xuất trực tiếp sang file PDF hoặc in ấn biên bản kiểm tra kỹ thuật A4"
              >
                <Printer className="w-4 h-4" /> Xuất PDF / In Biên Bản Kỹ Thuật A4
              </button>
            </div>
          </div>

          <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-md border border-slate-200 font-serif text-slate-900 print:shadow-none print:border-none print:p-0">
            <div className="flex justify-between items-start text-xs sm:text-sm font-sans mb-4">
              <div>
                <div className="font-bold uppercase">TRUNG TÂM KIỂM SOÁT BỆNH TẬT TP ĐÀ NẴNG</div>
                <div className="text-slate-600">TỔ THẨM ĐỊNH KỸ THUẬT TÀI SẢN</div>
              </div>
              <div className="text-right">
                <div className="font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="italic text-xs">Độc lập - Tự do - Hạnh phúc</div>
              </div>
            </div>

            <div className="text-center my-6">
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide">
                BIÊN BẢN KIỂM TRA TÌNH TRẠNG KỸ THUẬT TÀI SẢN ĐỀ NGHỊ THANH LÝ
              </h2>
              <p className="text-xs sm:text-sm italic text-slate-600 mt-1 font-sans">
                (Thực hiện theo Thông báo rà soát & thanh lý tài sản năm 2026)
              </p>
            </div>

            <div className="text-xs sm:text-sm font-sans space-y-2 mb-6 text-slate-800">
              <p>- Căn cứ Báo cáo đề xuất thanh lý của các Khoa, Phòng trực thuộc Trung tâm;</p>
              <p>- Hôm nay, ngày {disposalSignatures.meetingDate}, Đoàn kiểm tra kỹ thuật gồm có:</p>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                <div>1. <strong>{disposalSignatures.inspectorName}</strong> - {disposalSignatures.inspectorTitle}</div>
                <div>2. <strong>{disposalSignatures.memberTechName}</strong> - {disposalSignatures.memberTechTitle}</div>
                <div>3. <strong>{disposalSignatures.memberDeptName}</strong> - {disposalSignatures.memberDeptTitle}</div>
              </div>
              <p className="pt-2">Cùng tiến hành kiểm tra, thẩm định tình trạng kỹ thuật thực tế của các tài sản như sau:</p>
            </div>

            <div className="overflow-x-auto border border-slate-400 rounded-lg">
              <table className="w-full text-xs font-sans border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100 text-center font-bold border-b border-slate-400 divide-x divide-slate-300">
                    <th className="p-2 w-10">STT</th>
                    <th className="p-2 min-w-[90px]">Mã TS</th>
                    <th className="p-2 min-w-[180px]">Tên tài sản, thiết bị</th>
                    <th className="p-2 min-w-[120px]">Đơn vị sử dụng</th>
                    <th className="p-2 min-w-[220px]">Hiện trạng kỹ thuật & Hư hỏng thực tế</th>
                    <th className="p-2 min-w-[150px]">Kết luận & Phương án xử lý</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {filteredDisposals.map((item: any, idx) => (
                    <tr key={item.id} className="divide-x divide-slate-200">
                      <td className="p-2 text-center text-slate-600">{idx + 1}</td>
                      <td className="p-2 font-mono font-bold text-blue-700">{item.asset?.assetCode}</td>
                      <td className="p-2 font-semibold text-slate-900">{item.asset?.name}</td>
                      <td className="p-2">{item.asset?.department?.name || 'CDC'}</td>
                      <td className="p-2 text-slate-700">{item.technicalAssessment || item.reason}</td>
                      <td className="p-2 text-red-700 font-semibold">{item.solution || 'Đề nghị thanh lý tiêu hủy / bán phế liệu thu hồi'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-10 pt-4 font-sans text-xs sm:text-sm">
              <div className="text-right italic mb-4">Đà Nẵng, ngày {disposalSignatures.meetingDate}</div>
              <div className="grid grid-cols-2 gap-8 text-center">
                <div>
                  <div className="font-bold uppercase text-slate-900">{disposalSignatures.memberDeptTitle}</div>
                  <div className="text-[11px] italic text-slate-500 mb-20">(Ký, ghi rõ họ tên)</div>
                  <div className="font-bold text-slate-800">{disposalSignatures.memberDeptName}</div>
                </div>

                <div>
                  <div className="font-bold uppercase text-slate-900">{disposalSignatures.inspectorTitle}</div>
                  <div className="text-[11px] italic text-slate-500 mb-20">(Ký, ghi rõ họ tên)</div>
                  <div className="font-bold text-slate-800">{disposalSignatures.inspectorName}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. BIÊN BẢN HỌP HỘI ĐỒNG ĐÁNH GIÁ & ĐỀ XUẤT THANH LÝ TÀI SẢN (A4)         */}
      {/* ========================================================================= */}
      {activeTab === 'BOARD_MEETING' && (
        <div className="space-y-4">
          {/* Action Button Bar */}
          <div className="print:hidden flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-semibold text-slate-600">
              Biên bản họp Hội đồng thanh lý tài sản CDC Đà Nẵng
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDisposalSignaturesModal(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                title="Tùy chỉnh Hội đồng & Người ký"
              >
                <Users className="w-4 h-4 text-blue-600" /> Cấu hình Hội đồng & Người ký
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow transition cursor-pointer"
                title="Xuất trực tiếp sang file PDF hoặc in ấn biên bản họp Hội đồng thanh lý A4"
              >
                <Printer className="w-4 h-4" /> Xuất PDF / In Biên Bản Họp HĐ A4
              </button>
            </div>
          </div>

          <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-md border border-slate-200 font-serif text-slate-900 print:shadow-none print:border-none print:p-0">
            <div className="flex justify-between items-start text-xs sm:text-sm font-sans mb-4">
              <div>
                <div className="font-bold uppercase">TRUNG TÂM KIỂM SOÁT BỆNH TẬT TP ĐÀ NẴNG</div>
                <div className="text-slate-600">HỘI ĐỒNG THANH LÝ TÀI SẢN</div>
              </div>
              <div className="text-right">
                <div className="font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                <div className="italic text-xs">Độc lập - Tự do - Hạnh phúc</div>
              </div>
            </div>

            <div className="text-center my-6">
              <h2 className="text-lg sm:text-2xl font-bold uppercase tracking-wide">
                BIÊN BẢN HỌP HỘI ĐỒNG THANH LÝ TÀI SẢN, CCDC NĂM 2026
              </h2>
              <div className="text-xs sm:text-sm text-slate-700 mt-2 font-sans space-y-1">
                <p className="italic">
                  - Căn cứ <strong>{disposalSignatures.decisionNumber}</strong> của Giám đốc CDC Đà Nẵng về việc thành lập Hội đồng thanh lý tài sản, máy móc thiết bị hư hỏng.
                </p>
                <p className="italic">
                  - Nguồn kinh phí thanh lý: <strong>{disposalSignatures.fundingSource}</strong>
                </p>
                <p className="italic">
                  - Hôm nay, ngày {disposalSignatures.meetingDate}, tại Trung tâm Kiểm soát bệnh tật TP Đà Nẵng, Hội đồng gồm có:
                </p>
              </div>
            </div>

            {/* Thành phần Hội đồng thanh lý */}
            <div className="bg-slate-50/70 p-5 rounded-xl border border-slate-200 text-xs sm:text-sm font-sans mb-6 space-y-2">
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span>1. <strong>{disposalSignatures.presidentName}</strong> - {disposalSignatures.presidentTitle}</span>
                <span className="font-bold text-blue-800">Chủ tịch Hội đồng</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span>2. <strong>{disposalSignatures.memberTcktName}</strong> - {disposalSignatures.memberTcktTitle}</span>
                <span className="font-bold text-slate-700">Ủy viên Tài chính</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span>3. <strong>{disposalSignatures.memberTechName}</strong> - {disposalSignatures.memberTechTitle}</span>
                <span className="font-bold text-slate-700">Ủy viên Kỹ thuật</span>
              </div>
              <div className="flex justify-between border-b border-slate-200 pb-1.5">
                <span>4. <strong>{disposalSignatures.memberDeptName}</strong> - {disposalSignatures.memberDeptTitle}</span>
                <span className="font-bold text-slate-700">Đại diện Đơn vị</span>
              </div>
              <div className="pt-1 text-slate-700">
                <span>Căn cứ Biên bản kiểm tra tình trạng kỹ thuật, Hội đồng thống nhất thông qua danh mục thanh lý:</span>
              </div>
            </div>

            {/* Bảng tài sản thanh lý */}
            <div className="overflow-x-auto border border-slate-400 rounded-lg">
              <table className="w-full text-xs font-sans border-collapse text-left">
                <thead>
                  <tr className="bg-slate-100 text-center font-bold border-b border-slate-400 divide-x divide-slate-300">
                    <th className="p-2 w-10">STT</th>
                    <th className="p-2 min-w-[90px]">Mã TS</th>
                    <th className="p-2 min-w-[180px]">Tên tài sản, thiết bị</th>
                    <th className="p-2 min-w-[80px]">Năm SD</th>
                    <th className="p-2 min-w-[90px]">Nguyên giá (đ)</th>
                    <th className="p-2 min-w-[120px]">Đơn vị sử dụng</th>
                    <th className="p-2 min-w-[200px]">Lý do thanh lý</th>
                    <th className="p-2 min-w-[100px]">Quyết định HĐ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {candidateAssets.slice(0, 15).map((a, idx) => (
                    <tr key={a.id} className="divide-x divide-slate-200">
                      <td className="p-2 text-center text-slate-600">{idx + 1}</td>
                      <td className="p-2 font-mono font-bold text-blue-700">{a.assetCode}</td>
                      <td className="p-2 font-semibold text-slate-900">{a.name}</td>
                      <td className="p-2 text-center">{a.yearInUse || '-'}</td>
                      <td className="p-2 text-right font-mono">{a.originalPrice ? Number(a.originalPrice).toLocaleString('vi-VN') : '-'}</td>
                      <td className="p-2">{a.department?.name || 'CDC'}</td>
                      <td className="p-2 text-slate-700">{a.note || 'Hư hỏng không thể phục hồi, chi phí sửa chữa không hiệu quả'}</td>
                      <td className="p-2 text-center font-bold text-emerald-700">Đồng ý thanh lý</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Chữ ký Hội đồng */}
            <div className="mt-10 pt-4 font-sans text-xs sm:text-sm">
              <div className="text-right italic mb-4">Đà Nẵng, ngày {disposalSignatures.meetingDate}</div>
              <div className="grid grid-cols-4 gap-4 text-center">
                <div>
                  <div className="font-bold uppercase text-slate-900">{disposalSignatures.memberDeptTitle}</div>
                  <div className="text-[11px] italic text-slate-500 mb-20">(Ký, ghi rõ họ tên)</div>
                  <div className="font-bold text-slate-800">{disposalSignatures.memberDeptName}</div>
                </div>

                <div>
                  <div className="font-bold uppercase text-slate-900">{disposalSignatures.memberTechTitle}</div>
                  <div className="text-[11px] italic text-slate-500 mb-20">(Ký, ghi rõ họ tên)</div>
                  <div className="font-bold text-slate-800">{disposalSignatures.memberTechName}</div>
                </div>

                <div>
                  <div className="font-bold uppercase text-slate-900">{disposalSignatures.memberTcktTitle}</div>
                  <div className="text-[11px] italic text-slate-500 mb-20">(Ký, ghi rõ họ tên)</div>
                  <div className="font-bold text-slate-800">{disposalSignatures.memberTcktName}</div>
                </div>

                <div>
                  <div className="font-bold uppercase text-slate-900">{disposalSignatures.presidentTitle}</div>
                  <div className="text-[11px] italic text-slate-500 mb-20">(Ký, đóng dấu)</div>
                  <div className="font-bold text-slate-800">{disposalSignatures.presidentName}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: KHOA / PHÒNG LẬP ĐỀ XUẤT THANH LÝ (CHỌN NHIỀU THIẾT BỊ)         */}
      {/* ========================================================================= */}
      {showCreateProposalModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Khoa / Phòng Lập Báo Cáo Đề Xuất Thanh Lý</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tích chọn một hoặc nhiều tài sản / thiết bị hư hỏng để gửi đề xuất lên Hội đồng</p>
              </div>
              <button onClick={() => setShowCreateProposalModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
            </div>
            
            <form onSubmit={handleCreateProposal} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Theo Đợt / Thông báo thanh lý</label>
                <select
                  value={proposalData.campaignName}
                  onChange={e => setProposalData({ ...proposalData, campaignName: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none font-medium text-slate-800"
                >
                  {campaigns.map(c => (
                    <option key={c.id} value={c.title}>{c.campaignCode} - {c.title}</option>
                  ))}
                  <option value="Đợt 1/2026 - Rà soát & Thanh lý tài sản đầu năm">Đợt 1/2026 - Rà soát & Thanh lý tài sản đầu năm</option>
                </select>
              </div>

              {/* Multi-Select Asset Section */}
              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <span>Chọn danh sách tài sản / thiết bị (*):</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 font-extrabold rounded-md text-[11px]">
                      Đã chọn: {selectedAssetIds.length} thiết bị
                    </span>
                  </label>
                  
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={selectAllFilteredAssets}
                      className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold rounded-lg transition cursor-pointer text-[11px]"
                    >
                      Chọn tất cả ({filteredCandidateAssets.length})
                    </button>
                    {selectedAssetIds.length > 0 && (
                      <button
                        type="button"
                        onClick={deselectAllFilteredAssets}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition cursor-pointer text-[11px]"
                      >
                        Bỏ chọn
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter and search bar inside modal */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Tìm nhanh theo mã, tên thiết bị, phòng..."
                      value={modalAssetSearch}
                      onChange={e => setModalAssetSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-xl bg-white text-xs outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <select
                    value={modalUnitFilter}
                    onChange={e => setModalUnitFilter(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-xl bg-white text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ALL">Tất cả khối</option>
                    <option value="DUOC">Khoa Dược (TBYT)</option>
                    <option value="CNTT">Tổ CNTT</option>
                    <option value="TCHC">Phòng TCHC</option>
                  </select>
                </div>

                {/* Scrollable list of selectable assets */}
                <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-60 overflow-y-auto bg-slate-50/50 shadow-inner">
                  {filteredCandidateAssets.length === 0 ? (
                    <div className="p-6 text-center text-slate-400">
                      Không tìm thấy thiết bị nào phù hợp.
                    </div>
                  ) : (
                    filteredCandidateAssets.map(asset => {
                      const isSelected = selectedAssetIds.includes(asset.id);
                      return (
                        <div
                          key={asset.id}
                          onClick={() => toggleSelectAsset(asset.id)}
                          className={`p-3 flex items-start gap-3 transition cursor-pointer select-none ${
                            isSelected ? 'bg-blue-50/80 border-l-4 border-blue-600' : 'hover:bg-white bg-transparent'
                          }`}
                        >
                          <div className="pt-0.5 text-blue-600">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 fill-blue-600 text-white" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-400" />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-blue-700">{asset.assetCode}</span>
                                <span className="font-semibold text-slate-900 truncate max-w-[280px]">{asset.name}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                asset.managingUnit === 'DUOC' ? 'bg-emerald-100 text-emerald-800' :
                                asset.managingUnit === 'CNTT' ? 'bg-blue-100 text-blue-800' :
                                'bg-amber-100 text-amber-800'
                              }`}>
                                {asset.managingUnit === 'DUOC' ? 'Khoa Dược' : asset.managingUnit === 'CNTT' ? 'Tổ CNTT' : 'TCHC'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                              <span>Vị trí: <strong>{asset.locationDetail || (asset as any).floor || 'Tại khoa'}</strong></span>
                              {asset.assignedTo && <span>Người SD: <strong>{asset.assignedTo}</strong></span>}
                              {asset.yearInUse && <span>Năm SD: <strong>{asset.yearInUse}</strong></span>}
                              {asset.originalPrice && (
                                <span>Nguyên giá: <strong>{Number(asset.originalPrice).toLocaleString('vi-VN')} đ</strong></span>
                              )}
                            </div>
                            {asset.specifications && (
                              <div className="text-[10px] text-slate-400 truncate mt-0.5">{asset.specifications}</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Cán bộ / Người lập báo cáo đề xuất (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: BS. Nguyễn Văn A, DS. Trần Thị B..."
                    value={proposalData.proposedBy}
                    onChange={e => setProposalData({ ...proposalData, proposedBy: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Khoa / Phòng đề xuất</label>
                  <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl font-bold text-slate-800">
                    {user?.fullName || departments.find(d => d.id === user?.departmentId)?.name || 'Đơn vị đề xuất'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Lý do & Tình trạng hư hỏng chung (*)</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Mô tả cụ thể: Thiết bị hỏng bo mạch chính chập cháy, màn hình sọc nhòe, máy xét nghiệm không nhận hóa chất, đã sửa chữa nhiều lần không hiệu quả kinh tế..."
                  value={proposalData.reason}
                  onChange={e => setProposalData({ ...proposalData, reason: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateProposalModal(false)}
                  className="px-4 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={selectedAssetIds.length === 0}
                  className={`px-5 py-2.5 rounded-xl font-bold shadow flex items-center gap-1.5 transition cursor-pointer ${
                    selectedAssetIds.length === 0
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/30'
                  }`}
                >
                  <Send className="w-3.5 h-3.5" /> 
                  <span>Gửi Báo Cáo Đề Xuất ({selectedAssetIds.length} thiết bị)</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: THẨM ĐỊNH KỸ THUẬT & LẬP BIÊN BẢN KIỂM TRA TÌNH TRẠNG          */}
      {/* ========================================================================= */}
      {showInspectionModal && selectedDisposal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Thẩm Định Kỹ Thuật Thiết Bị</h3>
                <p className="text-xs text-slate-500">{selectedDisposal.asset?.assetCode} - {selectedDisposal.asset?.name}</p>
              </div>
              <button onClick={() => setShowInspectionModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmitInspection} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Cán bộ chuyên trách kiểm tra kỹ thuật (*)</label>
                <input
                  type="text"
                  required
                  value={inspectionData.technicalInspector}
                  onChange={e => setInspectionData({ ...inspectionData, technicalInspector: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Kết quả kiểm tra & Đánh giá hiện trạng kỹ thuật (*)</label>
                <textarea
                  rows={3}
                  required
                  value={inspectionData.technicalAssessment}
                  onChange={e => setInspectionData({ ...inspectionData, technicalAssessment: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Căn cứ quyết định / Kế hoạch (*)</label>
                  <input
                    type="text"
                    required
                    placeholder="QĐ số 45/QĐ-TTKSBT..."
                    value={inspectionData.decisionNumber}
                    onChange={e => setInspectionData({ ...inspectionData, decisionNumber: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Nguồn kinh phí / Nộp quỹ</label>
                  <select
                    value={inspectionData.fundingSource}
                    onChange={e => setInspectionData({ ...inspectionData, fundingSource: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="Nộp ngân sách nhà nước / Quỹ PTHĐSN">Nộp ngân sách nhà nước / Quỹ PTHĐSN</option>
                    <option value="Nguồn thu dịch vụ y tế">Nguồn thu dịch vụ y tế</option>
                    <option value="Quỹ phát triển hoạt động sự nghiệp">Quỹ phát triển hoạt động sự nghiệp</option>
                    <option value="Nguồn ngân sách nhà nước">Nguồn ngân sách nhà nước</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Đề xuất hình thức xử lý</label>
                  <select
                    value={inspectionData.disposalMethod}
                    onChange={e => setInspectionData({ ...inspectionData, disposalMethod: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="Bán phế liệu thu hồi">Bán phế liệu thu hồi</option>
                    <option value="Rã xác tận dụng linh kiện">Rã xác tận dụng linh kiện</option>
                    <option value="Tiêu hủy hoàn toàn">Tiêu hủy hoàn toàn</option>
                    <option value="Bán đấu giá">Bán đấu giá</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Giá trị thu hồi ước tính (đ)</label>
                  <input
                    type="number"
                    value={inspectionData.disposalPrice}
                    onChange={e => setInspectionData({ ...inspectionData, disposalPrice: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowInspectionModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow"
                >
                  Lưu Biên Bản Thẩm Định
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: BAN HÀNH ĐỢT THANH LÝ MỚI                                      */}
      {/* ========================================================================= */}
      {showCreateCampaignModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-base text-slate-900">Ban Hành Thông Báo Đợt Thanh Lý Mới</h3>
            
            <form onSubmit={handleCreateCampaign} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Mã thông báo</label>
                <input
                  type="text"
                  required
                  value={campaignForm.campaignCode}
                  onChange={e => setCampaignForm({ ...campaignForm, campaignCode: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Tiêu đề thông báo / Kế hoạch (*)</label>
                <input
                  type="text"
                  required
                  value={campaignForm.title}
                  onChange={e => setCampaignForm({ ...campaignForm, title: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Thời hạn nhận đề xuất</label>
                <input
                  type="date"
                  required
                  value={campaignForm.endDate}
                  onChange={e => setCampaignForm({ ...campaignForm, endDate: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Nội dung hướng dẫn các Khoa/Phòng</label>
                <textarea
                  rows={3}
                  value={campaignForm.description}
                  onChange={e => setCampaignForm({ ...campaignForm, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreateCampaignModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow"
                >
                  Ban Hành Thông Báo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: TÙY CHỈNH HỘI ĐỒNG & NGƯỜI KÝ THANH LÝ                          */}
      {/* ========================================================================= */}
      {showDisposalSignaturesModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Cấu Hình Hội Đồng & Người Ký Biên Bản Thanh Lý</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tùy chỉnh thông tin căn cứ pháp lý & chữ ký các thành viên</p>
              </div>
              <button onClick={() => setShowDisposalSignaturesModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                handleSaveDisposalSignatures(disposalSignatures);
              }}
              className="space-y-4 text-xs"
            >
              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 mr-1">Khối phụ trách:</span>
                <button
                  type="button"
                  onClick={() => setDisposalSignatures({
                    ...disposalSignatures,
                    memberTechTitle: 'ỦY VIÊN KỸ THUẬT (CNTT)',
                    memberTechName: 'Ông. Phan Thanh Hoàn',
                    inspectorTitle: 'CÁN BỘ KIỂM TRA KỸ THUẬT CNTT',
                    inspectorName: 'KTV. Phan Thanh Hoàn'
                  })}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold text-[11px] hover:bg-blue-200 cursor-pointer"
                >
                  💻 Tổ CNTT
                </button>
                <button
                  type="button"
                  onClick={() => setDisposalSignatures({
                    ...disposalSignatures,
                    memberTechTitle: 'ỦY VIÊN KỸ THUẬT (TBYT)',
                    memberTechName: 'Bà. Mai Thị Tính',
                    inspectorTitle: 'CÁN BỘ KIỂM TRA KỸ THUẬT TBYT',
                    inspectorName: 'DS. Mai Thị Tính'
                  })}
                  className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[11px] hover:bg-emerald-200 cursor-pointer"
                >
                  🩺 Khoa Dược (TBYT)
                </button>
                <button
                  type="button"
                  onClick={() => setDisposalSignatures({
                    ...disposalSignatures,
                    memberTechTitle: 'ỦY VIÊN HÀNH CHÍNH (TCHC)',
                    memberTechName: 'Ông. Trần Liên',
                    inspectorTitle: 'CÁN BỘ KIỂM TRA CSVC / HÀNH CHÍNH',
                    inspectorName: 'Trưởng phòng TCHC'
                  })}
                  className="px-2 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold text-[11px] hover:bg-amber-200 cursor-pointer"
                >
                  🏢 Phòng TCHC
                </button>
              </div>

              {/* Thông tin căn cứ chung */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">Thông tin căn cứ & Thời gian</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ngày lập biên bản / họp</label>
                    <input
                      type="text"
                      value={disposalSignatures.meetingDate}
                      onChange={e => setDisposalSignatures({ ...disposalSignatures, meetingDate: e.target.value })}
                      placeholder="15 tháng 01 năm 2026"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Căn cứ Quyết định số</label>
                    <input
                      type="text"
                      value={disposalSignatures.decisionNumber}
                      onChange={e => setDisposalSignatures({ ...disposalSignatures, decisionNumber: e.target.value })}
                      placeholder="QĐ số 45/QĐ-TTKSBT ngày 20/02/2026"
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Nguồn kinh phí / Xử lý tiền thu</label>
                  <input
                    type="text"
                    value={disposalSignatures.fundingSource}
                    onChange={e => setDisposalSignatures({ ...disposalSignatures, fundingSource: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                  />
                </div>
              </div>

              {/* Thành phần 4 chữ ký */}
              <div className="space-y-2">
                {/* 1. Đại diện Khoa/Phòng / Thẩm định */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800">1. Đại diện Khoa / Phòng có tài sản thanh lý</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={disposalSignatures.memberDeptTitle}
                      onChange={e => setDisposalSignatures({ ...disposalSignatures, memberDeptTitle: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                      placeholder="Chức danh"
                    />
                    <input
                      type="text"
                      value={disposalSignatures.memberDeptName}
                      onChange={e => setDisposalSignatures({ ...disposalSignatures, memberDeptName: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                      placeholder="Họ tên"
                    />
                  </div>
                </div>

                {/* 2. Cán bộ kỹ thuật / Thẩm định */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800">2. Cán bộ Kiểm tra Kỹ thuật / Ủy viên Chuyên trách</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={disposalSignatures.memberTechTitle}
                      onChange={e => setDisposalSignatures({ ...disposalSignatures, memberTechTitle: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                      placeholder="Chức danh"
                    />
                    <input
                      type="text"
                      value={disposalSignatures.memberTechName}
                      onChange={e => setDisposalSignatures({ ...disposalSignatures, memberTechName: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                      placeholder="Họ tên"
                    />
                  </div>
                </div>

                {/* 3. Ủy viên Tài chính */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800">3. Đại diện Phòng Tài chính - Kế toán</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={disposalSignatures.memberTcktTitle}
                      onChange={e => setDisposalSignatures({ ...disposalSignatures, memberTcktTitle: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                      placeholder="Chức danh"
                    />
                    <input
                      type="text"
                      value={disposalSignatures.memberTcktName}
                      onChange={e => setDisposalSignatures({ ...disposalSignatures, memberTcktName: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                      placeholder="Họ tên"
                    />
                  </div>
                </div>

                {/* 4. Chủ tịch Hội đồng */}
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-slate-800">4. Giám đốc / Chủ tịch Hội đồng thanh lý</div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={disposalSignatures.presidentTitle}
                      onChange={e => setDisposalSignatures({ ...disposalSignatures, presidentTitle: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                      placeholder="Chức danh"
                    />
                    <input
                      type="text"
                      value={disposalSignatures.presidentName}
                      onChange={e => setDisposalSignatures({ ...disposalSignatures, presidentName: e.target.value })}
                      className="w-full p-1.5 border border-slate-300 rounded-lg bg-white"
                      placeholder="Họ tên"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDisposalSignaturesModal(false)}
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
