import React, { useEffect, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useNavigate } from 'react-router-dom';
import { QrCode, Search, Smartphone, ShieldCheck, Wrench, Award, CheckCircle2 } from 'lucide-react';
import { apiGet } from '../lib/api';
import { STATUS_LABELS, STATUS_COLORS } from '../types';

export default function QRScanner() {
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [assetData, setAssetData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLookup = async (code: string) => {
    setLoading(true);
    setError('');
    setAssetData(null);
    try {
      // Clean up code from full URL if scanned as URL
      let clean = code.trim();
      if (clean.includes('/qr/')) {
        clean = clean.split('/qr/').pop() || clean;
      }

      // Try fetching by asset code or ID
      let res;
      try {
        res = await apiGet(`/assets/by-qr/${encodeURIComponent(clean)}`);
      } catch {
        res = await apiGet(`/assets/${clean}`);
      }

      if (res && res.id) {
        setAssetData(res);
      } else {
        setError(`Không tìm thấy thông tin cho mã: ${clean}`);
      }
    } catch (err: any) {
      setError(`Không tìm thấy thiết bị "${code}". Vui lòng kiểm tra lại mã.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let scanner: any;
    try {
      scanner = new Html5QrcodeScanner('reader', {
        qrbox: { width: 250, height: 250 },
        fps: 10,
        aspectRatio: 1.0,
      }, false);

      scanner.render(
        (result: string) => {
          setScanResult(result);
          handleLookup(result);
        },
        (err: any) => {
          // ignore scan frame errors
        }
      );
    } catch (e) {
      console.warn('QR Scanner init notice:', e);
    }

    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, []);

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex p-3 bg-blue-100 text-blue-600 rounded-2xl mb-3">
          <QrCode className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Quét mã QR thiết bị</h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-1">
          Đưa camera điện thoại vào tem mã QR dán trên thiết bị để tra cứu tức thì
        </p>
      </div>

      {/* Camera Scanner Box */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-200">
        <div id="reader" className="w-full overflow-hidden rounded-xl bg-slate-900"></div>
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-3">
          <Smartphone className="w-4 h-4 text-blue-500" /> Hỗ trợ camera điện thoại trực tiếp trên trình duyệt
        </div>
      </div>

      {/* Manual Input Fallback */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
        <div className="text-xs font-bold text-slate-700 uppercase mb-2">Hoặc nhập mã thiết bị thủ công:</div>
        <form onSubmit={(e) => { e.preventDefault(); if (manualCode) handleLookup(manualCode); }} className="flex gap-2">
          <input
            type="text"
            placeholder="Ví dụ: TSPK008, TSXN004, TSKD001..."
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            className="flex-1 px-3.5 py-2.5 border border-slate-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none uppercase"
          />
          <button
            type="submit"
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition cursor-pointer"
          >
            Tra cứu
          </button>
        </form>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="p-6 text-center text-slate-500 bg-white rounded-2xl shadow-sm border border-slate-100">
          Đang tra cứu dữ liệu thiết bị...
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm text-center">
          {error}
        </div>
      )}

      {/* Scanned Result Profile Card */}
      {assetData && (
        <div className="bg-white p-6 rounded-2xl shadow-lg border border-blue-200 space-y-4 animate-fadeIn">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase">{assetData.assetCode}</span>
              <h2 className="text-lg font-bold text-slate-900">{assetData.name}</h2>
            </div>
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${STATUS_COLORS[assetData.status as keyof typeof STATUS_COLORS]}`}>
              {STATUS_LABELS[assetData.status as keyof typeof STATUS_LABELS] || assetData.status}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 rounded-xl text-xs">
            <div>Khoa quản lý: <strong className="text-slate-800">{assetData.department?.name}</strong></div>
            <div>Cơ sở: <strong className="text-slate-800">{assetData.location || 'Cơ sở 1'}</strong></div>
            <div>Năm SD: <strong className="text-slate-800">{assetData.yearInUse || '-'}</strong></div>
            <div>Phụ trách: <strong className="text-slate-800">{assetData.assignedTo || 'Khoa'}</strong></div>
            {assetData.locationDetail && (
              <div className="col-span-2">Vị trí: <strong className="text-slate-800">{assetData.locationDetail}</strong></div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              onClick={() => navigate(`/assets/${assetData.id}`)}
              className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold text-center shadow transition cursor-pointer"
            >
              Xem toàn bộ lịch sử thiết bị
            </button>
            <button
              onClick={() => navigate('/maintenance')}
              className="py-2.5 px-3 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
            >
              <Wrench className="w-3.5 h-3.5" /> Báo hỏng máy này
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
