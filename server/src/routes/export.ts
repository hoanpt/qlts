import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth } from '../middleware/auth';
import ExcelJS from 'exceljs';

const router = Router();
const prisma = new PrismaClient();

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'thin', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } }
};

const DOUBLE_BOTTOM_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: 'FF000000' } },
  left: { style: 'thin', color: { argb: 'FF000000' } },
  bottom: { style: 'double', color: { argb: 'FF000000' } },
  right: { style: 'thin', color: { argb: 'FF000000' } }
};

// 1. Xuất danh sách tài sản (Có định dạng chuẩn, kẻ bảng, kẻ ô)
router.get('/assets', requireAuth, async (req: any, res) => {
  try {
    const { departmentId, managingUnit, status } = req.query;
    const where: any = {};

    if (departmentId) {
      where.departmentId = parseInt(departmentId as string);
    } else if (req.user.role === 'DEPARTMENT' && req.user.departmentId) {
      where.departmentId = req.user.departmentId;
    }

    if (managingUnit) where.managingUnit = managingUnit;
    if (status) where.status = status;

    if (req.user) {
      if (req.user.role === 'MANAGER_CNTT') where.managingUnit = 'CNTT';
      else if (req.user.role === 'MANAGER_DUOC') where.managingUnit = 'DUOC';
      else if (req.user.role === 'MANAGER_TCHC') where.managingUnit = 'TCHC';
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
    const sheet = workbook.addWorksheet('Danh Sách Tài Sản', {
      views: [{ showGridLines: true }]
    });

    sheet.pageSetup = {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0
    };

    // Header 1: Đơn vị
    const r1 = sheet.addRow(['ĐƠN VỊ: TRUNG TÂM KIỂM SOÁT BỆNH TẬT TP ĐÀ NẴNG', '', '', '', '', '', '', '', '', '']);
    r1.font = { name: 'Times New Roman', size: 11, bold: true };

    const r2 = sheet.addRow(['MÃ ĐV SDNS: 1127644', '', '', '', '', '', '', '', '', '']);
    r2.font = { name: 'Times New Roman', size: 11, bold: true };

    sheet.addRow([]);

    // Header 2: Title
    const titleRow = sheet.addRow(['DANH MỤC TRANG THIẾT BỊ & TÀI SẢN NĂM 2026', '', '', '', '', '', '', '', '', '']);
    titleRow.font = { name: 'Times New Roman', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
    titleRow.alignment = { horizontal: 'center' };
    sheet.mergeCells(`A${titleRow.number}:J${titleRow.number}`);

    const subTitleRow = sheet.addRow([`Tổng số: ${assets.length.toLocaleString('vi-VN')} tài sản | Thời điểm xuất: ${new Date().toLocaleDateString('vi-VN')}`]);
    subTitleRow.font = { name: 'Times New Roman', size: 11, italic: true };
    subTitleRow.alignment = { horizontal: 'center' };
    sheet.mergeCells(`A${subTitleRow.number}:J${subTitleRow.number}`);

    sheet.addRow([]);

    // Table Header
    const hRow = sheet.addRow([
      'STT',
      'Mã tài sản',
      'Tên thiết bị / Tài sản',
      'Cấu hình / Thông số kỹ thuật',
      'Khối quản lý',
      'Khoa / Phòng sử dụng',
      'Vị trí / Tầng',
      'Năm SD',
      'Trạng thái',
      'Nguyên giá (VNĐ)'
    ]);

    hRow.height = 28;
    hRow.eachCell(cell => {
      cell.font = { name: 'Times New Roman', size: 10, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
      cell.border = THIN_BORDER;
    });

    sheet.columns = [
      { key: 'stt', width: 6 },
      { key: 'assetCode', width: 16 },
      { key: 'name', width: 34 },
      { key: 'specifications', width: 32 },
      { key: 'managingUnit', width: 18 },
      { key: 'department', width: 28 },
      { key: 'location', width: 20 },
      { key: 'yearInUse', width: 10 },
      { key: 'status', width: 16 },
      { key: 'originalPrice', width: 18 }
    ];

    let totalPrice = 0;

    assets.forEach((a, idx) => {
      const price = a.originalPrice || 0;
      totalPrice += price;

      const unitText = a.managingUnit === 'DUOC' ? 'Khoa Dược (TBYT)' :
                       a.managingUnit === 'CNTT' ? 'Tổ CNTT' :
                       (a as any).buildingAsset === 1 ? 'TCHC (Tòa nhà)' : 'TCHC (Hành chính)';

      const statusText = a.status === 'DANG_SU_DUNG' ? 'Đang sử dụng' :
                         a.status === 'HONG' ? 'Hỏng' :
                         a.status === 'CHO_THANH_LY' ? 'Chờ thanh lý' :
                         a.status === 'BAO_TRI' ? 'Bảo trì' : a.status;

      const row = sheet.addRow([
        idx + 1,
        a.assetCode,
        a.name,
        a.specifications || '',
        unitText,
        a.department?.name || 'CDC Đà Nẵng',
        `${a.floor || a.locationDetail || ''} (${a.location || 'Cơ sở 1'})`,
        a.yearInUse || '',
        statusText,
        price > 0 ? price : ''
      ]);

      row.height = 22;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).font = { name: 'Times New Roman', size: 10, bold: true };
      row.getCell(3).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(4).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'left', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(9).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(10).numFmt = '#,##0';

      row.eachCell({ includeEmpty: true }, cell => {
        cell.border = THIN_BORDER;
        cell.font = cell.font || { name: 'Times New Roman', size: 10 };
      });
    });

    // Total Row
    const totalRow = sheet.addRow([
      'TỔNG CỘNG', '', '', '', '', '', '', '', '',
      totalPrice > 0 ? totalPrice : ''
    ]);
    totalRow.height = 24;
    sheet.mergeCells(`A${totalRow.number}:I${totalRow.number}`);
    totalRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    totalRow.getCell(1).font = { name: 'Times New Roman', size: 11, bold: true };
    totalRow.getCell(10).alignment = { horizontal: 'right', vertical: 'middle' };
    totalRow.getCell(10).font = { name: 'Times New Roman', size: 11, bold: true };
    totalRow.getCell(10).numFmt = '#,##0';

    totalRow.eachCell({ includeEmpty: true }, cell => {
      cell.border = DOUBLE_BOTTOM_BORDER;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Danh_Muc_Tai_San_CDC_Da_Nang_2026.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Error exporting assets:', error);
    res.status(500).json({ error: 'Error exporting assets' });
  }
});

// 2. Xuất biểu mẫu kiểm kê C53-HD chuẩn của CDC Đà Nẵng (Chuẩn 100% biểu mẫu Bộ Tài Chính & Kẻ ô toàn diện)
router.get('/c53-hd', requireAuth, async (req: any, res) => {
  try {
    const { departmentId, managingUnit, buildingAsset, floor, inventoryDate, signaturesJson } = req.query;
    const where: any = {};

    if (departmentId) {
      where.departmentId = parseInt(departmentId as string);
    } else if (req.user.role === 'DEPARTMENT' && req.user.departmentId) {
      where.departmentId = req.user.departmentId;
    }

    if (managingUnit) where.managingUnit = managingUnit;
    if (buildingAsset !== undefined && buildingAsset !== '') {
      where.buildingAsset = parseInt(buildingAsset as string);
    }
    if (floor && floor !== 'Tất cả tầng') where.floor = floor;

    if (req.user) {
      if (req.user.role === 'MANAGER_CNTT') where.managingUnit = 'CNTT';
      else if (req.user.role === 'MANAGER_DUOC') where.managingUnit = 'DUOC';
      else if (req.user.role === 'MANAGER_TCHC') where.managingUnit = 'TCHC';
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

    // Custom signatures if passed from client
    let sigs: any = {};
    if (signaturesJson) {
      try { sigs = JSON.parse(signaturesJson as string); } catch {}
    }

    const reporterNames = sigs.membersText || '- Mai Thị Tính\n- Phạm Phú Ân\n- Lê Xuân Lộc\n- Huỳnh Bá Thành\n- Lê Thị Thanh Thủy';
    const leaderTitle = sigs.leaderTitle || (managingUnit === 'CNTT' ? 'TỔ TRƯỞNG TỔ CNTT' : managingUnit === 'TCHC' ? 'TRƯỞNG PHÒNG TCHC' : 'PHỤ TRÁCH KHOA DƯỢC - VTYT');
    const leaderName = sigs.leaderName || (managingUnit === 'CNTT' ? 'KTV. Phan Thanh Hoàn' : managingUnit === 'TCHC' ? 'Ông. Trần Liên' : 'DS. Mai Thị Tính');
    const tcktName = sigs.financeName || 'Ông. Hồ Phú Quảng';
    const directorName = sigs.presidentName || 'Ông. Nguyễn Đại Vĩnh';
    const reportDateStr = inventoryDate || '15 tháng 01 năm 2026';

    let unitTitle = 'TOÀN TRUNG TÂM';
    if (dept) unitTitle = `KHOA / PHÒNG: ${dept.name.toUpperCase()}`;
    else if (managingUnit === 'DUOC') unitTitle = 'KHỐI TRANG THIẾT BỊ Y TẾ (KHOA DƯỢC QUẢN LÝ)';
    else if (managingUnit === 'CNTT') unitTitle = 'KHỐI THIẾT BỊ CÔNG NGHỆ THÔNG TIN (TỔ CNTT QUẢN LÝ)';
    else if (managingUnit === 'TCHC' && buildingAsset === '1') unitTitle = `HẠ TẦNG CƠ SỞ VẬT CHẤT TÒA NHÀ (${floor || 'CÁC TẦNG'})`;
    else if (managingUnit === 'TCHC') unitTitle = 'THIẾT BỊ HÀNH CHÍNH & CÔNG CỤ DỤNG CỤ (PHÒNG TCHC QUẢN LÝ)';

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('BienBan_C53_HD', {
      views: [{ showGridLines: true }]
    });

    sheet.pageSetup = {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
    };

    // Row 1-2: Header (Đơn vị & Mẫu số C53-HD)
    const r1 = sheet.addRow([
      'Đơn vị: Trung tâm Kiểm soát bệnh tật TP Đà Nẵng', '', '', '', '', '', '', '', '', '', '', '', 'Mẫu số C53-HD'
    ]);
    r1.font = { name: 'Times New Roman', size: 11, bold: true };
    r1.getCell(13).alignment = { horizontal: 'right' };
    sheet.mergeCells(`A1:F1`);
    sheet.mergeCells(`M1:M1`);

    const r2 = sheet.addRow([
      'Mã ĐV SDNS: 1127644', '', '', '', '', '', '', '', '', '', '', '', '(Ban hành theo TT số 107/2017/TT-BTC)'
    ]);
    r2.font = { name: 'Times New Roman', size: 10 };
    r2.getCell(1).font = { name: 'Times New Roman', size: 10, bold: true };
    r2.getCell(13).font = { name: 'Times New Roman', size: 9, italic: true };
    r2.getCell(13).alignment = { horizontal: 'right' };
    sheet.mergeCells(`A2:F2`);

    sheet.addRow([]);

    // Row 4-5: Title
    const titleRow = sheet.addRow([
      'BIÊN BẢN KIỂM KÊ TÀI SẢN CỐ ĐỊNH, CÔNG CỤ DỤNG CỤ NĂM 2026', '', '', '', '', '', '', '', '', '', '', '', ''
    ]);
    titleRow.font = { name: 'Times New Roman', size: 14, bold: true };
    titleRow.alignment = { horizontal: 'center' };
    sheet.mergeCells(`A${titleRow.number}:M${titleRow.number}`);

    const subTitleRow = sheet.addRow([
      unitTitle, '', '', '', '', '', '', '', '', '', '', '', ''
    ]);
    subTitleRow.font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FF1E40AF' } };
    subTitleRow.alignment = { horizontal: 'center' };
    sheet.mergeCells(`A${subTitleRow.number}:M${subTitleRow.number}`);

    sheet.addRow([]);

    // Preambles (Căn cứ & Thành phần hội đồng)
    const p1 = sheet.addRow(['- Căn cứ Quyết định số 05/QĐ-TTKSBT ngày 05/01/2026 của Giám đốc CDC Đà Nẵng về việc thành lập Hội đồng kiểm kê tài sản năm 2026.']);
    p1.font = { name: 'Times New Roman', size: 10, italic: true };
    sheet.mergeCells(`A${p1.number}:M${p1.number}`);

    const p2 = sheet.addRow(['- Nguồn kinh phí hình thành: Ngân sách Nhà nước cấp & Quỹ phát triển hoạt động sự nghiệp']);
    p2.font = { name: 'Times New Roman', size: 10, italic: true };
    sheet.mergeCells(`A${p2.number}:M${p2.number}`);

    const p3 = sheet.addRow([`- Hôm nay, ngày ${reportDateStr}, tại Trung tâm Kiểm soát bệnh tật TP Đà Nẵng, chúng tôi gồm:`]);
    p3.font = { name: 'Times New Roman', size: 10, italic: true };
    sheet.mergeCells(`A${p3.number}:M${p3.number}`);

    const m1 = sheet.addRow(['1. ' + directorName, '', '', 'Giám đốc', '', '', '', '', '', '', '', 'Chủ tịch Hội đồng', '']);
    m1.font = { name: 'Times New Roman', size: 10 };
    sheet.mergeCells(`A${m1.number}:C${m1.number}`);
    sheet.mergeCells(`D${m1.number}:H${m1.number}`);
    sheet.mergeCells(`I${m1.number}:M${m1.number}`);

    const m2 = sheet.addRow(['2. ' + tcktName, '', '', 'Trưởng phòng TC - KT', '', '', '', '', '', '', '', 'Ủy viên Tài chính', '']);
    m2.font = { name: 'Times New Roman', size: 10 };
    sheet.mergeCells(`A${m2.number}:C${m2.number}`);
    sheet.mergeCells(`D${m2.number}:H${m2.number}`);
    sheet.mergeCells(`I${m2.number}:M${m2.number}`);

    const m3 = sheet.addRow(['3. ' + leaderName, '', '', leaderTitle, '', '', '', '', '', '', '', 'Tổ trưởng Chuyên trách', '']);
    m3.font = { name: 'Times New Roman', size: 10 };
    sheet.mergeCells(`A${m3.number}:C${m3.number}`);
    sheet.mergeCells(`D${m3.number}:H${m3.number}`);
    sheet.mergeCells(`I${m3.number}:M${m3.number}`);

    const m4 = sheet.addRow([`4. Đại diện: ${dept ? dept.name : 'Các Khoa / Phòng'}`, '', '', 'Trưởng / Phó Đơn vị', '', '', '', '', '', '', '', 'Đại diện Khoa', '']);
    m4.font = { name: 'Times New Roman', size: 10 };
    sheet.mergeCells(`A${m4.number}:C${m4.number}`);
    sheet.mergeCells(`D${m4.number}:H${m4.number}`);
    sheet.mergeCells(`I${m4.number}:M${m4.number}`);

    const m5 = sheet.addRow(['5. Thành viên tổ kiểm kê: ' + reporterNames.replace(/\n/g, ', ')]);
    m5.font = { name: 'Times New Roman', size: 10 };
    sheet.mergeCells(`A${m5.number}:M${m5.number}`);

    const p4 = sheet.addRow(['Cùng tiến hành kiểm kê tài sản, kết quả như sau:']);
    p4.font = { name: 'Times New Roman', size: 10, italic: true, bold: true };
    sheet.mergeCells(`A${p4.number}:M${p4.number}`);

    sheet.addRow([]);

    // Table Header 1 (Rows 16-17)
    const headerRow1 = sheet.addRow([
      'STT',
      'TÀI SẢN / TÊN THIẾT BỊ',
      'Mã số',
      'Năm đưa vào SD',
      'Theo sổ sách (SL)',
      'Thực tế KK (SL)',
      'Chênh lệch',
      'Đơn giá (đ)',
      'Thành tiền (đ)',
      'Bộ phận quản lý',
      'Nơi sử dụng / Người SD',
      'Tình trạng sử dụng',
      'Ghi chú / Vị trí'
    ]);

    headerRow1.height = 28;
    headerRow1.eachCell(cell => {
      cell.font = { name: 'Times New Roman', size: 9.5, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      cell.border = THIN_BORDER;
    });

    const headerRow2 = sheet.addRow([
      'A', 'B', 'C', 'D', '1', '2', '3', '4', '5', '6', '7', '8', '9'
    ]);
    headerRow2.height = 18;
    headerRow2.eachCell(cell => {
      cell.font = { name: 'Times New Roman', size: 9, italic: true, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      cell.border = THIN_BORDER;
    });

    sheet.columns = [
      { key: 'stt', width: 5.5 },
      { key: 'name', width: 34 },
      { key: 'assetCode', width: 15 },
      { key: 'yearInUse', width: 9 },
      { key: 'bookQty', width: 10 },
      { key: 'actualQty', width: 10 },
      { key: 'diff', width: 9 },
      { key: 'price', width: 14 },
      { key: 'total', width: 15 },
      { key: 'unit', width: 15 },
      { key: 'user', width: 22 },
      { key: 'status', width: 14 },
      { key: 'note', width: 18 }
    ];

    let totalBookQty = 0;
    let totalActualQty = 0;
    let totalValue = 0;

    assets.forEach((a, idx) => {
      const bQty = a.bookQuantity || 1;
      const aQty = a.actualQuantity !== undefined && a.actualQuantity !== null ? a.actualQuantity : bQty;
      const diff = a.quantityDifference || (aQty - bQty);
      const price = a.originalPrice || 0;
      const itemTotal = price > 0 ? price * aQty : 0;

      totalBookQty += bQty;
      totalActualQty += aQty;
      totalValue += itemTotal;

      const unitText = a.managingUnit === 'DUOC' ? 'Khoa Dược' :
                       a.managingUnit === 'CNTT' ? 'Tổ CNTT' : 'Phòng TCHC';

      const statusText = a.status === 'DANG_SU_DUNG' ? 'Đang sử dụng' :
                         a.status === 'HONG' ? 'Hỏng' :
                         a.status === 'CHO_THANH_LY' ? 'ĐN thanh lý' :
                         a.status === 'BAO_TRI' ? 'Bảo trì' : a.status;

      const row = sheet.addRow([
        idx + 1,
        a.name + (a.specifications ? `\n- ${a.specifications}` : ''),
        a.assetCode,
        a.yearInUse || '',
        bQty,
        aQty,
        diff !== 0 ? diff : '-',
        price > 0 ? price : '',
        itemTotal > 0 ? itemTotal : '',
        unitText,
        a.department?.name || a.assignedTo || '',
        statusText,
        a.locationDetail || a.floor || a.note || ''
      ]);

      row.height = a.specifications ? 32 : 20;
      row.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(2).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(3).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(3).font = { name: 'Times New Roman', size: 9.5, bold: true };
      row.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(8).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(8).numFmt = '#,##0';
      row.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
      row.getCell(9).numFmt = '#,##0';
      row.getCell(10).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(11).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      row.getCell(12).alignment = { horizontal: 'center', vertical: 'middle' };
      row.getCell(13).alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };

      row.eachCell({ includeEmpty: true }, cell => {
        cell.border = THIN_BORDER;
        cell.font = cell.font || { name: 'Times New Roman', size: 9.5 };
      });
    });

    // Summary Row
    const sumRow = sheet.addRow([
      'TỔNG CỘNG', '', '', '',
      totalBookQty,
      totalActualQty,
      totalActualQty - totalBookQty !== 0 ? (totalActualQty - totalBookQty) : '-',
      '',
      totalValue > 0 ? totalValue : '',
      '', '', '', ''
    ]);

    sumRow.height = 24;
    sheet.mergeCells(`A${sumRow.number}:D${sumRow.number}`);
    sumRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    sumRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: true };
    sumRow.getCell(5).font = { name: 'Times New Roman', size: 10, bold: true };
    sumRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle' };
    sumRow.getCell(6).font = { name: 'Times New Roman', size: 10, bold: true };
    sumRow.getCell(6).alignment = { horizontal: 'center', vertical: 'middle' };
    sumRow.getCell(7).font = { name: 'Times New Roman', size: 10, bold: true };
    sumRow.getCell(7).alignment = { horizontal: 'center', vertical: 'middle' };
    sumRow.getCell(9).font = { name: 'Times New Roman', size: 10, bold: true };
    sumRow.getCell(9).alignment = { horizontal: 'right', vertical: 'middle' };
    sumRow.getCell(9).numFmt = '#,##0';

    sumRow.eachCell({ includeEmpty: true }, cell => {
      cell.border = DOUBLE_BOTTOM_BORDER;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
    });

    sheet.addRow([]);

    // Signatures Section (4 Columns)
    const dateRow = sheet.addRow(['', '', '', '', '', '', '', '', '', 'Đà Nẵng, ngày ' + reportDateStr]);
    dateRow.font = { name: 'Times New Roman', size: 10, italic: true };
    dateRow.getCell(10).alignment = { horizontal: 'center' };
    sheet.mergeCells(`J${dateRow.number}:M${dateRow.number}`);

    const sigTitleRow = sheet.addRow([
      'THÀNH VIÊN TỔ KIỂM KÊ', '', '',
      leaderTitle.toUpperCase(), '', '',
      'TRƯỞNG PHÒNG TC - KT', '', '',
      'CHỦ TỊCH HỘI ĐỒNG / GIÁM ĐỐC'
    ]);
    sigTitleRow.font = { name: 'Times New Roman', size: 10, bold: true };
    sheet.mergeCells(`A${sigTitleRow.number}:C${sigTitleRow.number}`);
    sheet.mergeCells(`D${sigTitleRow.number}:F${sigTitleRow.number}`);
    sheet.mergeCells(`G${sigTitleRow.number}:I${sigTitleRow.number}`);
    sheet.mergeCells(`J${sigTitleRow.number}:M${sigTitleRow.number}`);
    sigTitleRow.eachCell(c => { c.alignment = { horizontal: 'center', vertical: 'middle' }; });

    const sigNoteRow = sheet.addRow([
      '(Ký, ghi rõ họ tên)', '', '',
      '(Ký, ghi rõ họ tên)', '', '',
      '(Ký, ghi rõ họ tên)', '', '',
      '(Ký, ghi rõ họ tên, đóng dấu)'
    ]);
    sigNoteRow.font = { name: 'Times New Roman', size: 9, italic: true };
    sheet.mergeCells(`A${sigNoteRow.number}:C${sigNoteRow.number}`);
    sheet.mergeCells(`D${sigNoteRow.number}:F${sigNoteRow.number}`);
    sheet.mergeCells(`G${sigNoteRow.number}:I${sigNoteRow.number}`);
    sheet.mergeCells(`J${sigNoteRow.number}:M${sigNoteRow.number}`);
    sigNoteRow.eachCell(c => { c.alignment = { horizontal: 'center', vertical: 'middle' }; });

    // Spacer rows for physical signatures
    sheet.addRow([]);
    sheet.addRow([]);
    sheet.addRow([]);

    const sigNamesRow = sheet.addRow([
      reporterNames.split('\n')[0] || '- Mai Thị Tính', '', '',
      leaderName, '', '',
      tcktName, '', '',
      directorName
    ]);
    sigNamesRow.font = { name: 'Times New Roman', size: 10, bold: true };
    sheet.mergeCells(`A${sigNamesRow.number}:C${sigNamesRow.number}`);
    sheet.mergeCells(`D${sigNamesRow.number}:F${sigNamesRow.number}`);
    sheet.mergeCells(`G${sigNamesRow.number}:I${sigNamesRow.number}`);
    sheet.mergeCells(`J${sigNamesRow.number}:M${sigNamesRow.number}`);
    sigNamesRow.eachCell(c => { c.alignment = { horizontal: 'center', vertical: 'middle' }; });

    // Additional reporter members
    const otherMembers = reporterNames.split('\n').slice(1);
    otherMembers.forEach((mem: string) => {
      const memRow = sheet.addRow([mem.trim()]);
      memRow.font = { name: 'Times New Roman', size: 10 };
      sheet.mergeCells(`A${memRow.number}:C${memRow.number}`);
    });

    const filePrefix = dept ? dept.code : managingUnit || 'CDC';
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=BienBan_KiemKe_C53_HD_${filePrefix}_2026.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export C53-HD error:', error);
    res.status(500).json({ error: 'Error exporting C53-HD inventory sheet' });
  }
});

export default router;

