import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import ExcelJS from 'exceljs';

const router = Router();
const prisma = new PrismaClient();

router.get('/assets', requireAuth, async (req: any, res) => {
  try {
    const where: any = {};
    if (req.user.role === 'DEPARTMENT' && req.user.departmentId) {
      where.departmentId = req.user.departmentId;
    }

    const assets = await prisma.asset.findMany({
      where,
      include: { category: true, department: true },
      orderBy: [
        { departmentId: 'asc' },
        { assetCode: 'asc' }
      ]
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Danh Sách Tài Sản');

    sheet.columns = [
      { header: 'Mã tài sản', key: 'assetCode', width: 15 },
      { header: 'Tên tài sản', key: 'name', width: 30 },
      { header: 'Danh mục', key: 'category', width: 20 },
      { header: 'Khoa/Phòng', key: 'department', width: 25 },
      { header: 'Cơ sở', key: 'location', width: 15 },
      { header: 'Trạng thái', key: 'status', width: 15 },
      { header: 'Nguyên giá (VNĐ)', key: 'originalPrice', width: 18 },
      { header: 'Nguồn kinh phí', key: 'fundingSource', width: 25 },
      { header: 'Quyết định số', key: 'decisionNumber', width: 20 },
    ];

    assets.forEach(asset => {
      sheet.addRow({
        assetCode: asset.assetCode,
        name: asset.name,
        category: asset.category.name,
        department: asset.department.name,
        location: asset.location || 'Cơ sở 1',
        status: asset.status,
        originalPrice: asset.originalPrice || 0,
        fundingSource: (asset as any).fundingSource || asset.source || 'Nguồn ngân sách nhà nước cấp',
        decisionNumber: (asset as any).decisionNumber || 'QĐ số 05/QĐ-TTKSBT'
      });
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=assets.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    res.status(500).json({ error: 'Error exporting assets' });
  }
});

// Xuất biểu mẫu kiểm kê C53-HD chuẩn của CDC Đà Nẵng
router.get('/c53-hd', requireAuth, async (req: any, res) => {
  try {
    const { departmentId } = req.query;
    const where: any = {};
    if (departmentId) {
      where.departmentId = parseInt(departmentId as string);
    } else if (req.user.role === 'DEPARTMENT' && req.user.departmentId) {
      where.departmentId = req.user.departmentId;
    }

    const dept = departmentId 
      ? await prisma.department.findUnique({ where: { id: parseInt(departmentId as string) } })
      : null;

    const assets = await prisma.asset.findMany({
      where,
      include: { category: true, department: true },
      orderBy: [
        { departmentId: 'asc' },
        { assetCode: 'asc' }
      ]
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('BienBan_C53_HD');

    // Header info
    sheet.addRow(['Đơn vị: Trung tâm Kiểm soát bệnh tật TP Đà Nẵng', '', '', '', '', '', '', '', '', '', 'Mẫu số C53-HD']);
    sheet.addRow(['Mã ĐV SDNS: 1127644', '', '', '', '', '', '', '', '', '', 'Ban hành theo TT số 107/2017/TT-BTC']);
    sheet.addRow([]);
    sheet.addRow([`BIÊN BẢN KIỂM KÊ TÀI SẢN CỐ ĐỊNH, CÔNG CỤ DỤNG CỤ NĂM 2026`]);
    sheet.addRow([dept ? `KHOA / PHÒNG: ${dept.name.toUpperCase()}` : 'TOÀN ĐƠN VỊ']);
    sheet.addRow(['- Căn cứ Quyết định số 05/QĐ-TTKSBT ngày 05/01/2026 của Giám đốc CDC Đà Nẵng về việc thành lập Hội đồng kiểm kê năm 2026']);
    sheet.addRow(['- Nguồn kinh phí hình thành: Ngân sách Nhà nước cấp & Quỹ phát triển hoạt động sự nghiệp']);
    sheet.addRow(['- Hôm nay, ngày 15 tháng 01 năm 2026, tại Trung tâm Kiểm soát bệnh tật TP Đà Nẵng chúng tôi gồm:']);
    sheet.addRow(['1. Ông. Nguyễn Đại Vĩnh', '', '', '', 'Giám đốc', '', '', '', '', '', 'Chủ tịch Hội đồng']);
    sheet.addRow(['2. Ông. Hồ Phú Quảng', '', '', '', 'Trưởng phòng TC - KT', '', '', '', '', '', 'Thành viên']);
    sheet.addRow(['3. Bà. Mai Thị Tính', '', '', '', 'Phụ trách Khoa Dược - VTYT', '', '', '', '', '', 'Tổ trưởng']);
    sheet.addRow([`4. Đại diện: ${dept ? dept.name : 'Các Khoa/Phòng'}`, '', '', '', 'Trưởng/Phó đơn vị', '', '', '', '', '', 'Đại diện Khoa']);
    sheet.addRow(['5. Thành viên tổ kiểm kê: Mai Thị Tính, Phạm Phú Ân, Lê Xuân Lộc, Huỳnh Bá Thành, Lê Thị Thanh Thủy']);
    sheet.addRow(['Cùng tiến hành kiểm kê tài sản, kết quả như sau:']);
    sheet.addRow([]);

    // Table Header
    sheet.addRow([
      'STT', 'Tài sản', 'Mã số', 'Năm đưa vào SD',
      'Theo sổ sách (SL)', 'Thực tế KK (SL)', 'Chênh lệch (SL)',
      'Đơn giá (đ)', 'Thành tiền (đ)', 'Bộ phận quản lý',
      'Nơi sử dụng / Người SD', 'Tình trạng sử dụng', 'Nơi TS mới chuyển đến', 'Ghi chú'
    ]);

    sheet.addRow(['A', 'B', 'C', 'D', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);

    // Asset rows
    assets.forEach((a, idx) => {
      sheet.addRow([
        idx + 1,
        a.name,
        a.assetCode,
        a.yearInUse || '',
        a.bookQuantity || 1,
        a.actualQuantity || a.bookQuantity || 1,
        a.quantityDifference || 0,
        a.originalPrice || '',
        a.originalPrice ? (a.originalPrice * (a.actualQuantity || 1)) : '',
        a.source || a.department?.name || '',
        a.locationDetail || a.assignedTo || '',
        a.status === 'DANG_SU_DUNG' ? 'Đang sử dụng' : a.status === 'HONG' ? 'Hỏng' : a.status === 'CHO_THANH_LY' ? 'ĐN thanh lý' : a.status,
        a.location || 'Cơ sở 1',
        a.note || ''
      ]);
    });

    sheet.addRow([]);
    sheet.addRow(['', '', '', '', '', '', '', '', '', 'Đà Nẵng, ngày 15 tháng 01 năm 2026']);
    sheet.addRow(['Thành viên tổ kiểm kê', '', '', 'Đại diện Khoa/Phòng', '', '', 'Trưởng phòng TC - KT', '', '', 'Chủ tịch Hội đồng / Giám đốc']);
    sheet.addRow(['(Ký, ghi rõ họ tên)', '', '', '(Ký, ghi rõ họ tên)', '', '', '(Ký, ghi rõ họ tên)', '', '', '(Ký, ghi rõ họ tên)']);
    sheet.addRow([]);
    sheet.addRow([]);
    sheet.addRow(['- Mai Thị Tính', '', '', dept ? `Đại diện ${dept.code}` : '', '', '', 'Hồ Phú Quảng', '', '', 'Nguyễn Đại Vĩnh']);
    sheet.addRow(['- Phạm Phú Ân']);
    sheet.addRow(['- Lê Xuân Lộc']);
    sheet.addRow(['- Huỳnh Bá Thành']);
    sheet.addRow(['- Lê Thị Thanh Thủy']);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=BienBan_KiemKe_C53_HD_${dept ? dept.code : 'CDC'}.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export C53-HD error:', error);
    res.status(500).json({ error: 'Error exporting C53-HD inventory sheet' });
  }
});

export default router;
