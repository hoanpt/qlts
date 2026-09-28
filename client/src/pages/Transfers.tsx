import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Check, X, ArrowLeftRight, Building, Calendar, ArrowRight, Search, CheckCircle2 } from 'lucide-react';
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
  const [assetSearch, setAssetSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState<'ALL' | 'CNTT' | 'DUOC' | 'TCHC'>('ALL');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tRes, aRes, dRes] = await Promise.allSettled([
        apiGet('/transfers'),
        apiGet('/assets?limit=5000'),
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

  const filteredTransferAssets = useMemo(() => {
    return assets.filter(a => {
      if (user?.role === 'DEPARTMENT' && user.departmentId && a.departmentId !== user.departmentId) {
        return false;
      }
      if (unitFilter !== 'ALL' && (a as any).managingUnit !== unitFilter) {
        return false;
      }
      if (assetSearch.trim()) {
        const q = assetSearch.toLowerCase();
        const matchCode = a.assetCode?.toLowerCase().includes(q);
        const matchName = a.name?.toLowerCase().includes(q);
        const matchUser = a.assignedTo?.toLowerCase().includes(q);
        const matchLoc = a.locationDetail?.toLowerCase().includes(q);
        const matchDept = a.department?.name?.toLowerCase().includes(q);
        if (!matchCode && !matchName && !matchUser && !matchLoc && !matchDept) return false;
      }
      return true;
    });
  }, [assets, user, unitFilter, assetSearch]);

  const selectedTransferAsset = useMemo(() => {
    return assets.find(a => a.id.toString() === assetId);
  }, [assets, assetId]);

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
              <div className="md:col-span-2 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Thiết bị cần điều chuyển (*)
                  </label>
                  {selectedTransferAsset && (
                    <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold rounded-md text-[11px] border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Đã chọn: [{selectedTransferAsset.assetCode}] {selectedTransferAsset.name} ({selectedTransferAsset.department?.name || 'CDC'})</span>
                    </span>
                  )}
                </div>

                {/* Filter pills & search */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setUnitFilter('ALL')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
                      unitFilter === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả ({assets.filter(a => user?.role !== 'DEPARTMENT' || !user.departmentId || a.departmentId === user.departmentId).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitFilter('CNTT')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
                      unitFilter === 'CNTT'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                    }`}
                  >
                    💻 Tổ CNTT
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitFilter('DUOC')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
                      unitFilter === 'DUOC'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    🩺 Khoa Dược (TBYT)
                  </button>
                  <button
                    type="button"
                    onClick={() => setUnitFilter('TCHC')}
                    className={`px-2.5 py-1 text-xs font-bold rounded-xl transition cursor-pointer ${
                      unitFilter === 'TCHC'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                    }`}
                  >
                    🏢 Phòng TCHC
                  </button>
                </div>

                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Tìm nhanh theo mã, tên thiết bị, người dùng, khoa phòng..."
                    value={assetSearch}
                    onChange={e => setAssetSearch(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-xl bg-white text-xs outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Bảng chia cột danh sách thiết bị điều chuyển */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                  <div className="max-h-56 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100/90 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200 text-[11px]">
                        <tr>
                          <th className="p-2.5 text-center w-12">Chọn</th>
                          <th className="p-2.5 w-32">Mã tài sản</th>
                          <th className="p-2.5">Tên thiết bị</th>
                          <th className="p-2.5 w-44">Khoa đang quản lý</th>
                          <th className="p-2.5 w-36">Người sử dụng</th>
                          <th className="p-2.5 w-32">Vị trí phòng</th>
                          <th className="p-2.5 w-24 text-center">Đơn vị</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredTransferAssets.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="p-6 text-center text-slate-400 text-xs">
                              Không tìm thấy thiết bị nào phù hợp điều kiện tìm kiếm.
                            </td>
                          </tr>
                        ) : (
                          filteredTransferAssets.map(a => {
                            const isSelected = assetId === a.id.toString();
                            return (
                              <tr
                                key={a.id}
                                onClick={() => handleAssetChange(a.id.toString())}
                                className={`transition cursor-pointer select-none ${
                                  isSelected 
                                    ? 'bg-blue-50/95 font-medium text-blue-900 border-l-4 border-blue-600' 
                                    : 'hover:bg-slate-50/80 text-slate-700'
                                }`}
                              >
                                <td className="p-2.5 text-center align-middle">
                                  {isSelected ? (
                                    <CheckCircle2 className="w-4 h-4 text-blue-600 fill-blue-100 mx-auto" />
                                  ) : (
                                    <div className="w-4 h-4 rounded-full border-2 border-slate-300 mx-auto" />
                                  )}
                                </td>
                                <td className="p-2.5 align-middle">
                                  <span className="font-mono font-bold text-blue-700 bg-blue-50/90 px-2 py-0.5 rounded text-[11px] border border-blue-200 inline-block">
                                    {a.assetCode}
                                  </span>
                                </td>
                                <td className="p-2.5 align-middle">
                                  <div className="font-bold text-slate-900">{a.name}</div>
                                  {a.specifications && (
                                    <div className="text-[10px] text-slate-400 truncate max-w-[200px] mt-0.5">{a.specifications}</div>
                                  )}
                                </td>
                                <td className="p-2.5 align-middle font-medium text-slate-800">
                                  {a.department?.name || 'CDC'}
                                </td>
                                <td className="p-2.5 align-middle">
                                  {a.assignedTo ? (
                                    <span className="font-semibold text-slate-800 flex items-center gap-1">
                                      <span>👤</span> <span>{a.assignedTo}</span>
                                    </span>
                                  ) : (
                                    <span className="text-slate-400 italic">Chưa gán</span>
                                  )}
                                </td>
                                <td className="p-2.5 align-middle">
                                  <span className="text-slate-700 flex items-center gap-1">
                                    <span>📍</span> <span>{a.locationDetail || (a as any).floor || 'Tại khoa'}</span>
                                  </span>
                                </td>
                                <td className="p-2.5 text-center align-middle">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    (a as any).managingUnit === 'DUOC' ? 'bg-emerald-100 text-emerald-800' :
                                    (a as any).managingUnit === 'CNTT' ? 'bg-blue-100 text-blue-800' :
                                    'bg-amber-100 text-amber-800'
                                  }`}>
                                    {(a as any).managingUnit === 'DUOC' ? 'Khoa Dược' : (a as any).managingUnit === 'CNTT' ? 'Tổ CNTT' : 'TCHC'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
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
