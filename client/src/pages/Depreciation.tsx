import React from 'react';
import { Calculator } from 'lucide-react';

export default function Depreciation() {
  const MOCK_DATA = [
    { id: 1, assetCode: 'SA-002', assetName: 'Máy Siêu âm 4D', yearInUse: 2020, originalPrice: 1500000000, rate: 10, accumulated: 450000000, remaining: 1050000000 },
    { id: 2, assetCode: 'XQ-001', assetName: 'Máy X-Quang', yearInUse: 2018, originalPrice: 2000000000, rate: 10, accumulated: 1000000000, remaining: 1000000000 }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-800">Quản lý khấu hao</h1>
        <button className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 rounded-lg text-sm font-medium text-white hover:bg-blue-700">
          <Calculator className="w-4 h-4" /> Tính khấu hao kỳ này
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 font-medium">Mã TB</th>
                <th className="px-4 py-3 font-medium">Tên thiết bị</th>
                <th className="px-4 py-3 font-medium">Năm SD</th>
                <th className="px-4 py-3 font-medium text-right">Nguyên giá (VNĐ)</th>
                <th className="px-4 py-3 font-medium text-right">Tỷ lệ HM (%)</th>
                <th className="px-4 py-3 font-medium text-right">Lũy kế (VNĐ)</th>
                <th className="px-4 py-3 font-medium text-right">Còn lại (VNĐ)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {MOCK_DATA.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4 font-medium text-gray-900">{item.assetCode}</td>
                  <td className="px-4 py-4">{item.assetName}</td>
                  <td className="px-4 py-4">{item.yearInUse}</td>
                  <td className="px-4 py-4 text-right font-medium">{item.originalPrice.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-4 text-right">{item.rate}%</td>
                  <td className="px-4 py-4 text-right">{item.accumulated.toLocaleString('vi-VN')}</td>
                  <td className="px-4 py-4 text-right font-medium text-blue-600">{item.remaining.toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
