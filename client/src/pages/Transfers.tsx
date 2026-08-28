import React, { useState, useEffect } from 'react';
import { Plus, Check, X, ArrowLeftRight, Building, Calendar, ArrowRight } from 'lucide-react';
import { apiGet, apiPost, apiPut } from '../lib/api';
import { Asset, Department, AssetTransfer } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function Transfers() {
  const { user } = useAuth();
  const [transfers, setTransfers] = useState<AssetTransfer[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PENDING' | 'HISTORY'>('PENDING');
  const [showForm, setShowForm] = useState(false);

  // Form State
  const [assetId, setAssetId] = useState('');
  const [fromDeptId, setFromDeptId] = useState('');
  const [toDeptId, setToDeptId] = useState('');
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, aRes, dRes] = await Promise.allSettled([
        apiGet('/transfers'),
        apiGet('/assets?limit=100'),
        apiGet('/departments')
      ]);

      if (tRes.status === 'fulfilled' && Array.isArray(tRes.value)) setTransfers(tRes.value);
      if (aRes.status === 'fulfilled' && aRes.value?.assets) {
        const sorted = [...aRes.value.assets].sort((a, b) =>
          (a.assetCode || '').localeCompare(b.assetCode || '', undefined, { numeric: true, sensitivity: 'base' })
        );
        setAssets(sorted);
      }
      if (dRes.status === 'fulfilled' && Array.isArray(dRes.value)) setDepartments(dRes.value);
    } catch (e) {
      console.error('Error fetching transfers:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAssetChange = (selectedId: string) => {
    setAssetId(selectedId);
    const sel = assets.find(a => a.id.toString() === selectedId);
    if (sel && sel.departmentId) {
      setFromDeptId(sel.departmentId.toString());
    }
  };

  const handleCreateTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !fromDeptId || !toDeptId) {
      alert('Vui lòng chọn đầy đủ thiết bị, khoa chuyển đi và khoa nhận!');
      return;
    }

    if (fromDeptId === toDeptId) {
      alert('Khoa nhận phải khác khoa chuyển đi!');
      return;
    }

    try {
      await apiPost('/transfers', {
        assetId: parseInt(assetId),
        fromDepartmentId: parseInt(fromDeptId),
        toDepartmentId: parseInt(toDeptId),
        reason,
        note
      });

      alert('Tạo phiếu điều chuyển thành công!');
      setShowForm(false);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi tạo phiếu điều chuyển');
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await apiPut(`/transfers/${id}/approve`, {});
      await apiPut(`/transfers/${id}/complete`, {});
      alert('Đã phê duyệt và hoàn tất điều chuyển thiết bị!');
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi phê duyệt');
    }
  };

  const handleReject = async (id: number) => {
    if (!window.confirm('Bạn có chắc chắn muốn từ chối yêu cầu điều chuyển này?')) return;
    try {
      await apiPut(`/transfers/${id}/reject`, {});
      alert('Đã từ chối phiếu điều chuyển');
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi từ chối');
    }
  };

  const displayedTransfers = transfers.filter(t => {
    if (user?.role === 'DEPARTMENT' && user.departmentId) {
      if (t.fromDepartmentId !== user.departmentId && t.toDepartmentId !== user.departmentId) {
        return false;
      }
    }
    if (activeTab === 'PENDING') return t.status === 'PENDING';
    return t.status !== 'PENDING';
  });

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Điều chuyển tài sản</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Quản lý lưu chuyển thiết bị giữa 16 khoa/phòng và giữa 2 cơ sở CDC Đà Nẵng
          </p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 shadow transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Tạo phiếu điều chuyển
        </button>
      </div>

      {/* Form: Tạo phiếu điều chuyển */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 animate-fadeIn">
          <h2 className="text-lg font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100 flex items-center gap-2">
            <ArrowLeftRight className="w-5 h-5 text-blue-600" /> Tạo phiếu điều chuyển thiết bị
          </h2>

          <form onSubmit={handleCreateTransfer} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Thiết bị cần điều chuyển (*)</label>
                <select
                  required
                  value={assetId}
                  onChange={e => handleAssetChange(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn thiết bị --</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.assetCode} - {a.name} (Đang ở: {a.department?.name || 'CDC'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Từ Khoa / Phòng (*)</label>
                {user?.role === 'DEPARTMENT' ? (
                  <div className="w-full border border-slate-200 bg-slate-100 rounded-xl px-3.5 py-2.5 text-sm font-bold text-slate-800">
                    {user.fullName || departments.find(d => d.id === user.departmentId)?.name || 'Khoa / Phòng của bạn'}
                  </div>
                ) : (
                  <select
                    required
                    value={fromDeptId}
                    onChange={e => setFromDeptId(e.target.value)}
                    className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- Khoa chuyển đi --</option>
                    {departments.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Đến Khoa / Phòng tiếp nhận (*)</label>
                <select
                  required
                  value={toDeptId}
                  onChange={e => setToDeptId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm bg-white focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Khoa tiếp nhận --</option>
                  {departments
                    .filter(d => user?.role !== 'DEPARTMENT' || d.id !== user.departmentId)
                    .map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Lý do điều chuyển (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Bổ sung trang bị phục vụ phòng chống dịch, điều chuyển công tác..."
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-200"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
              >
                Gửi yêu cầu điều chuyển
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabs & List */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="border-b border-slate-200 bg-slate-50/50">
          <nav className="flex text-xs sm:text-sm font-semibold">
            <button 
              onClick={() => setActiveTab('PENDING')}
              className={`flex-1 py-3.5 text-center border-b-2 transition cursor-pointer ${
                activeTab === 'PENDING' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Chờ phê duyệt ({transfers.filter(t => t.status === 'PENDING').length})
            </button>
            <button 
              onClick={() => setActiveTab('HISTORY')}
              className={`flex-1 py-3.5 text-center border-b-2 transition cursor-pointer ${
                activeTab === 'HISTORY' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Lịch sử điều chuyển ({transfers.filter(t => t.status !== 'PENDING').length})
            </button>
          </nav>
        </div>

        <div className="p-4 sm:p-6">
          {displayedTransfers.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              {activeTab === 'PENDING' ? 'Không có phiếu điều chuyển nào đang chờ duyệt.' : 'Chưa có lịch sử điều chuyển.'}
            </div>
          ) : (
            <div className="space-y-3">
              {displayedTransfers.map((t) => (
                <div key={t.id} className="p-4 rounded-xl border border-slate-200/80 hover:border-blue-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4 transition">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-600 text-xs sm:text-sm">{t.asset?.assetCode}</span>
                      <span className="font-bold text-slate-900 text-sm sm:text-base">{t.asset?.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${t.status === 'PENDING' ? 'bg-amber-100 text-amber-800' : t.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {t.status === 'PENDING' ? 'Chờ duyệt' : t.status === 'COMPLETED' ? 'Hoàn thành' : 'Từ chối'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-slate-600">
                      <span className="font-semibold text-slate-700">{t.fromDepartment?.name}</span>
                      <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                      <span className="font-bold text-emerald-700">{t.toDepartment?.name}</span>
                    </div>

                    <div className="text-xs text-slate-500">
                      Lý do: {t.reason || 'Điều chuyển công tác'} • Ngày tạo: {new Date(t.transferDate).toLocaleDateString('vi-VN')}
                    </div>
                  </div>

                  {t.status === 'PENDING' && user?.role === 'ADMIN' && (
                    <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0">
                      <button 
                        onClick={() => handleApprove(t.id)}
                        className="flex items-center gap-1 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow transition cursor-pointer"
                      >
                        <Check className="w-4 h-4" /> Phê duyệt
                      </button>
                      <button 
                        onClick={() => handleReject(t.id)}
                        className="flex items-center gap-1 px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                      >
                        <X className="w-4 h-4" /> Từ chối
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
