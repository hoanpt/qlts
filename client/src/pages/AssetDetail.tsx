import React, { useState, useEffect } from 'react';
import { ArrowLeft, Edit, Download, Printer, QrCode, Wrench, ArrowRightLeft, Award, TrendingDown, CheckCircle2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiGet } from '../lib/api';
import { Asset, STATUS_LABELS, STATUS_COLORS } from '../types';

export default function AssetDetail() {
  const params = useParams();
  const identifier = params.id || params.assetCode;
  const navigate = useNavigate();
  const [asset, setAsset] = useState<any>(null);
  const [qrCodeImg, setQrCodeImg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'transfers' | 'maintenance' | 'depreciation' | 'calibrations'>('info');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDetail = async () => {
      if (!identifier) return;
      setLoading(true);
      try {
        let aData: any = null;
        if (!isNaN(Number(identifier))) {
          aData = await apiGet(`/assets/${identifier}`);
        } else {
          aData = await apiGet(`/assets/by-qr/${encodeURIComponent(identifier)}`);
        }

        if (aData) {
          setAsset(aData);
          if (aData.id) {
            const qRes = await apiGet(`/assets/${aData.id}/qr`).catch(() => null);
            if (qRes?.qrCode) setQrCodeImg(qRes.qrCode);
          }
        }
      } catch (e) {
        console.error('Error fetching asset detail:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchDetail();
  }, [identifier]);

  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow || !asset) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Mã QR - ${asset.assetCode}</title>
          <style>
            body { font-family: sans-serif; text-align: center; padding: 20px; }
            .label { border: 2px solid #000; padding: 15px; width: 260px; margin: 0 auto; border-radius: 8px; }
            .title { font-size: 13px; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; color: #1e40af; }
            .code { font-size: 16px; font-weight: bold; margin-top: 5px; }
            .name { font-size: 12px; color: #333; margin-top: 3px; }
            .dept { font-size: 11px; color: #666; margin-top: 3px; }
            img { width: 150px; height: 150px; margin: 5px auto; }
          </style>
        </head>
        <body>
          <div class="label">
            <div class="title">CDC ĐÀ NẴNG</div>
            <img src="${qrCodeImg}" />
            <div class="code">${asset.assetCode}</div>
            <div class="name">${asset.name}</div>
            <div class="dept">${asset.department?.name || ''} - ${asset.location || 'Cơ sở 1'}</div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return <div className="p-12 text-center text-slate-400">Đang tải thông tin thiết bị...</div>;
  }

  if (!asset) {
    return (
      <div className="p-12 text-center text-slate-500">
        <p>Không tìm thấy thiết bị yêu cầu.</p>
        <button onClick={() => navigate('/assets')} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm">
          Quay lại danh sách
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="text-xs text-blue-600 font-bold uppercase">{asset.assetCode}</div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{asset.name}</h1>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={handlePrintQR}
            className="px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 text-blue-600" /> In nhãn dán QR
          </button>
          <button 
            onClick={() => navigate(`/assets/${asset.id}/edit`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-blue-700 flex items-center gap-2 shadow transition cursor-pointer"
          >
            <Edit className="w-4 h-4" /> Sửa thông tin
          </button>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 bg-slate-50/50">
          <nav className="flex overflow-x-auto text-xs sm:text-sm">
            {[
              { key: 'info', label: 'Thông tin chung', icon: Award },
              { key: 'transfers', label: `Lịch sử điều chuyển (${asset.transfers?.length || 0})`, icon: ArrowRightLeft },
              { key: 'maintenance', label: `Báo hỏng & Sửa chữa (${asset.maintenanceRequests?.length || 0})`, icon: Wrench },
              { key: 'calibrations', label: `Hiệu chuẩn TBYT (${asset.calibrations?.length || 0})`, icon: CheckCircle2 },
              { key: 'depreciation', label: 'Khấu hao tài sản', icon: TrendingDown },
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button 
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as any)}
                  className={`flex items-center gap-2 whitespace-nowrap py-3.5 px-5 font-semibold border-b-2 transition cursor-pointer ${
                    activeTab === tab.key 
                      ? 'border-blue-600 text-blue-600 bg-white' 
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* TAB 1: THÔNG TIN CHUNG */}
          {activeTab === 'info' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Định danh & Phân loại</h3>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">Mã thiết bị</div>
                      <div className="font-bold text-slate-900">{asset.assetCode}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Danh mục</div>
                      <div className="font-medium text-slate-800">{asset.category?.name || 'Trang thiết bị'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Năm đưa vào sử dụng</div>
                      <div className="font-medium text-slate-800">{asset.yearInUse || 'Chưa cập nhật'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Trạng thái hiện tại</div>
                      <span className={`inline-flex mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${STATUS_COLORS[asset.status as keyof typeof STATUS_COLORS]}`}>
                        {STATUS_LABELS[asset.status as keyof typeof STATUS_LABELS] || asset.status}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="border-t border-slate-100 pt-5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Vị trí & Đơn vị quản lý</h3>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">Khoa / Phòng quản lý</div>
                      <div className="font-bold text-slate-900">{asset.department?.name} ({asset.department?.code})</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Cơ sở</div>
                      <div className="font-medium text-slate-800">{asset.location || 'Cơ sở 1'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Nơi sử dụng cụ thể</div>
                      <div className="font-medium text-slate-800">{asset.locationDetail || 'Theo sự phân công của khoa'}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Người được giao phụ trách</div>
                      <div className="font-medium text-slate-800">{asset.assignedTo || 'Toàn khoa'}</div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Thông số & Nguyên giá</h3>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                    <div>
                      <div className="text-xs text-slate-500">Hãng sản xuất / Xuất xứ</div>
                      <div className="font-medium text-slate-800">{asset.manufacturer || '-'} {asset.countryOfOrigin ? `(${asset.countryOfOrigin})` : ''}</div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500">Nguyên giá (VND)</div>
                      <div className="font-bold text-blue-600">
                        {asset.originalPrice ? Number(asset.originalPrice).toLocaleString('vi-VN') + ' đ' : 'Chưa có giá'}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-xs text-slate-500">Cấu hình / Thông số kỹ thuật / Ghi chú</div>
                      <div className="mt-1 p-3 bg-slate-50 rounded-xl text-slate-700 text-xs leading-relaxed">
                        {asset.specifications || asset.note || 'Không có ghi chú thêm'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* QR Code Section */}
              <div className="flex flex-col items-center justify-start">
                <div className="w-full bg-slate-50 p-5 rounded-2xl border border-slate-200/80 flex flex-col items-center text-center">
                  <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Mã QR Thiết Bị</div>
                  
                  <div className="w-44 h-44 bg-white border border-slate-300 p-2.5 rounded-xl flex items-center justify-center mb-3 shadow-inner">
                    {qrCodeImg ? (
                      <img src={qrCodeImg} alt={`QR ${asset.assetCode}`} className="w-full h-full object-contain" />
                    ) : (
                      <div className="text-xs text-slate-400 flex flex-col items-center">
                        <QrCode className="w-10 h-10 text-slate-300 mb-1" />
                        Đang tạo QR...
                      </div>
                    )}
                  </div>

                  <div className="font-bold text-sm text-slate-900">{asset.assetCode}</div>
                  <div className="text-xs text-slate-500 mb-4 line-clamp-1">{asset.name}</div>

                  <button 
                    onClick={handlePrintQR}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow transition cursor-pointer mb-2"
                  >
                    <Printer className="w-3.5 h-3.5" /> In nhãn dán thiết bị
                  </button>

                  <a 
                    href={qrCodeImg || '#'}
                    download={`QR_${asset.assetCode}.png`}
                    className="w-full py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" /> Tải file ảnh QR
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: LỊCH SỬ ĐIỀU CHUYỂN */}
          {activeTab === 'transfers' && (
            <div className="space-y-4">
              {(!asset.transfers || asset.transfers.length === 0) ? (
                <div className="text-center py-10 text-slate-400 text-sm">Chưa có lịch sử điều chuyển cho thiết bị này.</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {asset.transfers.map((t: any) => (
                    <div key={t.id} className="py-3 flex items-center justify-between text-sm">
                      <div>
                        <div className="font-semibold text-slate-800">
                          Từ <span className="text-blue-600">{t.fromDepartment?.name}</span> &rarr; Đến <span className="text-emerald-600">{t.toDepartment?.name}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">Lý do: {t.reason || 'Điều chuyển công tác'}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{t.status}</span>
                        <div className="text-[11px] text-slate-400 mt-0.5">{new Date(t.transferDate).toLocaleDateString('vi-VN')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: BÁO HỎNG & SỬA CHỮA */}
          {activeTab === 'maintenance' && (
            <div className="space-y-4">
              {(!asset.maintenanceRequests || asset.maintenanceRequests.length === 0) ? (
                <div className="text-center py-10 text-slate-400 text-sm">Thiết bị chưa có yêu cầu sửa chữa nào.</div>
              ) : (
                <div className="space-y-4">
                  {asset.maintenanceRequests.map((m: any) => (
                    <div key={m.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-sm text-slate-900">{m.issueDescription}</div>
                          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                            <span>Người đề nghị: <strong className="text-slate-800">{m.requestedBy}</strong> {m.contactPhone ? `(${m.contactPhone})` : ''}</span>
                            <span>•</span>
                            <span>Ngày báo: <strong>{new Date(m.requestDate).toLocaleDateString('vi-VN')}</strong></span>
                            {m.managingUnit && (
                              <>
                                <span>•</span>
                                <span>Đơn vị nhận: <strong className="text-blue-700">{m.managingUnit === 'DUOC' ? 'Khoa Dược' : m.managingUnit === 'CNTT' ? 'Tổ CNTT' : 'Phòng TCHC'}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                          m.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                          m.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                          m.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {m.status === 'COMPLETED' ? 'Đã hoàn thành' :
                           m.status === 'IN_PROGRESS' ? 'Đang xử lý' :
                           m.status === 'REJECTED' ? 'Từ chối' : 'Chờ tiếp nhận'}
                        </span>
                      </div>

                      {/* Processing Details */}
                      {(m.technicianName || m.repairNote || m.repairCost || m.repairVendor) && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 text-slate-700">
                          {m.technicianName && (
                            <div><strong>Cán bộ kỹ thuật xử lý:</strong> <span className="font-semibold text-slate-900">{m.technicianName}</span></div>
                          )}
                          {m.repairVendor && (
                            <div><strong>Đơn vị / Nhà cung cấp sửa:</strong> {m.repairVendor}</div>
                          )}
                          {m.repairCost ? (
                            <div><strong>Kinh phí sửa chữa:</strong> <span className="font-bold text-purple-700 font-mono">{Number(m.repairCost).toLocaleString('vi-VN')} đ</span></div>
                          ) : null}
                          {m.repairNote && (
                            <div className="text-slate-800 bg-slate-50 p-2 rounded-lg mt-1">
                              <strong>Nội dung xử lý:</strong> {m.repairNote}
                            </div>
                          )}
                          {m.completedDate && (
                            <div className="text-[11px] text-emerald-700 font-medium pt-1">
                              ✓ Nghiệm thu hoàn thành ngày: {new Date(m.completedDate).toLocaleDateString('vi-VN')}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HIỆU CHUẨN TBYT */}
          {activeTab === 'calibrations' && (
            <div className="space-y-4">
              {(!asset.calibrations || asset.calibrations.length === 0) ? (
                <div className="text-center py-10 text-slate-400 text-sm">Chưa có lịch sử kiểm định / hiệu chuẩn cho thiết bị này.</div>
              ) : (
                <div className="space-y-3">
                  {asset.calibrations.map((c: any) => (
                    <div key={c.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                      <div>
                        <div className="font-bold text-sm text-slate-900">Chứng nhận số: {c.certificateNumber || 'HC-CDC-2026'}</div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          Đơn vị thực hiện: {c.vendor || 'Trung tâm Đo lường / Kiểm định'}
                        </div>
                        <div className="text-xs text-slate-500">
                          Ngày thực hiện: {new Date(c.calibrationDate).toLocaleDateString('vi-VN')} • Hạn hiệu chuẩn tiếp: <strong className="text-blue-600">{c.nextCalibrationDate ? new Date(c.nextCalibrationDate).toLocaleDateString('vi-VN') : '12 tháng'}</strong>
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${c.result === 'PASS' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {c.result === 'PASS' ? 'Đạt tiêu chuẩn' : 'Không đạt'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 5: KHẤU HAO */}
          {activeTab === 'depreciation' && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-xs text-slate-500">Nguyên giá</div>
                  <div className="text-lg font-bold text-slate-900">
                    {asset.originalPrice ? Number(asset.originalPrice).toLocaleString('vi-VN') + ' đ' : '0 đ'}
                  </div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-xs text-slate-500">Tỷ lệ hao mòn hàng năm</div>
                  <div className="text-lg font-bold text-amber-600">{asset.depreciationRate || 10}% / năm</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-xs text-slate-500">Giá trị còn lại ước tính</div>
                  <div className="text-lg font-bold text-emerald-600">
                    {asset.currentValue ? Number(asset.currentValue).toLocaleString('vi-VN') + ' đ' : 'Theo niên hạn'}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
