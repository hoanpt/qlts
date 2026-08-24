import React, { useState, useEffect } from 'react';
import { Plus, AlertTriangle, CheckCircle2, Clock, Award, Building, Calendar, Search } from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import { Asset, CalibrationRecord } from '../types';

export default function Calibration() {
  const [records, setRecords] = useState<CalibrationRecord[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  // Stats
  const [upcomingCount, setUpcomingCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);

  // Form State
  const [assetId, setAssetId] = useState('');
  const [calibrationDate, setCalibrationDate] = useState(new Date().toISOString().split('T')[0]);
  const [nextCalibrationDate, setNextCalibrationDate] = useState('');
  const [performedBy, setPerformedBy] = useState('');
  const [vendor, setVendor] = useState('Trung tâm Kiểm định & Đo lường Y tế');
  const [result, setResult] = useState<'PASS' | 'FAIL' | 'CONDITIONAL'>('PASS');
  const [certificateNumber, setCertificateNumber] = useState('');
  const [note, setNote] = useState('');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, aRes, alertRes] = await Promise.allSettled([
        apiGet('/calibrations'),
        apiGet('/assets?limit=100'),
        apiGet('/dashboard/calibration-alerts')
      ]);

      if (cRes.status === 'fulfilled' && Array.isArray(cRes.value)) setRecords(cRes.value);
      if (aRes.status === 'fulfilled' && aRes.value?.assets) setAssets(aRes.value.assets);
      if (alertRes.status === 'fulfilled' && alertRes.value) {
        setUpcomingCount(alertRes.value.upcoming || 0);
        setOverdueCount(alertRes.value.overdue || 0);
      }
    } catch (e) {
      console.error('Error fetching calibrations:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId || !calibrationDate) {
      alert('Vui lòng chọn thiết bị và ngày hiệu chuẩn!');
      return;
    }

    try {
      await apiPost('/calibrations', {
        assetId: parseInt(assetId),
        calibrationDate: new Date(calibrationDate).toISOString(),
        nextCalibrationDate: nextCalibrationDate ? new Date(nextCalibrationDate).toISOString() : undefined,
        performedBy,
        vendor,
        result,
        certificateNumber,
        note
      });

      alert('Đã lưu thông tin kiểm định / hiệu chuẩn thành công!');
      setShowForm(false);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi lưu kết quả hiệu chuẩn');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý kiểm định / Hiệu chuẩn TBYT</h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Theo dõi định kỳ tính chuẩn xác và an toàn của các thiết bị y tế CDC Đà Nẵng
          </p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 shadow transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Thêm phiếu hiệu chuẩn
        </button>
      </div>

      {/* Alert Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-amber-800 font-semibold">Sắp đến hạn hiệu chuẩn (30 ngày tới)</div>
              <div className="text-xl font-bold text-amber-900">{upcomingCount} thiết bị</div>
            </div>
          </div>
        </div>

        <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-red-100 text-red-700 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-red-800 font-semibold">Quá hạn hiệu chuẩn / Cần kiểm định gấp</div>
              <div className="text-xl font-bold text-red-900">{overdueCount} thiết bị</div>
            </div>
          </div>
        </div>
      </div>

      {/* Form: Thêm kết quả hiệu chuẩn */}
      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-100 animate-fadeIn">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" /> Nhập kết quả kiểm định / Hiệu chuẩn TBYT
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Thiết bị y tế (*)</label>
                <select
                  required
                  value={assetId}
                  onChange={e => setAssetId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- Chọn thiết bị --</option>
                  {assets.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.assetCode} - {a.name} ({a.department?.name || 'CDC'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Số tem / Chứng nhận hiệu chuẩn</label>
                <input
                  type="text"
                  placeholder="Ví dụ: HC-2026/089-VĐL..."
                  value={certificateNumber}
                  onChange={e => setCertificateNumber(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ngày thực hiện hiệu chuẩn (*)</label>
                <input
                  type="date"
                  required
                  value={calibrationDate}
                  onChange={e => setCalibrationDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Hạn hiệu chuẩn kế tiếp</label>
                <input
                  type="date"
                  value={nextCalibrationDate}
                  onChange={e => setNextCalibrationDate(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Đơn vị thực hiện kiểm định</label>
                <input
                  type="text"
                  value={vendor}
                  onChange={e => setVendor(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Kết quả kiểm định</label>
                <select
                  value={result}
                  onChange={e => setResult(e.target.value as any)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="PASS">ĐẠT TIÊU CHUẨN (PASS)</option>
                  <option value="CONDITIONAL">ĐẠT CÓ ĐIỀU KIỆN (CONDITIONAL)</option>
                  <option value="FAIL">KHÔNG ĐẠT (FAIL - Cần bảo dưỡng)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Ghi chú & Đánh giá sai số</label>
                <textarea
                  rows={2}
                  placeholder="Ghi nhận sai số, điều kiện môi trường đo hoặc các khuyến cáo..."
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl text-sm font-semibold"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700"
              >
                Lưu hồ sơ hiệu chuẩn
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:text-sm text-left">
            <thead className="text-[11px] font-bold text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">MÃ TB</th>
                <th className="px-4 py-3">TÊN THIẾT BỊ</th>
                <th className="px-4 py-3">SỐ CHỨNG NHẬN</th>
                <th className="px-4 py-3">ĐƠN VỊ KIỂM ĐỊNH</th>
                <th className="px-4 py-3">NGÀY THỰC HIỆN</th>
                <th className="px-4 py-3">HẠN KẾ TIẾP</th>
                <th className="px-4 py-3 text-right">KẾT QUẢ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">Đang tải hồ sơ...</td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">Chưa có bản ghi hiệu chuẩn nào.</td>
                </tr>
              ) : (
                records.map((item) => (
                  <tr key={item.id} className="hover:bg-blue-50/30 transition">
                    <td className="px-4 py-3.5 font-bold text-blue-600">{item.asset?.assetCode || '-'}</td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">{item.asset?.name || '-'}</td>
                    <td className="px-4 py-3.5 text-slate-700">{item.certificateNumber || 'HC-2026'}</td>
                    <td className="px-4 py-3.5 text-slate-600">{item.vendor || 'Trung tâm Đo lường'}</td>
                    <td className="px-4 py-3.5 text-slate-600">
                      {new Date(item.calibrationDate).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-900">
                      {item.nextCalibrationDate ? new Date(item.nextCalibrationDate).toLocaleDateString('vi-VN') : '-'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item.result === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {item.result === 'PASS' ? 'Đạt tiêu chuẩn' : 'Không đạt'}
                      </span>
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
