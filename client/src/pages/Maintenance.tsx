import React, { useState, useEffect } from 'react';
import { Plus, Search, Wrench, CheckCircle2, Clock, AlertTriangle, User, Calendar, DollarSign, Building } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../lib/api';
import { Asset, Department, MaintenanceRequest, PRIORITY_LABELS } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function Maintenance() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);

  // Form State (Specifically including requestedBy as user requested)
  const [assetId, setAssetId] = useState('');
  const [requestedBy, setRequestedBy] = useState(user?.fullName || '');
  const [departmentId, setDepartmentId] = useState(user?.departmentId ? user.departmentId.toString() : '');
  const [issueDescription, setIssueDescription] = useState('');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  
  // Update form state
  const [statusToUpdate, setStatusToUpdate] = useState('');
  const [repairCost, setRepairCost] = useState('');
  const [repairVendor, setRepairVendor] = useState('');
  const [repairNote, setRepairNote] = useState('');

  // Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [mRes, aRes, dRes] = await Promise.allSettled([
        apiGet('/maintenance'),
        apiGet('/assets?limit=100'),
        apiGet('/departments')
      ]);

      if (mRes.status === 'fulfilled' && Array.isArray(mRes.value)) setRequests(mRes.value);
      if (aRes.status === 'fulfilled' && aRes.value?.assets) setAssets(aRes.value.assets);
      if (dRes.status === 'fulfilled' && Array.isArray(dRes.value)) setDepartments(dRes.value);
    } catch (e) {
      console.error('Error fetching maintenance data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !requestedBy || !issueDescription) {
      alert('Vui lòng điền đầy đủ: Thiết bị, Tên người đề nghị và Mô tả sự cố!');
      return;
    }

    try {
      await apiPost('/maintenance', {
        assetId: parseInt(assetId),
        requestedBy, // Tên người đề nghị (Yêu cầu quan trọng từ người dùng)
        departmentId: departmentId ? parseInt(departmentId) : (user?.departmentId || 1),
        issueDescription,
        priority
      });

      alert('Đã gửi yêu cầu báo hỏng / sửa chữa thành công!');
      setShowForm(false);
      setIssueDescription('');
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi gửi yêu cầu');
    }
  };

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      await apiPut(`/maintenance/${selectedRequest.id}`, {
        status: statusToUpdate,
        repairCost: repairCost ? parseFloat(repairCost) : undefined,
        repairVendor: repairVendor || undefined,
        repairNote: repairNote || undefined,
        completedDate: statusToUpdate === 'COMPLETED' ? new Date().toISOString() : undefined
      });

      alert('Cập nhật trạng thái sửa chữa thành công!');
      setSelectedRequest(null);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi cập nhật');
    }
  };

  const filteredRequests = requests.filter(r => {
    const matchSearch = (r.asset?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (r.asset?.assetCode || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                        (r.requestedBy || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus ? r.status === filterStatus : true;
    return matchSearch && matchStatus;
  });

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'URGENT': return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">Khẩn cấp</span>;
      case 'HIGH': return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-orange-100 text-orange-800">Cao</span>;
      case 'MEDIUM': return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Trung bình</span>;
      default: return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-800">Thấp</span>;
    }
  };

  const getStatusBadge = (s: string) => {
    switch (s) {
      case 'COMPLETED': return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Đã hoàn thành</span>;
      case 'IN_PROGRESS': return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Đang sửa chữa</span>;
      case 'REJECTED': return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-800">Từ chối</span>;
      default: return <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-100 text-purple-800 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" /> Chờ tiếp nhận</span>;
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Báo hỏng & Sửa chữa thiết bị</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tiếp nhận và xử lý sự cố thiết bị từ các Khoa / Phòng CDC Đà Nẵng
          </p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 shadow transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Báo hỏng thiết bị mới
        </button>
      </div>

      {/* FORM: Tạo phiếu báo hỏng */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 animate-fadeIn">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-blue-600" /> Tạo phiếu báo hỏng thiết bị
            </h2>
            <span className="text-xs text-slate-400">Các mục có dấu (*) là bắt buộc</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Select Asset */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Thiết bị gặp sự cố (*)</label>
                <select 
                  required
                  value={assetId}
                  onChange={e => setAssetId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white outline-none"
                >
                  <option value="">-- Chọn thiết bị trong danh sách --</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.assetCode} - {a.name} ({a.department?.name || 'CDC'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Requested By (QUAN TRỌNG THEO YÊU CẦU NGƯỜI DÙNG) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Người đề nghị sửa chữa (*) <span className="text-blue-600 font-normal">(Ghi rõ họ tên cán bộ)</span>
                </label>
                <input 
                  type="text" 
                  required
                  placeholder="Ví dụ: BS. Nguyễn Văn A, ĐD. Trần Thị B..."
                  value={requestedBy}
                  onChange={e => setRequestedBy(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {/* Department */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Khoa / Phòng yêu cầu</label>
                <select 
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white outline-none"
                >
                  <option value="">-- Chọn khoa phòng --</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mức độ ưu tiên</label>
                <select 
                  value={priority}
                  onChange={e => setPriority(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white outline-none"
                >
                  <option value="LOW">Thấp (Không gấp)</option>
                  <option value="MEDIUM">Trung bình (Thường quy)</option>
                  <option value="HIGH">Cao (Ảnh hưởng công tác)</option>
                  <option value="URGENT">Khẩn cấp (Tạm dừng dịch vụ)</option>
                </select>
              </div>

              {/* Description */}
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Mô tả chi tiết sự cố / tình trạng hỏng (*)</label>
                <textarea 
                  rows={3} 
                  required
                  placeholder="Mô tả cụ thể hiện tượng: ví dụ máy không lên nguồn, kẹt giấy, màn hình chớp tắt, sai số đo lường..."
                  value={issueDescription}
                  onChange={e => setIssueDescription(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setShowForm(false)} 
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200 transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button 
                type="submit" 
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 shadow transition cursor-pointer"
              >
                Gửi phiếu báo hỏng
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL: Cập nhật tiến độ sửa chữa (Dành cho Admin / Kỹ thuật) */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              Cập nhật tiến trình: {selectedRequest.asset?.assetCode}
            </h3>
            
            <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
              <div>Thiết bị: <strong className="text-slate-800">{selectedRequest.asset?.name}</strong></div>
              <div>Người đề nghị: <strong className="text-blue-600">{selectedRequest.requestedBy}</strong> ({selectedRequest.department?.name})</div>
              <div>Sự cố: <span className="text-slate-700">{selectedRequest.issueDescription}</span></div>
            </div>

            <form onSubmit={handleUpdateStatus} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Trạng thái xử lý</label>
                <select
                  value={statusToUpdate || selectedRequest.status}
                  onChange={e => setStatusToUpdate(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="PENDING">Chờ tiếp nhận</option>
                  <option value="IN_PROGRESS">Đang sửa chữa</option>
                  <option value="COMPLETED">Đã hoàn thành</option>
                  <option value="REJECTED">Từ chối (Đề xuất thanh lý)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Đơn vị / Kỹ thuật sửa chữa</label>
                <input
                  type="text"
                  placeholder="Tổ CNTT hoặc Tên công ty dịch vụ..."
                  value={repairVendor}
                  onChange={e => setRepairVendor(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Chi phí sửa chữa (VND)</label>
                <input
                  type="number"
                  placeholder="Nhập số tiền..."
                  value={repairCost}
                  onChange={e => setRepairCost(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Ghi chú kết quả sửa chữa</label>
                <textarea
                  rows={2}
                  placeholder="Nội dung đã sửa, linh kiện thay thế..."
                  value={repairNote}
                  onChange={e => setRepairNote(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedRequest(null)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold"
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold"
                >
                  Lưu cập nhật
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input 
            type="text" 
            placeholder="Tìm theo tên thiết bị, mã TB hoặc người đề nghị..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
        </div>
        <select 
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="border border-slate-300 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="">Tất cả trạng thái</option>
          <option value="PENDING">Chờ tiếp nhận</option>
          <option value="IN_PROGRESS">Đang sửa chữa</option>
          <option value="COMPLETED">Đã hoàn thành</option>
          <option value="REJECTED">Từ chối</option>
        </select>
      </div>

      {/* List Table View */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="text-[11px] font-bold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">MÃ TB</th>
                <th className="px-4 py-3">TÊN THIẾT BỊ</th>
                <th className="px-4 py-3">NGƯỜI ĐỀ NGHỊ</th>
                <th className="px-4 py-3">KHOA / PHÒNG</th>
                <th className="px-4 py-3">MÔ TẢ SỰ CỐ</th>
                <th className="px-4 py-3">ƯU TIÊN</th>
                <th className="px-4 py-3">TRẠNG THÁI</th>
                <th className="px-4 py-3 text-right">THAO TÁC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">Đang tải dữ liệu...</td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-10 text-slate-400">Chưa có yêu cầu báo hỏng nào.</td>
                </tr>
              ) : (
                filteredRequests.map((req) => (
                  <tr key={req.id} className="hover:bg-blue-50/30 transition">
                    <td className="px-4 py-3.5 font-bold text-blue-600">{req.asset?.assetCode || '-'}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{req.asset?.name || '-'}</td>
                    <td className="px-4 py-3.5 font-medium text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-500" />
                        {req.requestedBy}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600">{req.department?.name || 'CDC'}</td>
                    <td className="px-4 py-3.5 text-slate-700 max-w-xs">{req.issueDescription}</td>
                    <td className="px-4 py-3.5">{getPriorityBadge(req.priority)}</td>
                    <td className="px-4 py-3.5">{getStatusBadge(req.status)}</td>
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => {
                          setSelectedRequest(req);
                          setStatusToUpdate(req.status);
                        }}
                        className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        Xử lý
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
