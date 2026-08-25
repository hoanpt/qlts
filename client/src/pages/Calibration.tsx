import React, { useState, useEffect } from 'react';
import { 
  Plus, AlertTriangle, CheckCircle2, Clock, Award, Building, Calendar, 
  Search, Printer, DollarSign, FileText, CheckCircle, XCircle, Users,
  Layers, ShieldCheck, Sparkles
} from 'lucide-react';
import { apiGet, apiPost } from '../lib/api';
import { Asset, CalibrationRecord } from '../types';

export default function Calibration() {
  const [records, setRecords] = useState<CalibrationRecord[]>([]);
  const [medicalAssets, setMedicalAssets] = useState<Asset[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('ALL');
  const [locationFilter, setLocationFilter] = useState('ALL');
  const [resultFilter, setResultFilter] = useState('ALL');

  // Form State
  const [formData, setFormData] = useState({
    assetId: '',
    serviceType: 'HIEU_CHUAN',
    servicePackage: 'Gói dịch vụ: Hiệu chuẩn, kiểm định thiết bị phục vụ đánh giá lại ISO17025',
    vendor: 'TT Kiểm định Hiệu chuẩn Đo lường Miền Nam (SMETES)',
    decisionNumber: 'Quyết định số 34/QĐ-TTKSBT ngày 27/01/2026',
    departmentLocation: 'Khoa Xét Nghiệm - CS1',
    calibrationDate: new Date().toISOString().split('T')[0],
    nextCalibrationDate: '',
    cost: '600000',
    performedBy: 'Ds. Tính, Ds. Lộc, Cn. Hải, Cn. Sơn',
    acceptanceMembers: 'Ds. Tính, Ds. Lộc, Cn. Hải, Cn. Sơn',
    deviceStatusAfter: 'Tốt (Đạt tiêu chuẩn ISO 17025)',
    result: 'PASS',
    certificateNumber: '',
    fundingSource: 'Thu sự nghiệp',
    note: ''
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cRes, aRes, statRes] = await Promise.allSettled([
        apiGet('/calibrations'),
        apiGet('/assets?managingUnit=DUOC&limit=1000'),
        apiGet('/calibrations/stats/summary')
      ]);

      if (cRes.status === 'fulfilled' && Array.isArray(cRes.value)) setRecords(cRes.value);
      if (aRes.status === 'fulfilled' && aRes.value?.assets) setMedicalAssets(aRes.value.assets);
      if (statRes.status === 'fulfilled') setStats(statRes.value);
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
    if (!formData.assetId || !formData.calibrationDate) {
      alert('Vui lòng chọn thiết bị y tế và ngày thực hiện!');
      return;
    }

    try {
      // auto calculate next date if not entered (+1 year)
      const calibDate = new Date(formData.calibrationDate);
      const nextDate = formData.nextCalibrationDate 
        ? new Date(formData.nextCalibrationDate).toISOString()
        : new Date(calibDate.setFullYear(calibDate.getFullYear() + 1)).toISOString();

      await apiPost('/calibrations', {
        assetId: parseInt(formData.assetId),
        calibrationDate: new Date(formData.calibrationDate).toISOString(),
        nextCalibrationDate: nextDate,
        serviceType: formData.serviceType,
        servicePackage: formData.servicePackage,
        vendor: formData.vendor,
        decisionNumber: formData.decisionNumber,
        departmentLocation: formData.departmentLocation,
        cost: parseFloat(formData.cost) || 0,
        performedBy: formData.performedBy,
        acceptanceMembers: formData.acceptanceMembers,
        deviceStatusAfter: formData.deviceStatusAfter,
        result: formData.result,
        certificateNumber: formData.certificateNumber || `SMETES-2026-${Date.now().toString().slice(-4)}`,
        fundingSource: formData.fundingSource,
        note: formData.note
      });

      alert('Đã thêm hồ sơ hiệu chuẩn / kiểm định TBYT thành công!');
      setShowModal(false);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi lưu kết quả hiệu chuẩn');
    }
  };

  // Filtered records
  const filteredRecords = records.filter(r => {
    const searchMatch = !search ||
      r.asset?.name?.toLowerCase().includes(search.toLowerCase()) ||
      r.asset?.assetCode?.toLowerCase().includes(search.toLowerCase()) ||
      r.vendor?.toLowerCase().includes(search.toLowerCase()) ||
      r.performedBy?.toLowerCase().includes(search.toLowerCase()) ||
      r.decisionNumber?.toLowerCase().includes(search.toLowerCase());

    const typeMatch = serviceTypeFilter === 'ALL' || r.serviceType === serviceTypeFilter;
    const locMatch = locationFilter === 'ALL' || (r as any).departmentLocation?.includes(locationFilter);
    const resMatch = resultFilter === 'ALL' || r.result === resultFilter;

    return searchMatch && typeMatch && locMatch && resMatch;
  });

  const totalCost = records.reduce((sum, r) => sum + (r.cost || 0), 0);

  return (
    <div className="space-y-6 pb-16">
      {/* 1. TOP HEADER */}
      <div className="print:hidden flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Khoa Dược - VTYT</span>
            <h1 className="text-2xl font-bold text-slate-900">Hiệu Chuẩn, Kiểm Định & Kiểm Xạ TBYT</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Theo dõi định kỳ tính chuẩn xác, độ an toàn & đánh giá chất lượng tiêu chuẩn <strong>ISO 17025</strong> cho trang thiết bị y tế
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 shadow-xs transition cursor-pointer"
          >
            <Printer className="w-4 h-4" /> In Bảng Theo Dõi A4
          </button>
          
          <button 
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Thêm Phiếu Hiệu Chuẩn Mới
          </button>
        </div>
      </div>

      {/* 2. STATS CARDS */}
      <div className="print:hidden grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng số thiết bị</div>
          <div className="text-xl font-bold text-slate-900 mt-1">{records.length}</div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-blue-200 bg-blue-50/40 shadow-xs">
          <div className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">Hiệu chuẩn</div>
          <div className="text-xl font-bold text-blue-800 mt-1">
            {records.filter(r => r.serviceType === 'HIEU_CHUAN').length}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-purple-200 bg-purple-50/40 shadow-xs">
          <div className="text-[11px] font-bold text-purple-700 uppercase tracking-wider">Thử nghiệm</div>
          <div className="text-xl font-bold text-purple-800 mt-1">
            {records.filter(r => r.serviceType === 'THU_NGHIEM').length}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/40 shadow-xs">
          <div className="text-[11px] font-bold text-emerald-700 uppercase tracking-wider">Đạt ISO / Tốt</div>
          <div className="text-xl font-bold text-emerald-800 mt-1">
            {records.filter(r => r.result === 'PASS').length}
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-amber-200 bg-amber-50/40 shadow-xs col-span-2 sm:col-span-1">
          <div className="text-[11px] font-bold text-amber-700 uppercase tracking-wider">Tổng kinh phí</div>
          <div className="text-sm font-bold text-amber-900 mt-1.5">{Number(totalCost).toLocaleString('vi-VN')} đ</div>
        </div>
      </div>

      {/* 3. FILTERS BAR */}
      <div className="print:hidden bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 bg-slate-50/60">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={serviceTypeFilter}
            onChange={e => setServiceTypeFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="ALL">-- Tất cả Loại hình --</option>
            <option value="HIEU_CHUAN">Hiệu chuẩn thiết bị</option>
            <option value="THU_NGHIEM">Thử nghiệm an toàn sinh học</option>
            <option value="KIEM_DINH">Kiểm định thiết bị y tế</option>
            <option value="KIEM_XA">Kiểm xạ an toàn X-quang</option>
          </select>

          <select
            value={locationFilter}
            onChange={e => setLocationFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="ALL">-- Bộ phận sử dụng (Tất cả) --</option>
            <option value="CS1">Cơ sở 1 (118 Lê Đình Lý)</option>
            <option value="CS2">Cơ sở 2 (Bàn Thạch)</option>
            <option value="HIV">Bộ phận HIV / AIDS</option>
            <option value="Virus">Bộ phận Virus / Vi sinh</option>
            <option value="HL">Bộ phận Hóa lý</option>
            <option value="CLS">Bộ phận Cận lâm sàng</option>
          </select>

          <select
            value={resultFilter}
            onChange={e => setResultFilter(e.target.value)}
            className="px-3 py-2 border border-slate-200 rounded-xl text-xs font-semibold bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="ALL">-- Kết quả đánh giá --</option>
            <option value="PASS">Đạt chuẩn / Tốt</option>
            <option value="FAIL">Không hoạt động / Cần sửa</option>
          </select>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm tên thiết bị, mã TBYT, đơn vị SMETES..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs bg-white focus:ring-2 focus:ring-blue-500 outline-none w-64"
          />
        </div>
      </div>

      {/* 4. DATA TABLE */}
      <div className="print:hidden bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase border-b border-slate-200">
              <tr>
                <th className="p-3.5 w-10 text-center">STT</th>
                <th className="p-3.5">Mã TBYT</th>
                <th className="p-3.5 min-w-[200px]">Tên thiết bị y tế</th>
                <th className="p-3.5">Bộ phận sử dụng</th>
                <th className="p-3.5">Loại hình</th>
                <th className="p-3.5 min-w-[150px]">Đơn vị thực hiện</th>
                <th className="p-3.5">Ngày hoàn thành</th>
                <th className="p-3.5 text-right">Kinh phí (đ)</th>
                <th className="p-3.5">Đánh giá sau HC</th>
                <th className="p-3.5 min-w-[120px]">Người nghiệm thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-slate-400">Đang tải hồ sơ hiệu chuẩn...</td></tr>
              ) : filteredRecords.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-slate-400">Không tìm thấy thiết bị nào phù hợp.</td></tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3.5 text-center text-slate-500">{idx + 1}</td>
                    <td className="p-3.5 font-mono font-bold text-emerald-700">{r.asset?.assetCode || '-'}</td>
                    <td className="p-3.5 font-bold text-slate-900">{r.asset?.name}</td>
                    <td className="p-3.5 text-slate-700 font-medium">{(r as any).departmentLocation || r.asset?.department?.name || 'CDC'}</td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.serviceType === 'THU_NGHIEM' ? 'bg-purple-100 text-purple-800' :
                        r.serviceType === 'KIEM_DINH' ? 'bg-blue-100 text-blue-800' :
                        r.serviceType === 'KIEM_XA' ? 'bg-red-100 text-red-800' :
                        'bg-emerald-100 text-emerald-800'
                      }`}>
                        {r.serviceType === 'THU_NGHIEM' ? 'Thử nghiệm' :
                         r.serviceType === 'KIEM_DINH' ? 'Kiểm định' :
                         r.serviceType === 'KIEM_XA' ? 'Kiểm xạ' : 'Hiệu chuẩn'}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-700 max-w-xs">{r.vendor || 'TT SMETES'}</td>
                    <td className="p-3.5 text-slate-600">{new Date(r.calibrationDate).toLocaleDateString('vi-VN')}</td>
                    <td className="p-3.5 text-right font-mono font-bold text-slate-900">
                      {r.cost ? Number(r.cost).toLocaleString('vi-VN') : '0'}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.result === 'PASS' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {(r as any).deviceStatusAfter || (r.result === 'PASS' ? 'Tốt' : 'Không đạt')}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 text-[11px]">{(r as any).acceptanceMembers || r.performedBy || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. PRINTABLE REPORT A4 (CHUẨN MẪU KHOA DƯỢC CDC ĐÀ NẴNG)                    */}
      {/* ========================================================================= */}
      <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-md border border-slate-200 font-serif text-slate-900 print:shadow-none print:border-none print:p-0">
        <div className="flex justify-between items-start text-xs sm:text-sm font-sans mb-4">
          <div>
            <div className="font-bold uppercase">TRUNG TÂM KIỂM SOÁT BỆNH TẬT THÀNH PHỐ ĐÀ NẴNG</div>
            <div className="font-bold text-slate-700">KHOA DƯỢC - VẬT TƯ Y TẾ</div>
          </div>
          <div className="text-right">
            <div className="font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div className="italic text-xs">Độc lập - Tự do - Hạnh phúc</div>
          </div>
        </div>

        <div className="text-center my-6">
          <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wide">
            BẢNG THEO DÕI THỜI GIAN HIỆU CHUẨN, THỬ NGHIỆM, KIỂM ĐỊNH, KIỂM XẠ MÁY MÓC, TBYT NĂM 2026
          </h2>
          <p className="text-xs sm:text-sm italic text-slate-600 mt-1 font-sans">
            (Quyết định số 34/QĐ-TTKSBT ngày 27/01/2026 - Đánh giá tiêu chuẩn ISO 17025)
          </p>
        </div>

        <div className="border border-slate-400 rounded-lg overflow-hidden font-sans text-xs">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100 text-center font-bold border-b border-slate-400 divide-x divide-slate-300">
              <tr>
                <th className="p-2 w-8">STT</th>
                <th className="p-2 min-w-[70px]">Mã TBYT</th>
                <th className="p-2 min-w-[180px]">Tên thiết bị y tế</th>
                <th className="p-2 min-w-[90px]">Bộ phận SD</th>
                <th className="p-2 min-w-[100px]">Nội dung thực hiện</th>
                <th className="p-2 min-w-[140px]">Đơn vị thực hiện</th>
                <th className="p-2 min-w-[80px]">Ngày xong</th>
                <th className="p-2 min-w-[90px]">Kinh phí (đ)</th>
                <th className="p-2 min-w-[70px]">Tình trạng</th>
                <th className="p-2 min-w-[130px]">Người nghiệm thu</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-300">
              {filteredRecords.slice(0, 35).map((r, idx) => (
                <tr key={r.id} className="divide-x divide-slate-200">
                  <td className="p-2 text-center text-slate-600">{idx + 1}</td>
                  <td className="p-2 font-mono font-bold text-emerald-700">{r.asset?.assetCode || '-'}</td>
                  <td className="p-2 font-semibold text-slate-900">{r.asset?.name}</td>
                  <td className="p-2">{(r as any).departmentLocation || r.asset?.department?.name || 'CDC'}</td>
                  <td className="p-2">
                    {r.serviceType === 'THU_NGHIEM' ? 'Thử nghiệm ATSH' :
                     r.serviceType === 'KIEM_DINH' ? 'Kiểm định TBYT' :
                     r.serviceType === 'KIEM_XA' ? 'Kiểm xạ X-quang' : 'Hiệu chuẩn'}
                  </td>
                  <td className="p-2">{r.vendor || 'TT SMETES'}</td>
                  <td className="p-2 text-center">{new Date(r.calibrationDate).toLocaleDateString('vi-VN')}</td>
                  <td className="p-2 text-right font-mono font-bold">
                    {r.cost ? Number(r.cost).toLocaleString('vi-VN') : '0'}
                  </td>
                  <td className="p-2 text-center font-semibold text-emerald-700">{(r as any).deviceStatusAfter || 'Tốt'}</td>
                  <td className="p-2 text-[11px]">{(r as any).acceptanceMembers || r.performedBy || 'Ds. Tính, Ds. Lộc'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Signatures */}
        <div className="mt-10 pt-4 font-sans text-xs sm:text-sm">
          <div className="text-right italic mb-4">Đà Nẵng, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="font-bold uppercase text-slate-900">NGƯỜI LẬP BẢNG</div>
              <div className="text-[11px] italic text-slate-500 mb-20">(Ký, ghi rõ họ tên)</div>
              <div className="font-bold text-slate-800">DS. Lê Xuân Lộc</div>
            </div>

            <div>
              <div className="font-bold uppercase text-slate-900">PHỤ TRÁCH KHOA DƯỢC - VTYT</div>
              <div className="text-[11px] italic text-slate-500 mb-20">(Ký, ghi rõ họ tên)</div>
              <div className="font-bold text-slate-800">DS. Mai Thị Tính</div>
            </div>

            <div>
              <div className="font-bold uppercase text-slate-900">GIÁM ĐỐC TRUNG TÂM</div>
              <div className="text-[11px] italic text-slate-500 mb-20">(Ký, đóng dấu)</div>
              <div className="font-bold text-slate-800">Ông. Nguyễn Đại Vĩnh</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 6. MODAL THÊM PHIẾU HIỆU CHUẨN MỚI                                        */}
      {/* ========================================================================= */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-bold text-base text-slate-900">Thêm Hồ Sơ Hiệu Chuẩn / Kiểm Định TBYT</h3>
                <p className="text-xs text-slate-500 mt-0.5">Khoa Dược - VTYT theo dõi chuẩn ISO 17025</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Chọn Trang thiết bị y tế (*)</label>
                <select
                  required
                  value={formData.assetId}
                  onChange={e => setFormData({ ...formData, assetId: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                >
                  <option value="">-- Chọn thiết bị trong danh mục Khoa Dược --</option>
                  {medicalAssets.map(a => (
                    <option key={a.id} value={a.id}>
                      [{a.assetCode}] {a.name} ({a.department?.name || 'CDC'})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Loại hình dịch vụ (*)</label>
                  <select
                    value={formData.serviceType}
                    onChange={e => setFormData({ ...formData, serviceType: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl bg-white font-bold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="HIEU_CHUAN">Hiệu chuẩn thiết bị đo lường</option>
                    <option value="THU_NGHIEM">Thử nghiệm an toàn sinh học</option>
                    <option value="KIEM_DINH">Kiểm định an toàn TBYT</option>
                    <option value="KIEM_XA">Kiểm xạ thiết bị X-quang</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Bộ phận sử dụng cụ thể</label>
                  <input
                    type="text"
                    placeholder="HIV-CS1, Virus-CS1, HL-CS2..."
                    value={formData.departmentLocation}
                    onChange={e => setFormData({ ...formData, departmentLocation: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Đơn vị thực hiện (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.vendor}
                    onChange={e => setFormData({ ...formData, vendor: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Quyết định phê duyệt</label>
                  <input
                    type="text"
                    value={formData.decisionNumber}
                    onChange={e => setFormData({ ...formData, decisionNumber: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Ngày hoàn thành (*)</label>
                  <input
                    type="date"
                    required
                    value={formData.calibrationDate}
                    onChange={e => setFormData({ ...formData, calibrationDate: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Kinh phí thực hiện (VNĐ)</label>
                  <input
                    type="number"
                    value={formData.cost}
                    onChange={e => setFormData({ ...formData, cost: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Người nghiệm thu (*)</label>
                  <input
                    type="text"
                    required
                    value={formData.acceptanceMembers}
                    onChange={e => setFormData({ ...formData, acceptanceMembers: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Đánh giá hoạt động sau HC</label>
                  <input
                    type="text"
                    value={formData.deviceStatusAfter}
                    onChange={e => setFormData({ ...formData, deviceStatusAfter: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-emerald-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow flex items-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Lưu Hồ Sơ Hiệu Chuẩn
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
