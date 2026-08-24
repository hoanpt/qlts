import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Edit, Trash2, MapPin, Search, 
  Package, Users, CheckCircle2, RefreshCw
} from 'lucide-react';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { Department } from '../types';

export default function Departments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingDept, setEditingDept] = useState<Partial<Department> | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    location: 'Cơ sở 1',
    description: ''
  });

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const data = await apiGet('/departments');
      if (Array.isArray(data)) {
        setDepartments(data);
      }
    } catch (e) {
      console.error('Error loading departments:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDepartments();
  }, []);

  const handleOpenAdd = () => {
    setEditingDept(null);
    setFormData({
      code: '',
      name: '',
      location: 'Cơ sở 1',
      description: '118 Lê Đình Lý, Thanh Khê, Đà Nẵng'
    });
    setShowModal(true);
  };

  const handleOpenEdit = (dept: Department) => {
    setEditingDept(dept);
    setFormData({
      code: dept.code,
      name: dept.name,
      location: dept.location || 'Cơ sở 1',
      description: dept.description || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code || !formData.name) {
      alert('Vui lòng nhập Mã và Tên Khoa/Phòng');
      return;
    }

    try {
      if (editingDept && editingDept.id) {
        await apiPut(`/departments/${editingDept.id}`, formData);
        alert('Cập nhật thông tin Khoa/Phòng thành công!');
      } else {
        await apiPost('/departments', formData);
        alert('Thêm mới Khoa/Phòng thành công!');
      }
      setShowModal(false);
      loadDepartments();
    } catch (e: any) {
      alert(e.message || 'Lỗi khi lưu Khoa/Phòng');
    }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!window.confirm(`Bạn có chắc muốn xóa đơn vị "${name}"?`)) return;
    try {
      await apiDelete(`/departments/${id}`);
      loadDepartments();
      alert('Đã xóa đơn vị thành công!');
    } catch (e: any) {
      alert(e.message || 'Lỗi khi xóa đơn vị');
    }
  };

  const filteredDepts = departments.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.description || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const cs1Count = departments.filter(d => d.location === 'Cơ sở 1').length;
  const cs2Count = departments.filter(d => d.location === 'Cơ sở 2').length;
  const totalAssets = departments.reduce((sum, d) => sum + (d._count?.assets || 0), 0);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800">Cơ cấu tổ chức</span>
            <h1 className="text-2xl font-bold text-slate-900">Quản lý 16 Khoa / Phòng CDC Đà Nẵng</h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Danh mục các Khoa, Phòng và Đơn vị trực thuộc quản lý & sử dụng tài sản
          </p>
        </div>

        <button 
          onClick={handleOpenAdd}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 rounded-xl text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Thêm Khoa / Phòng mới
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{departments.length} Đơn vị</div>
            <div className="text-xs text-slate-500 font-medium">Toàn Trung tâm CDC</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{cs1Count} Cơ sở 1 | {cs2Count} Cơ sở 2</div>
            <div className="text-xs text-slate-500 font-medium">118 Lê Đình Lý & Bàn Thạch</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
            <Package className="w-6 h-6" />
          </div>
          <div>
            <div className="text-2xl font-extrabold text-slate-900">{totalAssets.toLocaleString('vi-VN')}</div>
            <div className="text-xs text-slate-500 font-medium">Tổng tài sản đang phân bổ</div>
          </div>
        </div>
      </div>

      {/* Search & Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên khoa phòng, mã đơn vị..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <span className="text-xs text-slate-500 font-medium">Hiển thị {filteredDepts.length} đơn vị</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="text-xs text-slate-600 uppercase bg-slate-50 border-b border-slate-200 font-bold">
              <tr>
                <th className="px-4 py-3.5 w-16 text-center">STT</th>
                <th className="px-4 py-3.5 w-24">Mã ĐV</th>
                <th className="px-4 py-3.5 min-w-[220px]">Tên Khoa / Phòng</th>
                <th className="px-4 py-3.5 min-w-[130px]">Địa điểm (Cơ sở)</th>
                <th className="px-4 py-3.5 min-w-[200px]">Địa chỉ chi tiết</th>
                <th className="px-4 py-3.5 text-center w-36">Số lượng tài sản</th>
                <th className="px-4 py-3.5 text-right w-24">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">Đang tải danh sách khoa phòng...</td>
                </tr>
              ) : filteredDepts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">Không tìm thấy khoa phòng nào phù hợp.</td>
                </tr>
              ) : (
                filteredDepts.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3.5 text-center text-slate-400 font-semibold">{idx + 1}</td>
                    <td className="px-4 py-3.5 font-mono font-bold text-blue-700">{item.code}</td>
                    <td className="px-4 py-3.5 font-bold text-slate-900 text-sm">{item.name}</td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold ${
                        item.location === 'Cơ sở 2' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.location}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-500 text-[11px]">{item.description || '-'}</td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-full font-bold text-xs">
                        {(item._count?.assets || 0).toLocaleString('vi-VN')} máy
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        <button 
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer transition" 
                          title="Sửa thông tin"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(item.id, item.name)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition" 
                          title="Xóa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm / Sửa Khoa Phòng */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4">
            <h3 className="font-bold text-lg text-slate-900">
              {editingDept ? 'Chỉnh sửa Khoa / Phòng' : 'Thêm mới Khoa / Phòng'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Mã Khoa / Phòng (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: PKDK, XN, DVTYT, TCHC..."
                  value={formData.code}
                  onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl font-mono uppercase focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Tên đầy đủ Khoa / Phòng (*)</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Khoa Xét Nghiệm - CĐHA - TDCN..."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Địa điểm (Cơ sở)</label>
                <select
                  value={formData.location}
                  onChange={e => setFormData({ ...formData, location: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="Cơ sở 1">Cơ sở 1 (118 Lê Đình Lý)</option>
                  <option value="Cơ sở 2">Cơ sở 2 (Bàn Thạch)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Địa chỉ chi tiết / Mô tả</label>
                <input
                  type="text"
                  placeholder="Địa chỉ cụ thể hoặc ghi chú..."
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow"
                >
                  {editingDept ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
