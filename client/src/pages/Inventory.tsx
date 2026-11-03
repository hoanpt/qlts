import React, { useState, useEffect } from 'react';
import { 
  Building2, Printer, Download, Save, RefreshCw, 
  CheckCircle2, AlertTriangle, Users, Calendar, Filter, Search, Check,
  QrCode, UserPlus, Settings, Trash2, Edit2, Plus, ArrowRight, ShieldCheck,
  Stethoscope, Monitor, Layers, FileText, SlidersHorizontal
} from 'lucide-react';
import html2pdf from 'html2pdf.js';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Department, Asset, CommitteeMember, STATUS_LABELS } from '../types';

const FLOORS = ['Tất cả tầng', 'Tầng Hầm', 'Tầng 1', 'Tầng 2', 'Tầng 3', 'Tầng 4', 'Tầng 5', 'Tầng 6', 'Tầng 7'];

export interface ColumnOption {
  key: string;
  label: string;
  group: 'basic' | 'quantity' | 'financial' | 'location' | 'status';
  required?: boolean;
  desc?: string;
}

export const ALL_INVENTORY_COLUMNS: ColumnOption[] = [
  { key: 'stt', label: 'STT', group: 'basic', required: true, desc: 'Số thứ tự' },
  { key: 'name', label: 'Tên tài sản & thông số', group: 'basic', required: true, desc: 'Tên thiết bị, quy cách kỹ thuật' },
  { key: 'oldAssetCode', label: 'Mã số cũ', group: 'basic', desc: 'Mã tài sản giai đoạn trước' },
  { key: 'assetCode', label: 'Mã số mới (Mã TS)', group: 'basic', desc: 'Mã tài sản chuẩn hóa 2026' },
  { key: 'yearInUse', label: 'Năm đưa vào SD', group: 'basic', desc: 'Năm bắt đầu sử dụng tài sản' },
  { key: 'bookQty', label: 'Số lượng Sổ sách', group: 'quantity', desc: 'Số lượng theo dõi sổ sách kế toán' },
  { key: 'actualQty', label: 'Số lượng Thực tế KK', group: 'quantity', desc: 'Số lượng kiểm kê thực tế tại đơn vị' },
  { key: 'diff', label: 'Chênh lệch (Thừa/Thiếu)', group: 'quantity', desc: 'Chênh lệch Thực tế - Sổ sách' },
  { key: 'price', label: 'Đơn giá (đ)', group: 'financial', desc: 'Nguyên giá tài sản' },
  { key: 'total', label: 'Thành tiền (đ)', group: 'financial', desc: 'Tổng giá trị theo số lượng thực tế' },
  { key: 'unit', label: 'Bộ phận quản lý', group: 'location', desc: 'Tổ CNTT, Khoa Dược, hoặc Phòng TCHC' },
  { key: 'user', label: 'Nơi / Người sử dụng', group: 'location', desc: 'Khoa phòng, phòng ban, người được giao' },
  { key: 'status', label: 'Tình trạng sử dụng', group: 'status', desc: 'Đang sử dụng, Hỏng, Bảo trì, Chờ thanh lý...' },
  { key: 'location', label: 'Nơi TS mới chuyển đến', group: 'location', desc: 'Cơ sở 1, Cơ sở 2 hoặc địa điểm điều chuyển' },
  { key: 'note', label: 'Ghi chú', group: 'status', desc: 'Ghi chú bổ sung khi kiểm kê' },
];

export const DEFAULT_VISIBLE_COLUMNS = [
  'stt', 'name', 'oldAssetCode', 'assetCode', 'yearInUse',
  'actualQty', 'price', 'total', 'unit', 'user', 'status', 'location', 'note'
];

export const COLUMN_GROUPS = [
  { id: 'basic', title: '1. Thông tin định danh tài sản' },
  { id: 'quantity', title: '2. Số lượng & Kiểm đếm' },
  { id: 'financial', title: '3. Giá trị & Tài chính' },
  { id: 'location', title: '4. Quản lý & Vị trí sử dụng' },
  { id: 'status', title: '5. Tình trạng & Theo dõi' },
];

export default function Inventory() {
  const { user } = useAuth();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [committeeMembers, setCommitteeMembers] = useState<CommitteeMember[]>([]);
  const [showCommitteeModal, setShowCommitteeModal] = useState(false);
  
  // Managing division selection by Role
  const defaultInvType = 
    user?.role === 'MANAGER_CNTT' ? 'CNTT' :
    user?.role === 'MANAGER_DUOC' ? 'DUOC' :
    user?.role === 'MANAGER_TCHC' ? 'TCHC_HC' :
    user?.role === 'DEPARTMENT' ? 'BY_DEPT' : 'DUOC';

  const [inventoryType, setInventoryType] = useState<string>(defaultInvType);
  
  // Specific department or floor selection
  const [selectedDeptId, setSelectedDeptId] = useState<string>(user?.role === 'DEPARTMENT' && user.departmentId ? user.departmentId.toString() : '');
  const [selectedFloor, setSelectedFloor] = useState<string>('Tất cả tầng');
  
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inventoryDate, setInventoryDate] = useState('15/01/2026');
  
  // Committee form modal state
  const [editingMember, setEditingMember] = useState<Partial<CommitteeMember> | null>(null);

  // Signatures configuration for C53-HD
  const [showSignaturesModal, setShowSignaturesModal] = useState(false);
  const [signatures, setSignatures] = useState(() => {
    const saved = localStorage.getItem('inventory_signatures_c53');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      membersTitle: 'Thành viên tổ kiểm kê',
      membersList: 'Trần Văn Vũ\nPhan Thanh Hoàn\nTrần Thị Liên\nHuỳnh Thị Thanh Tú',
      leaderTitle: 'Tổ trưởng Tổ chuyên trách / Đại diện Đơn vị',
      leaderName: user?.role === 'MANAGER_CNTT' ? 'KTV. Phan Thanh Hoàn' :
                  user?.role === 'MANAGER_DUOC' ? 'Bà. Mai Thị Tính (Khoa Dược)' :
                  user?.role === 'MANAGER_TCHC' ? 'Ông. Trần Liên (Phòng TCHC)' : 'KTV. Phan Thanh Hoàn',
      tcktTitle: 'Trưởng phòng TC - KT',
      tcktName: 'Ông. Hồ Phú Quảng',
      presidentTitle: 'Chủ tịch Hội đồng kiểm kê',
      presidentName: 'Ông. Nguyễn Đại Vĩnh'
    };
  });

  const handleSaveSignatures = (newSigs: typeof signatures) => {
    setSignatures(newSigs);
    localStorage.setItem('inventory_signatures_c53', JSON.stringify(newSigs));
    setShowSignaturesModal(false);
  };

  // Column Selection State - Persisted per inventoryType so CNTT, DUOC, TCHC remember their choices independently
  const getSavedColumns = (type: string) => {
    try {
      const saved = localStorage.getItem(`inventory_columns_${type}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_VISIBLE_COLUMNS;
  };

  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => getSavedColumns(defaultInvType));
  const [showColumnModal, setShowColumnModal] = useState(false);
  const [tempColumns, setTempColumns] = useState<string[]>(visibleColumns);

  // Sync columns when inventoryType changes
  useEffect(() => {
    const cols = getSavedColumns(inventoryType);
    setVisibleColumns(cols);
    setTempColumns(cols);
  }, [inventoryType]);

  const handleSaveColumns = (newCols: string[]) => {
    let safeCols = [...newCols];
    if (!safeCols.includes('stt')) safeCols.unshift('stt');
    if (!safeCols.includes('name')) safeCols.splice(1, 0, 'name');
    setVisibleColumns(safeCols);
    localStorage.setItem(`inventory_columns_${inventoryType}`, JSON.stringify(safeCols));
    setShowColumnModal(false);
  };

  const toggleTempColumn = (key: string) => {
    if (key === 'stt' || key === 'name') return; // Mandatory/locked
    setTempColumns(prev => {
      if (prev.includes(key)) {
        return prev.filter(k => k !== key);
      } else {
        const allKeys = ALL_INVENTORY_COLUMNS.map(c => c.key);
        const next = [...prev, key];
        return next.sort((a, b) => allKeys.indexOf(a) - allKeys.indexOf(b));
      }
    });
  };

  const handleExportPdf = async () => {
    const element = document.getElementById('inventory-c53-document');
    if (!element) return;

    setExportingPdf(true);
    setTimeout(async () => {
      try {
        const typePrefix = 
          inventoryType === 'DUOC' ? 'DUOC' :
          inventoryType === 'CNTT' ? 'CNTT' :
          inventoryType === 'TCHC_HC' ? 'TCHC_HC' :
          inventoryType === 'TCHC_TOANHA' ? `TCHC_Tang_${selectedFloor.replace(/\s+/g, '_')}` :
          'KHOA_PHONG';
        const deptPrefix = currentDept ? currentDept.code : typePrefix;
        const filename = `BienBan_KiemKe_${deptPrefix}_2026.pdf`;

        const opt = {
          margin: [6, 6, 6, 6],
          filename: filename,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2, 
            useCORS: true, 
            logging: false,
            letterRendering: true
          },
          jsPDF: { 
            unit: 'mm', 
            format: 'a4', 
            orientation: 'landscape',
            compress: true
          },
          pagebreak: { 
            mode: ['css', 'legacy'],
            avoid: ['tr', '.signature-block']
          }
        };

        await html2pdf().set(opt).from(element).save();
      } catch (err) {
        console.error('PDF export error:', err);
        alert('Lỗi xuất PDF. Bạn có thể sử dụng nút "In / Lưu PDF qua Trình duyệt" để lưu file PDF chất lượng cao.');
      } finally {
        setExportingPdf(false);
      }
    }, 150);
  };

  // Load departments & committee members from API
  const loadInitialData = async () => {
    try {
      const [dRes, mRes] = await Promise.allSettled([
        apiGet('/departments'),
        apiGet('/committee')
      ]);

      if (dRes.status === 'fulfilled' && Array.isArray(dRes.value)) {
        setDepartments(dRes.value);
      }
      if (mRes.status === 'fulfilled' && Array.isArray(mRes.value)) {
        setCommitteeMembers(mRes.value);
      }
    } catch (e) {
      console.error('Error loading initial inventory data:', e);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load assets based on the selected inventory mode
  const loadInventoryAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', '1000');

      if (inventoryType === 'DUOC') {
        params.append('managingUnit', 'DUOC');
        if (selectedDeptId) params.append('departmentId', selectedDeptId);
      } else if (inventoryType === 'CNTT') {
        params.append('managingUnit', 'CNTT');
        if (selectedDeptId) params.append('departmentId', selectedDeptId);
      } else if (inventoryType === 'TCHC_HC') {
        params.append('managingUnit', 'TCHC');
        params.append('buildingAsset', '0');
        if (selectedDeptId) params.append('departmentId', selectedDeptId);
      } else if (inventoryType === 'TCHC_TOANHA') {
        params.append('managingUnit', 'TCHC');
        params.append('buildingAsset', '1');
        if (selectedFloor && selectedFloor !== 'Tất cả tầng') {
          params.append('floor', selectedFloor);
        }
      } else if (inventoryType === 'BY_DEPT' && selectedDeptId) {
        params.append('departmentId', selectedDeptId);
      }

      const res = await apiGet(`/assets?${params.toString()}`);
      if (res && res.assets) {
        const mapped = res.assets.map((a: Asset) => ({
          ...a,
          bookQuantity: a.bookQuantity || 1,
          actualQuantity: a.actualQuantity !== undefined && a.actualQuantity !== null ? a.actualQuantity : (a.bookQuantity || 1),
          quantityDifference: a.quantityDifference || 0,
          currentStatus: a.status || 'DANG_SU_DUNG',
          customNote: a.note || ''
        }));
        mapped.sort((a: any, b: any) =>
          (a.assetCode || '').localeCompare(b.assetCode || '', undefined, { numeric: true, sensitivity: 'base' })
        );
        setAssets(mapped);
      }
    } catch (e) {
      console.error('Error loading inventory assets:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventoryAssets();
  }, [inventoryType, selectedDeptId, selectedFloor]);

  // Handle actual quantity change
  const handleQuantityChange = (id: number, val: string) => {
    const num = parseInt(val) || 0;
    setAssets(prev => prev.map(item => {
      if (item.id === id) {
        const diff = num - item.bookQuantity;
        return {
          ...item,
          actualQuantity: num,
          quantityDifference: diff
        };
      }
      return item;
    }));
  };

  // Handle status change
  const handleStatusChange = (id: number, status: string) => {
    setAssets(prev => prev.map(item => item.id === id ? { ...item, currentStatus: status } : item));
  };

  // Handle note change
  const handleNoteChange = (id: number, note: string) => {
    setAssets(prev => prev.map(item => item.id === id ? { ...item, customNote: note } : item));
  };

  // Save changes to DB
  const handleSaveInventory = async () => {
    setSaving(true);
    try {
      const updates = assets.map(a => ({
        id: a.id,
        actualQuantity: a.actualQuantity,
        quantityDifference: a.quantityDifference,
        status: a.currentStatus,
        note: a.customNote
      }));

      await apiPost('/inventory/update-bulk-assets', { updates });
      alert('Đã lưu kết quả kiểm kê vào hệ thống thành công!');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi lưu kết quả kiểm kê');
    } finally {
      setSaving(false);
    }
  };

  // Committee Member Management
  const handleSaveMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember || !editingMember.fullName || !editingMember.position || !editingMember.role) {
      alert('Vui lòng điền đủ thông tin thành viên');
      return;
    }

    try {
      if (editingMember.id) {
        await apiPut(`/committee/${editingMember.id}`, editingMember);
      } else {
        await apiPost('/committee', editingMember);
      }
      setEditingMember(null);
      // Reload committee
      const updated = await apiGet('/committee');
      if (Array.isArray(updated)) setCommitteeMembers(updated);
      alert('Đã cập nhật thông tin thành viên hội đồng kiểm kê!');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi lưu thành viên');
    }
  };

  const handleDeleteMember = async (id: number) => {
    if (!window.confirm('Bạn có chắc muốn xóa thành viên này khỏi hội đồng?')) return;
    try {
      await apiDelete(`/committee/${id}`);
      setCommitteeMembers(prev => prev.filter(m => m.id !== id));
    } catch (e: any) {
      alert(e.message || 'Lỗi khi xóa');
    }
  };

  // Get dynamic committee members based on inventory type
  const president = committeeMembers.find(m => m.role === 'CHUTICH') || { fullName: 'Ông. Nguyễn Đại Vĩnh', position: 'Giám đốc' };
  const memberTCKT = committeeMembers.find(m => m.role === 'UYVIEN' || m.position.includes('TC - KT')) || { fullName: 'Ông. Hồ Phú Quảng', position: 'Trưởng phòng TC - KT' };
  
  // Team leader based on inventory division
  let teamLeader = { fullName: 'Bà. Mai Thị Tính', position: 'Phụ trách Khoa Dược - VTYT', titleRole: 'Tổ trưởng TBYT' };
  if (inventoryType === 'CNTT') {
    const leader = committeeMembers.find(m => m.role === 'TOTRUONG_CNTT' || m.position.includes('KHNV') || m.fullName.includes('Vũ'));
    teamLeader = leader ? { fullName: leader.fullName, position: leader.position, titleRole: 'Tổ trưởng Tổ CNTT' } : { fullName: 'Ông. Trần Văn Vũ', position: 'Trưởng phòng KHNV', titleRole: 'Tổ trưởng Tổ CNTT' };
  } else if (inventoryType === 'TCHC_HC' || inventoryType === 'TCHC_TOANHA') {
    const leader = committeeMembers.find(m => m.role === 'TOTRUONG_TCHC' || m.position.includes('TC - HC') || m.fullName.includes('Liên'));
    teamLeader = leader ? { fullName: leader.fullName, position: leader.position, titleRole: 'Tổ trưởng Tổ TCHC' } : { fullName: 'Ông. Trần Liên', position: 'Trưởng phòng TC - HC', titleRole: 'Tổ trưởng Tổ TCHC' };
  }

  // Department Representative
  const currentDept = departments.find(d => d.id.toString() === selectedDeptId);
  const deptRepMember = currentDept ? committeeMembers.find(m => m.departmentId === currentDept.id || m.scope === currentDept.code) : null;
  const deptRep = deptRepMember 
    ? { fullName: deptRepMember.fullName, position: deptRepMember.position }
    : currentDept 
      ? { fullName: `Đại diện ${currentDept.name}`, position: 'Trưởng / Phó đơn vị' }
      : { fullName: 'Đại diện các Khoa / Phòng', position: 'Trưởng / Phó đơn vị' };

  // Other team members scoped to the current active inventory team
  const teamMembers = committeeMembers.filter(m => {
    if (inventoryType === 'DUOC') {
      return m.role === 'THANHVIEN_DUOC' || m.scope === 'DUOC' || (m.role === 'THANHVIEN' && m.scope === 'ALL');
    }
    if (inventoryType === 'CNTT') {
      return m.role === 'THANHVIEN_CNTT' || m.scope === 'CNTT' || (m.role === 'THANHVIEN' && m.scope === 'ALL');
    }
    if (inventoryType === 'TCHC_HC' || inventoryType === 'TCHC_TOANHA') {
      return m.role === 'THANHVIEN_TCHC' || m.scope === 'TCHC' || (m.role === 'THANHVIEN' && m.scope === 'ALL');
    }
    return m.role === 'THANHVIEN' || m.role.startsWith('THANHVIEN');
  });

  // Filtered Assets
  const filteredAssets = assets.filter(a => 
    (a.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.assetCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.oldAssetCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.locationDetail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.floor || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Totals
  const totalBookQty = assets.reduce((sum, a) => sum + (a.bookQuantity || 0), 0);
  const totalActualQty = assets.reduce((sum, a) => sum + (a.actualQuantity || 0), 0);
  const totalDiffQty = assets.reduce((sum, a) => sum + (a.quantityDifference || 0), 0);
  const totalValue = assets.reduce((sum, a) => sum + ((a.originalPrice || 0) * (a.actualQuantity || 1)), 0);

  // Dynamic column visibility helpers
  const isCol = (key: string) => visibleColumns.includes(key);

  const idColKeys = ['stt', 'name', 'oldAssetCode', 'assetCode', 'yearInUse'];
  let lCode = 65;
  let nCode = 1;
  const colRefMap: Record<string, string> = {};
  visibleColumns.forEach(key => {
    if (idColKeys.includes(key)) {
      colRefMap[key] = String.fromCharCode(lCode++);
    } else {
      colRefMap[key] = String(nCode++);
    }
  });

  const qtyCols = ['bookQty', 'actualQty', 'diff'].filter(c => isCol(c));
  const hasSubHeader = qtyCols.length > 0;
  const prefixColCount = visibleColumns.filter(k => idColKeys.includes(k)).length;

  // Form title
  const formTitle = 
    inventoryType === 'DUOC' ? 'TRANG THIẾT BỊ Y TẾ (KHOA DƯỢC QUẢN LÝ)' :
    inventoryType === 'CNTT' ? (currentDept ? `THIẾT BỊ CNTT ${currentDept.name.toUpperCase()}` : 'THIẾT BỊ CÔNG NGHỆ THÔNG TIN (TỔ CNTT QUẢN LÝ)') :
    inventoryType === 'TCHC_HC' ? 'THIẾT BỊ HÀNH CHÍNH & CÔNG CỤ DỤNG CỤ (PHÒNG TCHC QUẢN LÝ)' :
    inventoryType === 'TCHC_TOANHA' ? `CƠ SỞ VẬT CHẤT & HẠ TẦNG TÒA NHÀ (${selectedFloor.toUpperCase()})` :
    `KHOA / PHÒNG: ${currentDept ? currentDept.name.toUpperCase() : 'TOÀN ĐƠN VỊ'}`;

  return (
    <div className="space-y-6 pb-16">
      {/* 1. TOP ACTION & TAB CONTROLS (Hidden when printing) */}
      <div className="print:hidden bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Mẫu số C53-HD</span>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Biên bản kiểm kê tài sản & CCDC 2026</h1>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Biên bản kiểm kê độc lập cho từng khối: <strong>Khoa Dược (TBYT)</strong>, <strong>Tổ CNTT</strong>, <strong>Phòng TCHC</strong> và từng khoa phòng
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowCommitteeModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              <Settings className="w-4 h-4 text-blue-600" /> Hội đồng theo QĐ
            </button>

            <button
              onClick={() => setShowSignaturesModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
              title="Tùy chỉnh 4 cột chữ ký in dưới biên bản kiểm kê C53-HD"
            >
              <Users className="w-4 h-4 text-blue-600" /> Cấu hình Người ký C53-HD
            </button>

            <button
              onClick={() => {
                setTempColumns(visibleColumns);
                setShowColumnModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer"
              title="Tùy chọn hiển thị các cột trong biên bản kiểm kê và file xuất Excel / PDF"
            >
              <SlidersHorizontal className="w-4 h-4 text-purple-600" />
              <span>Tùy chọn cột ({visibleColumns.length}/15)</span>
            </button>

            <button
              onClick={handleSaveInventory}
              disabled={saving || loading}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold shadow transition cursor-pointer"
            >
              <Save className="w-4 h-4" /> {saving ? 'Đang lưu...' : 'Lưu kết quả kiểm kê'}
            </button>

            <button
              onClick={() => {
                const params = new URLSearchParams();
                if (inventoryType === 'DUOC') params.append('managingUnit', 'DUOC');
                else if (inventoryType === 'CNTT') params.append('managingUnit', 'CNTT');
                else if (inventoryType === 'TCHC_HC') {
                  params.append('managingUnit', 'TCHC');
                  params.append('buildingAsset', '0');
                } else if (inventoryType === 'TCHC_TOANHA') {
                  params.append('managingUnit', 'TCHC');
                  params.append('buildingAsset', '1');
                  if (selectedFloor && selectedFloor !== 'Tất cả tầng') params.append('floor', selectedFloor);
                }
                if (selectedDeptId) params.append('departmentId', selectedDeptId);
                params.append('inventoryDate', inventoryDate);
                params.append('signaturesJson', JSON.stringify(signatures));
                params.append('visibleColumns', visibleColumns.join(','));

                window.open(`/api/export/c53-hd?${params.toString()}`, '_blank');
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-semibold shadow transition cursor-pointer"
              title="Xuất file Excel (.xlsx) chuẩn khổ ngang A4 theo biểu mẫu và các cột đã chọn"
            >
              <Download className="w-4 h-4" /> Xuất Excel (.xlsx)
            </button>

            <button
              onClick={handleExportPdf}
              disabled={exportingPdf || loading}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-semibold shadow transition cursor-pointer"
              title="Tải trực tiếp file PDF (.pdf) chuẩn khổ ngang A4"
            >
              <FileText className="w-4 h-4" /> {exportingPdf ? 'Đang tạo PDF...' : 'Xuất file PDF'}
            </button>

            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-semibold shadow transition cursor-pointer"
              title="In trực tiếp hoặc Lưu PDF qua Trình duyệt (khổ ngang A4)"
            >
              <Printer className="w-4 h-4" /> In / Xem trước
            </button>
          </div>
        </div>

        {/* 5 Distinct Inventory Mode Tabs - Scoped by User Role */}
        <div className="pt-2 border-t border-slate-100">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
            Chọn loại biên bản kiểm kê chuyên trách:
          </div>
          <div className="flex flex-wrap gap-2">
            {(!user || user.role === 'ADMIN' || user.role === 'MANAGER_DUOC') && (
              <button
                onClick={() => { setInventoryType('DUOC'); setSelectedDeptId(''); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  inventoryType === 'DUOC'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-slate-100 text-slate-700 hover:bg-emerald-50 hover:text-emerald-700'
                }`}
              >
                <Stethoscope className="w-4 h-4" />
                <span>1. BB Kiểm kê TBYT (Khoa Dược)</span>
              </button>
            )}

            {(!user || user.role === 'ADMIN' || user.role === 'MANAGER_CNTT') && (
              <button
                onClick={() => { setInventoryType('CNTT'); setSelectedDeptId(''); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  inventoryType === 'CNTT'
                    ? 'bg-blue-600 text-white shadow'
                    : 'bg-slate-100 text-slate-700 hover:bg-blue-50 hover:text-blue-700'
                }`}
              >
                <Monitor className="w-4 h-4" />
                <span>2. BB Kiểm kê Thiết bị CNTT (Tổ CNTT)</span>
              </button>
            )}

            {(!user || user.role === 'ADMIN' || user.role === 'MANAGER_TCHC') && (
              <button
                onClick={() => { setInventoryType('TCHC_HC'); setSelectedDeptId(''); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  inventoryType === 'TCHC_HC'
                    ? 'bg-amber-600 text-white shadow'
                    : 'bg-slate-100 text-slate-700 hover:bg-amber-50 hover:text-amber-700'
                }`}
              >
                <Building2 className="w-4 h-4" />
                <span>3. BB Kiểm kê Hành chính (TCHC)</span>
              </button>
            )}

            {(!user || user.role === 'ADMIN' || user.role === 'MANAGER_TCHC') && (
              <button
                onClick={() => { setInventoryType('TCHC_TOANHA'); setSelectedDeptId(''); }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  inventoryType === 'TCHC_TOANHA'
                    ? 'bg-orange-600 text-white shadow'
                    : 'bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-orange-700'
                }`}
              >
                <Layers className="w-4 h-4" />
                <span>4. BB Kiểm kê Hạ tầng Tòa nhà (Theo Tầng)</span>
              </button>
            )}

            {(!user || user.role === 'ADMIN' || user.role === 'DEPARTMENT') && (
              <button
                onClick={() => { 
                  setInventoryType('BY_DEPT'); 
                  if (user?.role === 'DEPARTMENT' && user.departmentId) {
                    setSelectedDeptId(user.departmentId.toString());
                  } else if (!selectedDeptId && departments.length) {
                    setSelectedDeptId(departments[0].id.toString());
                  }
                }}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                  inventoryType === 'BY_DEPT'
                    ? 'bg-purple-600 text-white shadow'
                    : 'bg-slate-100 text-slate-700 hover:bg-purple-50 hover:text-purple-700'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>{user?.role === 'DEPARTMENT' ? `BB Kiểm kê Tài sản ${user.fullName}` : '5. BB Kiểm kê Theo Khoa / Phòng'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Filters for Department or Floor */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {inventoryType === 'TCHC_TOANHA' ? (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Chọn Tầng Tòa Nhà</label>
              <select
                value={selectedFloor}
                onChange={e => setSelectedFloor(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                {FLOORS.map(fl => (
                  <option key={fl} value={fl}>{fl}</option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                {inventoryType === 'BY_DEPT' ? 'Khoa / Phòng cần kiểm kê (*)' : 'Lọc theo Khoa / Phòng sử dụng (Tùy chọn)'}
              </label>
              {user?.role === 'DEPARTMENT' ? (
                <div className="w-full px-3.5 py-2 border border-slate-200 bg-slate-100 rounded-xl text-xs sm:text-sm font-bold text-slate-800">
                  {user.fullName || departments.find(d => d.id === user.departmentId)?.name || 'Khoa / Phòng của bạn'}
                </div>
              ) : (
                <select
                  value={selectedDeptId}
                  onChange={e => setSelectedDeptId(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-800 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {inventoryType !== 'BY_DEPT' && <option value="">Tất cả khoa / phòng</option>}
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.code} - {d.name.replace(/\s*\((?:Cơ sở|Cs)\s*[12]\)/gi, '')}</option>
                  ))}
                </select>
              )}
            </div>
          )}

          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Tìm nhanh thiết bị</label>
            <input
              type="text"
              placeholder="Tìm theo mã, tên, vị trí..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-8" />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ngày lập biên bản</label>
            <input
              type="text"
              value={inventoryDate}
              onChange={e => setInventoryDate(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs sm:text-sm font-medium text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. BIỂU MẪU CHUẨN C53-HD (Hiển thị trực quan & In ấn chuẩn văn bản nhà nước) */}
      {/* ========================================================================= */}
      <div 
        id="inventory-c53-document" 
        className="bg-white p-6 sm:p-10 rounded-2xl shadow-md border border-slate-200 print:shadow-none print:border-none print:p-0 font-serif text-slate-900 leading-normal"
      >
        {/* Header: Đơn vị & Mẫu số C53-HD */}
        <div className="flex justify-between items-start text-xs sm:text-sm font-sans mb-4">
          <div>
            <div className="font-bold text-slate-900 uppercase">Đơn vị: Trung tâm Kiểm soát bệnh tật TP Đà Nẵng</div>
            <div className="text-slate-700">Mã ĐV SDNS: <strong>1127644</strong></div>
          </div>
          <div className="text-right">
            <div className="font-bold text-slate-900">Mẫu số C53-HD</div>
            <div className="text-[11px] text-slate-500 italic">(Ban hành theo TT số 107/2017/TT-BTC)</div>
          </div>
        </div>

        {/* Tiêu đề Biên Bản */}
        <div className="text-center my-6">
          <h2 className="text-lg sm:text-2xl font-bold uppercase tracking-wide">
            BIÊN BẢN KIỂM KÊ TÀI SẢN CỐ ĐỊNH NĂM 2026
          </h2>
          <div className="text-base sm:text-lg font-bold text-blue-900 uppercase mt-1">
            {formTitle}
          </div>
          <div className="text-xs sm:text-sm text-slate-700 mt-2 font-sans space-y-1">
            <p className="italic">
              - Căn cứ Quyết định số <strong>05/QĐ-TTKSBT</strong> ngày 05/01/2026 của Giám đốc CDC Đà Nẵng về việc thành lập Hội đồng kiểm kê tài sản năm 2026.
            </p>
            <p className="italic">
              - Nguồn kinh phí hình thành: <strong>Ngân sách Nhà nước cấp & Quỹ phát triển hoạt động sự nghiệp</strong>
            </p>
            <p className="italic">
              - Hôm nay, ngày {inventoryDate}, tại Trung tâm Kiểm soát bệnh tật TP Đà Nẵng, chúng tôi gồm:
            </p>
          </div>
        </div>

        {/* Thành phần Hội đồng & Tổ kiểm kê tự động điền */}
        <div className="bg-slate-50/70 p-4 sm:p-5 rounded-xl border border-slate-200 text-xs sm:text-sm font-sans mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2.5 gap-x-6">
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span>1. <strong>{president.fullName}</strong> - {president.position}</span>
              <span className="font-bold text-blue-700">Chủ tịch Hội đồng</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span>2. <strong>{memberTCKT.fullName}</strong> - {memberTCKT.position}</span>
              <span className="font-bold text-slate-700">Ủy viên</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span>3. <strong>{inventoryType === 'CNTT' ? 'Ông. Trần Văn Vũ' : teamLeader.fullName}</strong> - {inventoryType === 'CNTT' ? 'Trưởng phòng KHNV' : teamLeader.position}</span>
              <span className="font-bold text-emerald-700">{inventoryType === 'CNTT' ? 'Tổ trưởng' : teamLeader.titleRole}</span>
            </div>
            <div className="flex justify-between border-b border-slate-200 pb-1">
              <span>4. <strong>{deptRep.fullName}</strong> - {deptRep.position}</span>
              <span className="font-bold text-slate-700">Đại diện Khoa/Phòng</span>
            </div>
            <div className="md:col-span-2 pt-1 text-slate-700">
              <span>5. <strong>Thành viên tổ kiểm kê:</strong> {
                teamMembers.length > 0
                  ? teamMembers.map(m => `${m.fullName} (${m.position})`).join(', ')
                  : 'Ông. Trần Văn Vũ, Ông. Phan Thanh Hoàn, Bà. Trần Thị Liên, Bà. Huỳnh Thị Thanh Tú'
              }</span>
            </div>
          </div>
          <div className="mt-3 text-xs italic text-slate-600">
            Cùng tiến hành kiểm kê tài sản, kết quả như sau:
          </div>
        </div>

        {/* Bảng Dữ Liệu Kiểm Kê Tùy Biến Cột (Chuẩn C53-HD) */}
        <div className="overflow-x-auto border border-slate-400 rounded-lg">
          <table className="w-full text-xs font-sans border-collapse text-left">
            <thead>
              <tr className="bg-slate-100 text-center font-bold border-b border-slate-400 divide-x divide-slate-300">
                {isCol('stt') && <th rowSpan={hasSubHeader ? 2 : 1} className="p-2 w-10">STT</th>}
                {isCol('name') && <th rowSpan={hasSubHeader ? 2 : 1} className="p-2 min-w-[200px]">TÀI SẢN</th>}
                {isCol('oldAssetCode') && <th rowSpan={hasSubHeader ? 2 : 1} className="p-2 min-w-[105px]">Mã số cũ</th>}
                {isCol('assetCode') && <th rowSpan={hasSubHeader ? 2 : 1} className="p-2 min-w-[110px]">Mã số mới</th>}
                {isCol('yearInUse') && <th rowSpan={hasSubHeader ? 2 : 1} className="p-2 min-w-[65px]">Năm đưa vào SD</th>}
                
                {hasSubHeader && (
                  <th colSpan={qtyCols.length} className="p-1 border-b border-slate-300 bg-slate-100">
                    {qtyCols.length === 1 && isCol('actualQty') ? 'Thực tế KK' : 'Số lượng tài sản'}
                  </th>
                )}

                {isCol('price') && <th rowSpan={hasSubHeader ? 2 : 1} className="p-2 min-w-[90px]">Đơn giá (đ)</th>}
                {isCol('total') && <th rowSpan={hasSubHeader ? 2 : 1} className="p-2 min-w-[105px]">Thành tiền (đ)</th>}
                {isCol('unit') && <th rowSpan={hasSubHeader ? 2 : 1} className="p-2 min-w-[100px]">Bộ phận quản lý</th>}
                {isCol('user') && <th rowSpan={hasSubHeader ? 2 : 1} className="p-2 min-w-[130px]">Nơi sử dụng hoặc người SD</th>}
                {isCol('status') && <th rowSpan={hasSubHeader ? 2 : 1} className="p-2 min-w-[110px]">Tình trạng sử dụng</th>}
                {isCol('location') && <th rowSpan={hasSubHeader ? 2 : 1} className="p-2 min-w-[100px]">Nơi TS mới chuyển đến</th>}
                {isCol('note') && <th rowSpan={hasSubHeader ? 2 : 1} className="p-2 min-w-[120px]">Ghi chú</th>}
              </tr>

              {hasSubHeader && (
                <tr className="bg-slate-100 text-center font-bold border-b border-slate-400 divide-x divide-slate-300">
                  {isCol('bookQty') && (
                    <th className="p-1 min-w-[60px] bg-slate-50 text-slate-800">Sổ sách</th>
                  )}
                  {isCol('actualQty') && (
                    <th className="p-1 min-w-[65px] bg-blue-50/70 text-blue-900">
                      {qtyCols.length === 1 ? 'Số lượng' : 'Thực tế'}
                    </th>
                  )}
                  {isCol('diff') && (
                    <th className="p-1 min-w-[60px] bg-amber-50/70 text-amber-900">Chênh lệch</th>
                  )}
                </tr>
              )}

              {/* Reference Row: A, B, C... 1, 2, 3... */}
              <tr className="bg-slate-200 text-center text-[10px] font-bold border-b border-slate-400 divide-x divide-slate-300 text-slate-700">
                {visibleColumns.map(key => (
                  <td key={key} className={`p-1 ${key === 'actualQty' ? 'bg-blue-100/60' : ''}`}>
                    {colRefMap[key]}
                  </td>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="text-center py-16 text-slate-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Đang tải danh mục kiểm kê...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="text-center py-16 text-slate-400 font-medium">
                    Không có tài sản nào trong phân loại hoặc khoa phòng được chọn.
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset, idx) => (
                  <tr key={asset.id} className="hover:bg-blue-50/30 divide-x divide-slate-200">
                    {isCol('stt') && (
                      <td className="p-2 text-center font-medium text-slate-600">{idx + 1}</td>
                    )}
                    {isCol('name') && (
                      <td className="p-2 font-semibold text-slate-900">
                        <div>{asset.name}</div>
                        {asset.specifications && (
                          <div className="text-[10px] text-slate-500 font-normal">{asset.specifications}</div>
                        )}
                      </td>
                    )}
                    {isCol('oldAssetCode') && (
                      <td className="p-2 font-mono text-center text-amber-800 text-[11px] font-medium">
                        {asset.oldAssetCode || '—'}
                      </td>
                    )}
                    {isCol('assetCode') && (
                      <td className="p-2 font-mono font-bold text-blue-700 text-center">
                        {asset.assetCode}
                      </td>
                    )}
                    {isCol('yearInUse') && (
                      <td className="p-2 text-center text-slate-700">{asset.yearInUse || '—'}</td>
                    )}
                    
                    {/* Sổ sách */}
                    {isCol('bookQty') && (
                      <td className="p-2 text-center text-slate-700 font-medium">
                        {asset.bookQuantity || 1}
                      </td>
                    )}

                    {/* Thực tế KK (Số lượng) */}
                    {isCol('actualQty') && (
                      <td className="p-1 text-center bg-blue-50/20">
                        {exportingPdf ? (
                          <span className="font-bold text-slate-900">{asset.actualQuantity}</span>
                        ) : (
                          <>
                            <span className="hidden print:inline font-bold text-slate-900">{asset.actualQuantity}</span>
                            <input
                              type="number"
                              min="0"
                              value={asset.actualQuantity}
                              onChange={e => handleQuantityChange(asset.id, e.target.value)}
                              className="print:hidden w-14 text-center font-bold text-blue-900 bg-white border border-blue-300 rounded px-1 py-0.5 focus:ring-1 focus:ring-blue-500 outline-none"
                            />
                          </>
                        )}
                      </td>
                    )}

                    {/* Chênh lệch */}
                    {isCol('diff') && (
                      <td className={`p-2 text-center font-bold ${
                        (asset.quantityDifference || 0) > 0 ? 'text-emerald-700' :
                        (asset.quantityDifference || 0) < 0 ? 'text-rose-700' : 'text-slate-500'
                      }`}>
                        {(asset.quantityDifference || 0) !== 0
                          ? ((asset.quantityDifference || 0) > 0 ? `+${asset.quantityDifference}` : asset.quantityDifference)
                          : '0'}
                      </td>
                    )}

                    {/* Đơn giá */}
                    {isCol('price') && (
                      <td className="p-2 text-right text-slate-700 font-mono">
                        {asset.originalPrice ? Number(asset.originalPrice).toLocaleString('vi-VN') : '—'}
                      </td>
                    )}

                    {/* Thành tiền */}
                    {isCol('total') && (
                      <td className="p-2 text-right font-bold text-slate-900 font-mono">
                        {asset.originalPrice 
                          ? (Number(asset.originalPrice) * (asset.actualQuantity || 1)).toLocaleString('vi-VN')
                          : '—'}
                      </td>
                    )}

                    {/* Bộ phận quản lý */}
                    {isCol('unit') && (
                      <td className="p-2 text-slate-700 text-center">
                        {asset.managingUnit === 'DUOC' ? 'Khoa Dược' :
                         asset.managingUnit === 'CNTT' ? 'Tổ CNTT' :
                         asset.source || asset.department?.name || 'Phòng TCHC'}
                      </td>
                    )}

                    {/* Nơi sử dụng */}
                    {isCol('user') && (
                      <td className="p-2 text-slate-700">
                        <div>{asset.locationDetail || asset.assignedTo || asset.department?.name || 'Tại đơn vị'}</div>
                      </td>
                    )}

                    {/* Tình trạng sử dụng */}
                    {isCol('status') && (
                      <td className="p-1 text-center">
                        {exportingPdf ? (
                          <span className="font-medium text-slate-900">
                            {asset.currentStatus === 'DANG_SU_DUNG' ? 'Đang sử dụng' :
                             asset.currentStatus === 'HONG' ? 'Hỏng' :
                             asset.currentStatus === 'CHO_THANH_LY' ? 'ĐN thanh lý' :
                             asset.currentStatus === 'BAO_TRI' ? 'Bảo trì' :
                             asset.currentStatus === 'KHONG_SU_DUNG' ? 'Không sử dụng' : (asset.currentStatus || 'Đang sử dụng')}
                          </span>
                        ) : (
                          <>
                            <span className="hidden print:inline font-medium text-slate-900">
                              {asset.currentStatus === 'DANG_SU_DUNG' ? 'Đang sử dụng' :
                               asset.currentStatus === 'HONG' ? 'Hỏng' :
                               asset.currentStatus === 'CHO_THANH_LY' ? 'ĐN thanh lý' :
                               asset.currentStatus === 'BAO_TRI' ? 'Bảo trì' :
                               asset.currentStatus === 'KHONG_SU_DUNG' ? 'Không sử dụng' : (asset.currentStatus || 'Đang sử dụng')}
                            </span>
                            <select
                              value={asset.currentStatus}
                              onChange={e => handleStatusChange(asset.id, e.target.value)}
                              className="print:hidden w-full text-xs border border-slate-200 rounded px-1.5 py-1 bg-white font-medium focus:ring-1 focus:ring-blue-500"
                            >
                              <option value="DANG_SU_DUNG">Đang sử dụng</option>
                              <option value="HONG">Hỏng</option>
                              <option value="BAO_TRI">Bảo trì</option>
                              <option value="CHO_THANH_LY">ĐN thanh lý</option>
                              <option value="KHONG_SU_DUNG">Không sử dụng</option>
                            </select>
                          </>
                        )}
                      </td>
                    )}

                    {/* Nơi chuyển đến */}
                    {isCol('location') && (
                      <td className="p-2 text-center text-slate-600">{asset.location || 'Cơ sở 1'}</td>
                    )}

                    {/* Ghi chú */}
                    {isCol('note') && (
                      <td className="p-1">
                        {exportingPdf ? (
                          <span className="text-[11px] text-slate-800">{asset.customNote || ''}</span>
                        ) : (
                          <>
                            <span className="hidden print:inline text-[11px] text-slate-800">{asset.customNote || ''}</span>
                            <input
                              type="text"
                              value={asset.customNote || ''}
                              onChange={e => handleNoteChange(asset.id, e.target.value)}
                              placeholder="Ghi chú..."
                              className="print:hidden w-full text-xs border border-slate-200 rounded px-1.5 py-1 bg-white focus:ring-1 focus:ring-blue-500"
                            />
                          </>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
            
            {/* Tổng cộng footer */}
            <tfoot>
              <tr className="bg-slate-100 font-bold border-t-2 border-slate-400 divide-x divide-slate-300">
                <td colSpan={prefixColCount} className="p-2 text-center uppercase tracking-wider">
                  TỔNG CỘNG ({filteredAssets.length} thiết bị)
                </td>
                {visibleColumns.slice(prefixColCount).map(key => {
                  if (key === 'bookQty') {
                    return <td key={key} className="p-2 text-center text-slate-800">{totalBookQty}</td>;
                  }
                  if (key === 'actualQty') {
                    return <td key={key} className="p-2 text-center text-blue-900 bg-blue-100/50">{totalActualQty}</td>;
                  }
                  if (key === 'diff') {
                    return (
                      <td key={key} className="p-2 text-center font-bold text-slate-800">
                        {totalDiffQty !== 0 ? (totalDiffQty > 0 ? `+${totalDiffQty}` : totalDiffQty) : '0'}
                      </td>
                    );
                  }
                  if (key === 'price') {
                    return <td key={key} className="p-2"></td>;
                  }
                  if (key === 'total') {
                    return (
                      <td key={key} className="p-2 text-right font-mono text-blue-900">
                        {totalValue > 0 ? totalValue.toLocaleString('vi-VN') + ' đ' : '—'}
                      </td>
                    );
                  }
                  return <td key={key} className="p-2"></td>;
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* 3. CHỮ KÝ PHÊ DUYỆT BIÊN BẢN (Khớp chuẩn 4 khối chức danh CDC) */}
        <div className="mt-8 pt-4 font-sans text-xs sm:text-sm">
          <div className="text-right italic mb-4 pr-6">
            Đà Nẵng, ngày {inventoryDate.split('/')[0]} tháng {inventoryDate.split('/')[1] || '01'} năm {inventoryDate.split('/')[2] || '2026'}
          </div>

          <div className="grid grid-cols-4 gap-4 text-center font-sans">
            {/* Cột 1: Tổ kiểm kê */}
            <div>
              <div className="font-bold uppercase text-slate-900">{signatures.membersTitle || 'THÀNH VIÊN TỔ KIỂM KÊ'}</div>
              <div className="text-[11px] italic text-slate-500 mb-6">(Ký, ghi rõ họ tên)</div>
              <div className="text-left text-xs text-slate-700 space-y-1.5 font-sans pl-2 whitespace-pre-line">
                {(signatures.membersList || 'Trần Văn Vũ\nPhan Thanh Hoàn\nTrần Thị Liên\nHuỳnh Thị Thanh Tú')
                  .split('\n')
                  .map((mem: string, i: number) => (
                    <div key={i} className="flex justify-between items-center text-xs">
                      <span>- {mem.replace(/^-\s*/, '')}</span>
                      <span className="text-slate-400 tracking-wider">........................</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Cột 2: Đại diện Khoa/Phòng */}
            <div>
              <div className="font-bold uppercase text-slate-900">
                {currentDept ? `ĐẠI DIỆN ${currentDept.name.toUpperCase()}` : signatures.leaderTitle}
              </div>
              <div className="text-[11px] italic text-slate-500 mb-20">(Ký, ghi rõ họ tên)</div>
              <div className="font-bold text-slate-900">{signatures.leaderName}</div>
            </div>

            {/* Cột 3: Trưởng phòng TCKT */}
            <div>
              <div className="font-bold uppercase text-slate-900">{signatures.tcktTitle || 'TRƯỞNG PHÒNG TC - KT'}</div>
              <div className="text-[11px] italic text-slate-500 mb-20">(Ký, ghi rõ họ tên)</div>
              <div className="font-bold text-slate-900">{signatures.tcktName || 'Hồ Phú Quảng'}</div>
            </div>

            {/* Cột 4: Giám đốc / Chủ tịch Hội đồng */}
            <div>
              <div className="font-bold uppercase text-slate-900">{signatures.presidentTitle || 'CHỦ TỊCH HỘI ĐỒNG'}</div>
              <div className="text-[11px] italic text-slate-500 mb-20">(Ký, đóng dấu)</div>
              <div className="font-bold text-slate-900">{signatures.presidentName || 'Nguyễn Đại Vĩnh'}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. MODAL QUẢN LÝ THÀNH VIÊN TỔ / HỘI ĐỒNG KIỂM KÊ (Thêm, Sửa, Gán vị trí) */}
      {/* ========================================================================= */}
      {showCommitteeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-lg text-slate-900">Cấu hình Hội đồng & Thành viên Tổ kiểm kê</h3>
              </div>
              <button 
                onClick={() => { setShowCommitteeModal(false); setEditingMember(null); }}
                className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Add / Edit Member Form */}
              <form onSubmit={handleSaveMember} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="text-xs font-bold text-slate-700 uppercase">
                  {editingMember?.id ? 'Chỉnh sửa thông tin thành viên' : 'Thêm thành viên mới vào Hội đồng'}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Họ và tên (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Ông. Nguyễn Văn A"
                      value={editingMember?.fullName || ''}
                      onChange={e => setEditingMember(prev => ({ ...prev, fullName: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Chức vụ (*)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Giám đốc, Trưởng phòng..."
                      value={editingMember?.position || ''}
                      onChange={e => setEditingMember(prev => ({ ...prev, position: e.target.value }))}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">Vai trò trong Tổ (*)</label>
                    <select
                      value={editingMember?.role || 'THANHVIEN'}
                      onChange={e => setEditingMember(prev => ({ ...prev, role: e.target.value as any }))}
                      className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CHUTICH">Chủ tịch Hội đồng</option>
                      <option value="TOTRUONG_TBYT">Tổ trưởng Tổ TBYT (Khoa Dược)</option>
                      <option value="TOTRUONG_CNTT">Tổ trưởng Tổ CNTT</option>
                      <option value="TOTRUONG_TCHC">Tổ trưởng Tổ TCHC</option>
                      <option value="UYVIEN">Ủy viên / Thành viên TCKT</option>
                      <option value="DAIDIEN_KHOA">Đại diện Khoa / Phòng</option>
                      <option value="THANHVIEN">Thành viên tổ kiểm kê</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  {editingMember && (
                    <button
                      type="button"
                      onClick={() => setEditingMember(null)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-lg"
                    >
                      Hủy bỏ
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm"
                  >
                    {editingMember?.id ? 'Cập nhật thành viên' : 'Thêm thành viên'}
                  </button>
                </div>
              </form>

              {/* Members List Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-2.5">Họ và tên</th>
                      <th className="p-2.5">Chức vụ</th>
                      <th className="p-2.5">Vai trò phân công</th>
                      <th className="p-2.5 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {committeeMembers.map(m => (
                      <tr key={m.id} className="hover:bg-slate-50">
                        <td className="p-2.5 font-bold text-slate-900">{m.fullName}</td>
                        <td className="p-2.5 text-slate-600">{m.position}</td>
                        <td className="p-2.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            m.role === 'CHUTICH' ? 'bg-purple-100 text-purple-800' :
                            m.role.startsWith('TOTRUONG') ? 'bg-emerald-100 text-emerald-800' :
                            m.role === 'UYVIEN' ? 'bg-blue-100 text-blue-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {m.role === 'CHUTICH' ? 'Chủ tịch Hội đồng' :
                             m.role === 'TOTRUONG_TBYT' ? 'Tổ trưởng TBYT' :
                             m.role === 'TOTRUONG_CNTT' ? 'Tổ trưởng CNTT' :
                             m.role === 'TOTRUONG_TCHC' ? 'Tổ trưởng TCHC' :
                             m.role === 'UYVIEN' ? 'Ủy viên TCKT' :
                             m.role === 'DAIDIEN_KHOA' ? 'Đại diện Khoa' : 'Thành viên tổ'}
                          </span>
                        </td>
                        <td className="p-2.5 text-right space-x-1">
                          <button
                            onClick={() => setEditingMember(m)}
                            className="p-1 hover:bg-slate-200 rounded text-slate-600"
                            title="Sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteMember(m.id)}
                            className="p-1 hover:bg-red-100 rounded text-red-600"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowCommitteeModal(false)}
                className="px-5 py-2 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-xl cursor-pointer"
              >
                Đóng & Áp dụng biểu mẫu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 5: TÙY CHỈNH 4 CỘT CHỮ KÝ DƯỚI BIÊN BẢN KIỂM KÊ C53-HD             */}
      {/* ========================================================================= */}
      {showSignaturesModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Cấu Hình 4 Vị Trí Ký Dưới Biên Bản C53-HD</h3>
                <p className="text-xs text-slate-500 mt-0.5">Tùy chỉnh chức danh & danh sách họ tên người ký in trên bản A4</p>
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
              {/* Quick Presets */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-600 mr-1">Gợi ý nhanh theo khối:</span>
                <button
                  type="button"
                  onClick={() => setSignatures({
                    ...signatures,
                    leaderTitle: 'TỔ TRƯỞNG TỔ CNTT',
                    leaderName: 'KTV. Phan Thanh Hoàn'
                  })}
                  className="px-2 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold text-[11px] hover:bg-blue-200 cursor-pointer"
                >
                  💻 Khối CNTT
                </button>
                <button
                  type="button"
                  onClick={() => setSignatures({
                    ...signatures,
                    leaderTitle: 'TRƯỞNG KHOA DƯỢC - VTYT',
                    leaderName: 'DS. Mai Thị Tính'
                  })}
                  className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-lg font-bold text-[11px] hover:bg-emerald-200 cursor-pointer"
                >
                  🩺 Khối Dược (TBYT)
                </button>
                <button
                  type="button"
                  onClick={() => setSignatures({
                    ...signatures,
                    leaderTitle: 'TRƯỞNG PHÒNG TỔ CHỨC - HÀNH CHÍNH',
                    leaderName: 'Ông. Trần Liên'
                  })}
                  className="px-2 py-1 bg-amber-100 text-amber-800 rounded-lg font-bold text-[11px] hover:bg-amber-200 cursor-pointer"
                >
                  🏢 Khối TCHC
                </button>
              </div>

              {/* 1. Cột 1: Tổ kiểm kê */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">1. Cột 1 (Thành viên Tổ kiểm kê)</div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tiêu đề cột</label>
                  <input
                    type="text"
                    value={signatures.membersTitle}
                    onChange={e => setSignatures({ ...signatures, membersTitle: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Danh sách thành viên (Mỗi người 1 dòng)</label>
                  <textarea
                    rows={4}
                    value={signatures.membersList}
                    onChange={e => setSignatures({ ...signatures, membersList: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* 2. Cột 2: Tổ trưởng / Đại diện đơn vị */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">2. Cột 2 (Tổ trưởng chuyên trách / Đại diện Khoa Phòng)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Chức danh</label>
                    <input
                      type="text"
                      value={signatures.leaderTitle}
                      onChange={e => setSignatures({ ...signatures, leaderTitle: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Họ và tên</label>
                    <input
                      type="text"
                      value={signatures.leaderName}
                      onChange={e => setSignatures({ ...signatures, leaderName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* 3. Cột 3: Phòng TCKT */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">3. Cột 3 (Đại diện Phòng Tài chính - Kế toán)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Chức danh</label>
                    <input
                      type="text"
                      value={signatures.tcktTitle}
                      onChange={e => setSignatures({ ...signatures, tcktTitle: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Họ và tên</label>
                    <input
                      type="text"
                      value={signatures.tcktName}
                      onChange={e => setSignatures({ ...signatures, tcktName: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Cột 4: Chủ tịch Hội đồng */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="font-bold text-slate-800">4. Cột 4 (Chủ tịch Hội đồng kiểm kê / Giám đốc)</div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Chức danh</label>
                    <input
                      type="text"
                      value={signatures.presidentTitle}
                      onChange={e => setSignatures({ ...signatures, presidentTitle: e.target.value })}
                      className="w-full p-2 border border-slate-300 rounded-lg bg-white font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Họ và tên</label>
                    <input
                      type="text"
                      value={signatures.presidentName}
                      onChange={e => setSignatures({ ...signatures, presidentName: e.target.value })}
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

      {/* ========================================================================= */}
      {/* MODAL 6: TÙY CHỌN CỘT HIỂN THỊ VÀO TRONG BIÊN BẢN KIỂM KÊ (C53-HD)         */}
      {/* ========================================================================= */}
      {showColumnModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-slate-900">
                    Tùy chọn cột Biên bản kiểm kê C53-HD
                  </h3>
                  <p className="text-xs text-slate-500">
                    Áp dụng cho: <span className="font-semibold text-purple-700">
                      {inventoryType === 'CNTT' ? 'Tổ CNTT' :
                       inventoryType === 'DUOC' ? 'Khoa Dược (TBYT)' :
                       inventoryType === 'TCHC_HC' ? 'Phòng TCHC (Hành chính)' :
                       inventoryType === 'TCHC_TOANHA' ? 'Phòng TCHC (Hạ tầng Tòa nhà)' : 'Khoa / Phòng'}
                    </span> (Lưu riêng theo từng khối)
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setShowColumnModal(false)}
                className="p-1.5 hover:bg-slate-200/60 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Presets */}
            <div className="p-4 border-b border-slate-100 bg-slate-50 space-y-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Gợi ý mẫu cột nhanh:
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTempColumns(DEFAULT_VISIBLE_COLUMNS)}
                  className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  ⭐ Chuẩn CDC 13 cột (Khuyên dùng)
                </button>
                <button
                  type="button"
                  onClick={() => setTempColumns(ALL_INVENTORY_COLUMNS.map(c => c.key))}
                  className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  📋 Đầy đủ 15 cột (Kèm Sổ sách & Chênh lệch)
                </button>
                <button
                  type="button"
                  onClick={() => setTempColumns(['stt', 'name', 'assetCode', 'actualQty', 'user', 'status', 'note'])}
                  className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  ⚡ Rút gọn kiểm đếm hiện trường (7 cột)
                </button>
                <button
                  type="button"
                  onClick={() => setTempColumns(['stt', 'name', 'assetCode', 'actualQty', 'price', 'total', 'unit', 'user', 'status', 'note'])}
                  className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  💰 Báo cáo Giá trị & Kế toán (10 cột)
                </button>
              </div>
            </div>

            {/* Column Checkboxes grouped */}
            <div className="p-5 overflow-y-auto space-y-5">
              {COLUMN_GROUPS.map(grp => {
                const groupCols = ALL_INVENTORY_COLUMNS.filter(c => c.group === grp.id);
                return (
                  <div key={grp.id} className="space-y-2">
                    <div className="text-xs font-bold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-1">
                      <span>{grp.title}</span>
                      <span className="text-[11px] text-slate-400 font-normal">
                        {groupCols.filter(c => tempColumns.includes(c.key)).length}/{groupCols.length} đang bật
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {groupCols.map(col => {
                        const isChecked = tempColumns.includes(col.key);
                        const isLocked = !!col.required;
                        return (
                          <label
                            key={col.key}
                            className={`flex items-start gap-2.5 p-2.5 rounded-xl border text-xs transition cursor-pointer select-none ${
                              isChecked
                                ? 'bg-purple-50/50 border-purple-200 text-slate-900'
                                : 'bg-slate-50/50 border-slate-200 text-slate-600 hover:bg-slate-50'
                            } ${isLocked ? 'opacity-80 cursor-not-allowed' : ''}`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              disabled={isLocked}
                              onChange={() => toggleTempColumn(col.key)}
                              className="mt-0.5 rounded text-purple-600 focus:ring-purple-500 w-4 h-4 cursor-pointer disabled:cursor-not-allowed"
                            />
                            <div className="flex-1">
                              <div className="font-semibold flex items-center gap-1.5">
                                <span>{col.label}</span>
                                {isLocked && (
                                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-medium">Bắt buộc</span>
                                )}
                              </div>
                              {col.desc && (
                                <p className="text-[11px] text-slate-400 mt-0.5">{col.desc}</p>
                              )}
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-600">
                Đang chọn: <strong className="text-purple-700 font-bold">{tempColumns.length}</strong> / 15 cột
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowColumnModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveColumns(tempColumns)}
                  className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" /> Áp dụng cấu hình cột
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
