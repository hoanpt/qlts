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

// Helper: convert 1-based index to Excel column letter (e.g. 1 -> A, 13 -> M, 27 -> AA)
function toColLetter(colIdx: number): string {
  let letter = '';
  let temp = colIdx;
  while (temp > 0) {
    const rem = (temp - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    temp = Math.floor((temp - 1) / 26);
  }
  return letter;
}

// 2. Xuất biểu mẫu kiểm kê C53-HD chuẩn của CDC Đà Nẵng (Chuẩn 100% biểu mẫu Bộ Tài Chính & Kẻ ô toàn diện)
router.get('/c53-hd', requireAuth, async (req: any, res) => {
  try {
    const { departmentId, managingUnit, buildingAsset, floor, inventoryDate, signaturesJson, visibleColumns } = req.query;
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
        { assetCode: 'asc' }
      ]
    });

    // Custom signatures if passed from client
    let sigs: any = {};
    if (signaturesJson) {
      try { sigs = JSON.parse(signaturesJson as string); } catch {}
    }

    const reporterNames = sigs.membersText || '- Trần Văn Vũ\n- Phan Thanh Hoàn\n- Trần Thị Liên\n- Huỳnh Thị Thanh Tú';
    const isCntt = managingUnit === 'CNTT' || (req.user && req.user.role === 'MANAGER_CNTT');
    const leaderTitle = sigs.leaderTitle || (isCntt ? (dept ? `Trưởng ${dept.name}` : 'TỔ TRƯỞNG TỔ CNTT') : managingUnit === 'TCHC' ? 'TRƯỞNG PHÒNG TCHC' : 'PHỤ TRÁCH KHOA DƯỢC - VTYT');
    const leaderName = sigs.leaderName || (isCntt ? 'KTV. Phan Thanh Hoàn' : managingUnit === 'TCHC' ? 'Ông. Trần Liên' : 'DS. Mai Thị Tính');
    const tcktName = sigs.financeName || 'Ông. Hồ Phú Quảng';
    const directorName = sigs.presidentName || 'Ông. Nguyễn Đại Vĩnh';
    const reportDateStr = inventoryDate || '15 tháng 01 năm 2026';

    let unitTitle = 'TOÀN TRUNG TÂM';
    if (isCntt) {
      unitTitle = dept ? `THIẾT BỊ CNTT ${dept.name.toUpperCase()}` : 'THIẾT BỊ CÔNG NGHỆ THÔNG TIN (TỔ CNTT QUẢN LÝ)';
    } else if (dept) {
      unitTitle = `KHOA / PHÒNG: ${dept.name.toUpperCase()}`;
    } else if (managingUnit === 'DUOC') {
      unitTitle = 'KHỐI TRANG THIẾT BỊ Y TẾ (KHOA DƯỢC QUẢN LÝ)';
    } else if (managingUnit === 'TCHC' && buildingAsset === '1') {
      unitTitle = `HẠ TẦNG CƠ SỞ VẬT CHẤT TÒA NHÀ (${floor || 'CÁC TẦNG'})`;
    } else if (managingUnit === 'TCHC') {
      unitTitle = 'THIẾT BỊ HÀNH CHÍNH & CÔNG CỤ DỤNG CỤ (PHÒNG TCHC QUẢN LÝ)';
    }

    const ALL_COLUMNS: Record<string, {
      key: string;
      header: string;
      width: number;
      align: 'left' | 'center' | 'right';
      bold?: boolean;
      numFmt?: string;
      getValue: (a: any, idx: number) => any;
      isTotal?: boolean;
    }> = {
      stt: {
        key: 'stt',
        header: 'STT',
        width: 5.5,
        align: 'center',
        getValue: (_, idx) => idx + 1
      },
      name: {
        key: 'name',
        header: 'TÀI SẢN',
        width: 36,
        align: 'left',
        getValue: (a) => a.name + (a.specifications ? `\n- ${a.specifications}` : '')
      },
      oldAssetCode: {
        key: 'oldAssetCode',
        header: 'Mã số cũ',
        width: 16,
        align: 'center',
        getValue: (a) => a.oldAssetCode || ''
      },
      assetCode: {
        key: 'assetCode',
        header: 'Mã số mới',
        width: 17,
        align: 'center',
        bold: true,
        getValue: (a) => a.assetCode || ''
      },
      yearInUse: {
        key: 'yearInUse',
        header: 'Năm đưa vào SD',
        width: 10,
        align: 'center',
        getValue: (a) => a.yearInUse || ''
      },
      bookQty: {
        key: 'bookQty',
        header: 'Sổ sách (SL)',
        width: 10,
        align: 'center',
        getValue: (a) => a.bookQuantity || 1,
        isTotal: true
      },
      actualQty: {
        key: 'actualQty',
        header: 'Thực tế KK (SL)',
        width: 11,
        align: 'center',
        bold: true,
        getValue: (a) => (a.actualQuantity !== undefined && a.actualQuantity !== null ? a.actualQuantity : (a.bookQuantity || 1)),
        isTotal: true
      },
      diff: {
        key: 'diff',
        header: 'Chênh lệch',
        width: 10,
        align: 'center',
        getValue: (a) => {
          const bQty = a.bookQuantity || 1;
          const aQty = a.actualQuantity !== undefined && a.actualQuantity !== null ? a.actualQuantity : bQty;
          const diff = a.quantityDifference !== undefined && a.quantityDifference !== null ? a.quantityDifference : (aQty - bQty);
          return diff !== 0 ? diff : '-';
        },
        isTotal: true
      },
      price: {
        key: 'price',
        header: 'Đơn giá (đ)',
        width: 14,
        align: 'right',
        numFmt: '#,##0',
        getValue: (a) => (a.originalPrice && a.originalPrice > 0 ? a.originalPrice : '')
      },
      total: {
        key: 'total',
        header: 'Thành tiền (đ)',
        width: 16,
        align: 'right',
        bold: true,
        numFmt: '#,##0',
        getValue: (a) => {
          const aQty = a.actualQuantity !== undefined && a.actualQuantity !== null ? a.actualQuantity : (a.bookQuantity || 1);
          const price = a.originalPrice || 0;
          return price > 0 ? price * aQty : '';
        },
        isTotal: true
      },
      unit: {
        key: 'unit',
        header: 'Bộ phận quản lý',
        width: 14,
        align: 'center',
        getValue: (a) => (a.managingUnit === 'DUOC' ? 'Khoa Dược' : a.managingUnit === 'CNTT' ? 'Tổ CNTT' : 'Phòng TCHC')
      },
      user: {
        key: 'user',
        header: 'Nơi sử dụng / Người SD',
        width: 22,
        align: 'left',
        getValue: (a) => a.locationDetail || a.assignedTo || a.department?.name || ''
      },
      status: {
        key: 'status',
        header: 'Tình trạng sử dụng',
        width: 14,
        align: 'center',
        getValue: (a) => {
          return a.status === 'DANG_SU_DUNG' ? 'Đang sử dụng' :
                 a.status === 'HONG' ? 'Hỏng' :
                 a.status === 'CHO_THANH_LY' ? 'ĐN thanh lý' :
                 a.status === 'BAO_TRI' ? 'Bảo trì' : 
                 a.status === 'KHONG_SU_DUNG' ? 'Không sử dụng' : (a.status || 'Đang sử dụng');
        }
      },
      location: {
        key: 'location',
        header: 'Nơi TS mới chuyển đến',
        width: 15,
        align: 'center',
        getValue: (a) => a.location || 'Cơ sở 1'
      },
      note: {
        key: 'note',
        header: 'Ghi chú',
        width: 18,
        align: 'left',
        getValue: (a) => a.note || ''
      }
    };

    const DEFAULT_KEYS = [
      'stt', 'name', 'oldAssetCode', 'assetCode', 'yearInUse',
      'actualQty', 'price', 'total', 'unit', 'user', 'status', 'location', 'note'
    ];

    let activeKeys = DEFAULT_KEYS;
    if (visibleColumns && typeof visibleColumns === 'string') {
      const parsed = visibleColumns.split(',').map((k: string) => k.trim()).filter((k: string) => ALL_COLUMNS[k]);
      if (parsed.length > 0) {
        if (!parsed.includes('stt')) parsed.unshift('stt');
        if (!parsed.includes('name')) parsed.splice(1, 0, 'name');
        activeKeys = parsed;
      }
    }

    const columns = activeKeys.map(k => ALL_COLUMNS[k]);
    const totalCols = columns.length;

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

    const lastColLetter = toColLetter(totalCols);
    const midColLetter = toColLetter(Math.max(2, Math.floor(totalCols / 2)));

    // Row 1-2: Header (Đơn vị & Mẫu số C53-HD)
    const r1 = sheet.addRow(new Array(totalCols).fill(''));
    r1.getCell(1).value = 'Đơn vị: Trung tâm Kiểm soát bệnh tật TP Đà Nẵng';
    r1.getCell(1).font = { name: 'Times New Roman', size: 11, bold: true };
    r1.getCell(totalCols).value = 'Mẫu số C53-HD';
    r1.getCell(totalCols).font = { name: 'Times New Roman', size: 11, bold: true };
    r1.getCell(totalCols).alignment = { horizontal: 'right' };
    sheet.mergeCells(`A1:${midColLetter}1`);

    const r2 = sheet.addRow(new Array(totalCols).fill(''));
    r2.getCell(1).value = 'Mã ĐV SDNS: 1127644';
    r2.getCell(1).font = { name: 'Times New Roman', size: 10, bold: true };
    r2.getCell(totalCols).value = '(Ban hành theo TT số 107/2017/TT-BTC)';
    r2.getCell(totalCols).font = { name: 'Times New Roman', size: 9, italic: true };
    r2.getCell(totalCols).alignment = { horizontal: 'right' };
    sheet.mergeCells(`A2:${midColLetter}2`);

    sheet.addRow([]);

    // Row 4-5: Title
    const titleRow = sheet.addRow(new Array(totalCols).fill(''));
    titleRow.getCell(1).value = 'BIÊN BẢN KIỂM KÊ TÀI SẢN CỐ ĐỊNH NĂM 2026';
    titleRow.font = { name: 'Times New Roman', size: 14, bold: true };
    titleRow.alignment = { horizontal: 'center' };
    sheet.mergeCells(`A${titleRow.number}:${lastColLetter}${titleRow.number}`);

    const subTitleRow = sheet.addRow(new Array(totalCols).fill(''));
    subTitleRow.getCell(1).value = unitTitle;
    subTitleRow.font = { name: 'Times New Roman', size: 12, bold: true, color: { argb: 'FF1E40AF' } };
    subTitleRow.alignment = { horizontal: 'center' };
    sheet.mergeCells(`A${subTitleRow.number}:${lastColLetter}${subTitleRow.number}`);

    sheet.addRow([]);

    // Preambles (Căn cứ & Thành phần hội đồng)
    const p1 = sheet.addRow(['- Căn cứ Quyết định số 05/QĐ-TTKSBT ngày 05/01/2026 của Giám đốc CDC Đà Nẵng về việc thành lập Hội đồng kiểm kê tài sản năm 2026.']);
    p1.font = { name: 'Times New Roman', size: 10, italic: true };
    sheet.mergeCells(`A${p1.number}:${lastColLetter}${p1.number}`);

    const p2 = sheet.addRow(['- Nguồn kinh phí hình thành: Ngân sách Nhà nước cấp & Quỹ phát triển hoạt động sự nghiệp']);
    p2.font = { name: 'Times New Roman', size: 10, italic: true };
    sheet.mergeCells(`A${p2.number}:${lastColLetter}${p2.number}`);

    const p3 = sheet.addRow([`- Hôm nay, ngày ${reportDateStr}, tại Trung tâm Kiểm soát bệnh tật TP Đà Nẵng, chúng tôi gồm:`]);
    p3.font = { name: 'Times New Roman', size: 10, italic: true };
    sheet.mergeCells(`A${p3.number}:${lastColLetter}${p3.number}`);

    const m1 = sheet.addRow(['1. ' + directorName, '', '', 'Giám đốc', '', '', '', '', '', '', '', 'Chủ tịch Hội đồng', '']);
    m1.font = { name: 'Times New Roman', size: 10 };
    sheet.mergeCells(`A${m1.number}:C${m1.number}`);
    sheet.mergeCells(`D${m1.number}:H${m1.number}`);
    sheet.mergeCells(`I${m1.number}:${lastColLetter}${m1.number}`);

    const m2 = sheet.addRow(['2. ' + tcktName, '', '', 'Trưởng phòng TC - KT', '', '', '', '', '', '', '', 'Ủy viên', '']);
    m2.font = { name: 'Times New Roman', size: 10 };
    sheet.mergeCells(`A${m2.number}:C${m2.number}`);
    sheet.mergeCells(`D${m2.number}:H${m2.number}`);
    sheet.mergeCells(`I${m2.number}:${lastColLetter}${m2.number}`);

    const m3 = sheet.addRow(['3. ' + (isCntt ? 'Ông. Trần Văn Vũ' : leaderName), '', '', (isCntt ? 'Trưởng phòng KHNV' : leaderTitle), '', '', '', '', '', '', '', (isCntt ? 'Tổ trưởng' : 'Tổ trưởng Chuyên trách'), '']);
    m3.font = { name: 'Times New Roman', size: 10 };
    sheet.mergeCells(`A${m3.number}:C${m3.number}`);
    sheet.mergeCells(`D${m3.number}:H${m3.number}`);
    sheet.mergeCells(`I${m3.number}:${lastColLetter}${m3.number}`);

    const m4 = sheet.addRow([`4. Đại diện: ${dept ? dept.name : 'Các Khoa / Phòng'}`, '', '', (dept ? (leaderName || 'Trưởng / Phó Đơn vị') : 'Trưởng / Phó Đơn vị'), '', '', '', '', '', '', '', 'Đại diện Khoa', '']);
    m4.font = { name: 'Times New Roman', size: 10 };
    sheet.mergeCells(`A${m4.number}:C${m4.number}`);
    sheet.mergeCells(`D${m4.number}:H${m4.number}`);
    sheet.mergeCells(`I${m4.number}:${lastColLetter}${m4.number}`);

    const m5 = sheet.addRow(['5. Thành viên tổ kiểm kê: ' + reporterNames.replace(/\n/g, ', ')]);
    m5.font = { name: 'Times New Roman', size: 10 };
    sheet.mergeCells(`A${m5.number}:${lastColLetter}${m5.number}`);

    const p4 = sheet.addRow(['Cùng tiến hành kiểm kê tài sản, kết quả như sau:']);
    p4.font = { name: 'Times New Roman', size: 10, italic: true, bold: true };
    sheet.mergeCells(`A${p4.number}:${lastColLetter}${p4.number}`);

    sheet.addRow([]);

    // Table Header 1
    const headerRow1 = sheet.addRow(columns.map(c => c.header));
    headerRow1.height = 28;
    headerRow1.eachCell(cell => {
      cell.font = { name: 'Times New Roman', size: 9.5, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      cell.border = THIN_BORDER;
    });

    // Reference Row
    let letterCode = 65; // 'A'
    let numCode = 1;
    const refRowValues = columns.map(c => {
      if (['stt', 'name', 'oldAssetCode', 'assetCode', 'yearInUse'].includes(c.key)) {
        return String.fromCharCode(letterCode++);
      } else {
        return (numCode++).toString();
      }
    });

    const headerRow2 = sheet.addRow(refRowValues);
    headerRow2.height = 18;
    headerRow2.eachCell(cell => {
      cell.font = { name: 'Times New Roman', size: 9, italic: true, bold: true };
      cell.alignment = { horizontal: 'center', vertical: 'middle' };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
      cell.border = THIN_BORDER;
    });

    sheet.columns = columns.map(c => ({ key: c.key, width: c.width }));

    let totalBookQty = 0;
    let totalActualQty = 0;
    let totalDiffQty = 0;
    let totalValue = 0;

    assets.forEach((a, idx) => {
      const bQty = a.bookQuantity || 1;
      const aQty = a.actualQuantity !== undefined && a.actualQuantity !== null ? a.actualQuantity : bQty;
      const diff = a.quantityDifference !== undefined && a.quantityDifference !== null ? a.quantityDifference : (aQty - bQty);
      const price = a.originalPrice || 0;
      const itemTotal = price > 0 ? price * aQty : 0;

      totalBookQty += bQty;
      totalActualQty += aQty;
      totalDiffQty += diff;
      totalValue += itemTotal;

      const rowValues = columns.map(c => c.getValue(a, idx));
      const row = sheet.addRow(rowValues);
      row.height = a.specifications ? 32 : 20;

      columns.forEach((c, colIdx) => {
        const cell = row.getCell(colIdx + 1);
        cell.alignment = { 
          horizontal: c.align, 
          vertical: 'middle', 
          wrapText: c.align === 'left' 
        };
        if (c.bold) cell.font = { name: 'Times New Roman', size: 9.5, bold: true };
        else cell.font = { name: 'Times New Roman', size: 9.5 };
        if (c.numFmt) cell.numFmt = c.numFmt;
        cell.border = THIN_BORDER;
      });
    });

    // Summary Row
    const firstNumColIdx = columns.findIndex(c => ['bookQty', 'actualQty', 'price', 'total'].includes(c.key));
    const mergeUpTo = firstNumColIdx > 0 ? firstNumColIdx : Math.min(2, totalCols);

    const sumValues = columns.map((c, colIdx) => {
      if (colIdx === 0) return 'TỔNG CỘNG';
      if (colIdx < mergeUpTo) return '';
      if (c.key === 'bookQty') return totalBookQty;
      if (c.key === 'actualQty') return totalActualQty;
      if (c.key === 'diff') return totalDiffQty !== 0 ? totalDiffQty : '-';
      if (c.key === 'total') return totalValue > 0 ? totalValue : '';
      return '';
    });

    const sumRow = sheet.addRow(sumValues);
    sumRow.height = 24;
    
    if (mergeUpTo > 1) {
      sheet.mergeCells(`A${sumRow.number}:${toColLetter(mergeUpTo)}${sumRow.number}`);
    }
    sumRow.getCell(1).alignment = { horizontal: 'center', vertical: 'middle' };
    sumRow.getCell(1).font = { name: 'Times New Roman', size: 10, bold: true };

    columns.forEach((c, colIdx) => {
      const cell = sumRow.getCell(colIdx + 1);
      cell.border = DOUBLE_BOTTOM_BORDER;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } };
      if (['bookQty', 'actualQty', 'diff', 'total'].includes(c.key)) {
        cell.font = { name: 'Times New Roman', size: 10, bold: true };
        cell.alignment = { horizontal: c.align, vertical: 'middle' };
        if (c.numFmt) cell.numFmt = c.numFmt;
      }
    });

    sheet.addRow([]);

    // Signatures Section (4 Columns)
    const c1End = Math.max(1, Math.floor(totalCols * 0.25));
    const c2Start = c1End + 1;
    const c2End = Math.max(c2Start, Math.floor(totalCols * 0.50));
    const c3Start = c2End + 1;
    const c3End = Math.max(c3Start, Math.floor(totalCols * 0.75));
    const c4Start = c3End + 1;
    const c4End = totalCols;

    const l1S = toColLetter(1);
    const l1E = toColLetter(c1End);
    const l2S = toColLetter(c2Start);
    const l2E = toColLetter(c2End);
    const l3S = toColLetter(c3Start);
    const l3E = toColLetter(c3End);
    const l4S = toColLetter(c4Start);
    const l4E = toColLetter(c4End);

    const dateRow = sheet.addRow(new Array(totalCols).fill(''));
    dateRow.getCell(c4Start).value = 'Đà Nẵng, ngày ' + reportDateStr;
    dateRow.font = { name: 'Times New Roman', size: 10, italic: true };
    dateRow.getCell(c4Start).alignment = { horizontal: 'center' };
    if (c4End > c4Start) {
      sheet.mergeCells(`${l4S}${dateRow.number}:${l4E}${dateRow.number}`);
    }

    const sigTitleRow = sheet.addRow(new Array(totalCols).fill(''));
    sigTitleRow.getCell(1).value = 'THÀNH VIÊN TỔ KIỂM KÊ';
    sigTitleRow.getCell(c2Start).value = (dept ? `ĐẠI DIỆN ${dept.name.toUpperCase()}` : leaderTitle.toUpperCase());
    sigTitleRow.getCell(c3Start).value = 'TRƯỞNG PHÒNG TC - KT';
    sigTitleRow.getCell(c4Start).value = 'CHỦ TỊCH HỘI ĐỒNG';
    sigTitleRow.font = { name: 'Times New Roman', size: 10, bold: true };
    if (c1End > 1) sheet.mergeCells(`${l1S}${sigTitleRow.number}:${l1E}${sigTitleRow.number}`);
    if (c2End > c2Start) sheet.mergeCells(`${l2S}${sigTitleRow.number}:${l2E}${sigTitleRow.number}`);
    if (c3End > c3Start) sheet.mergeCells(`${l3S}${sigTitleRow.number}:${l3E}${sigTitleRow.number}`);
    if (c4End > c4Start) sheet.mergeCells(`${l4S}${sigTitleRow.number}:${l4E}${sigTitleRow.number}`);
    sigTitleRow.eachCell(c => { c.alignment = { horizontal: 'center', vertical: 'middle' }; });

    const sigNoteRow = sheet.addRow(new Array(totalCols).fill(''));
    sigNoteRow.getCell(1).value = '(Ký, ghi rõ họ tên)';
    sigNoteRow.getCell(c2Start).value = '(Ký, ghi rõ họ tên)';
    sigNoteRow.getCell(c3Start).value = '(Ký, ghi rõ họ tên)';
    sigNoteRow.getCell(c4Start).value = '(Ký, ghi rõ họ tên, đóng dấu)';
    sigNoteRow.font = { name: 'Times New Roman', size: 9, italic: true };
    if (c1End > 1) sheet.mergeCells(`${l1S}${sigNoteRow.number}:${l1E}${sigNoteRow.number}`);
    if (c2End > c2Start) sheet.mergeCells(`${l2S}${sigNoteRow.number}:${l2E}${sigNoteRow.number}`);
    if (c3End > c3Start) sheet.mergeCells(`${l3S}${sigNoteRow.number}:${l3E}${sigNoteRow.number}`);
    if (c4End > c4Start) sheet.mergeCells(`${l4S}${sigNoteRow.number}:${l4E}${sigNoteRow.number}`);
    sigNoteRow.eachCell(c => { c.alignment = { horizontal: 'center', vertical: 'middle' }; });

    // Spacer rows for physical signatures
    sheet.addRow([]);
    sheet.addRow([]);
    sheet.addRow([]);

    const sigNamesRow = sheet.addRow(new Array(totalCols).fill(''));
    sigNamesRow.getCell(1).value = reporterNames.split('\n')[0] || '- Trần Văn Vũ';
    sigNamesRow.getCell(c2Start).value = leaderName;
    sigNamesRow.getCell(c3Start).value = tcktName;
    sigNamesRow.getCell(c4Start).value = directorName;
    sigNamesRow.font = { name: 'Times New Roman', size: 10, bold: true };
    if (c1End > 1) sheet.mergeCells(`${l1S}${sigNamesRow.number}:${l1E}${sigNamesRow.number}`);
    if (c2End > c2Start) sheet.mergeCells(`${l2S}${sigNamesRow.number}:${l2E}${sigNamesRow.number}`);
    if (c3End > c3Start) sheet.mergeCells(`${l3S}${sigNamesRow.number}:${l3E}${sigNamesRow.number}`);
    if (c4End > c4Start) sheet.mergeCells(`${l4S}${sigNamesRow.number}:${l4E}${sigNamesRow.number}`);
    sigNamesRow.eachCell(c => { c.alignment = { horizontal: 'center', vertical: 'middle' }; });

    // Additional reporter members
    const otherMembers = reporterNames.split('\n').slice(1);
    otherMembers.forEach((mem: string) => {
      const memRow = sheet.addRow(new Array(totalCols).fill(''));
      memRow.getCell(1).value = mem.trim();
      memRow.font = { name: 'Times New Roman', size: 10 };
      if (c1End > 1) sheet.mergeCells(`${l1S}${memRow.number}:${l1E}${memRow.number}`);
    });

    const filePrefix = dept ? dept.code : (isCntt ? 'CNTT' : managingUnit || 'CDC');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=BienBan_KiemKe_${filePrefix}_2026.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export C53-HD error:', error);
    res.status(500).json({ error: 'Error exporting C53-HD inventory sheet' });
  }
});

// 3. Xuất danh sách Báo hỏng, Sửa chữa & Bảo trì (Excel chuẩn CDC Đà Nẵng có sắp xếp theo chỉ định)
router.get('/maintenance', requireAuth, async (req: any, res) => {
  try {
    const { departmentId, managingUnit, status, priority, sortBy = 'date', sortOrder = 'desc' } = req.query;
    const where: any = {};

    if (departmentId && departmentId !== 'ALL') {
      where.departmentId = parseInt(departmentId as string);
    } else if (req.user.role === 'DEPARTMENT' && req.user.departmentId) {
      where.departmentId = req.user.departmentId;
    }

    if (status && status !== 'ALL') where.status = status;
    if (priority && priority !== 'ALL') where.priority = priority;

    let enforcedUnit = managingUnit;
    if (req.user) {
      if (req.user.role === 'MANAGER_CNTT') enforcedUnit = 'CNTT';
      else if (req.user.role === 'MANAGER_DUOC') enforcedUnit = 'DUOC';
      else if (req.user.role === 'MANAGER_TCHC') enforcedUnit = 'TCHC';
    }

    let records = await prisma.maintenanceRequest.findMany({
      where,
      include: {
        asset: { include: { category: true, department: true } },
        department: true
      },
      orderBy: { requestDate: 'desc' }
    });

    if (enforcedUnit && enforcedUnit !== 'ALL') {
      records = records.filter(r => (r as any).managingUnit === enforcedUnit || (r.asset as any)?.managingUnit === enforcedUnit);
    }

    // Dynamic sorting by user-specified criteria
    const isAsc = sortOrder === 'asc';
    records.sort((a: any, b: any) => {
      let comparison = 0;
      if (sortBy === 'fundingSource') {
        const valA = ((a as any).fundingSource || '').trim();
        const valB = ((b as any).fundingSource || '').trim();
        comparison = valA.localeCompare(valB, 'vi');
      } else if (sortBy === 'status') {
        comparison = (a.status || '').localeCompare(b.status || '');
      } else if (sortBy === 'managingUnit') {
        const uA = (a as any).managingUnit || (a.asset as any)?.managingUnit || '';
        const uB = (b as any).managingUnit || (b.asset as any)?.managingUnit || '';
        comparison = uA.localeCompare(uB);
      } else if (sortBy === 'department') {
        const dA = a.department?.name || '';
        const dB = b.department?.name || '';
        comparison = dA.localeCompare(dB, 'vi');
      } else if (sortBy === 'priority') {
        comparison = (a.priority || '').localeCompare(b.priority || '');
      } else if (sortBy === 'assetCode') {
        const cA = a.asset?.assetCode || '';
        const cB = b.asset?.assetCode || '';
        comparison = cA.localeCompare(cB, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortBy === 'cost') {
        comparison = (a.repairCost || 0) - (b.repairCost || 0);
      } else {
        comparison = new Date(a.requestDate).getTime() - new Date(b.requestDate).getTime();
      }
      return isAsc ? comparison : -comparison;
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('SuaChua_BaoTri', {
      views: [{ showGridLines: true }]
    });

    sheet.pageSetup = {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
    };

    // Header
    const r1 = sheet.addRow(['TRUNG TÂM KIỂM SOÁT BỆNH TẬT THÀNH PHỐ ĐÀ NẴNG', '', '', '', '', '', '', '', '', '', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM']);
    r1.font = { name: 'Times New Roman', size: 10, bold: true };
    sheet.mergeCells('A1:F1');
    sheet.mergeCells('G1:M1');
    r1.getCell(7).alignment = { horizontal: 'center' };

    const r2 = sheet.addRow(['BỘ PHẬN KỸ THUẬT & QUẢN LÝ TÀI SẢN', '', '', '', '', '', '', '', '', '', '', '', 'Độc lập - Tự do - Hạnh phúc']);
    r2.font = { name: 'Times New Roman', size: 10, italic: true };
    sheet.mergeCells('A2:F2');
    sheet.mergeCells('G2:M2');
    r2.getCell(7).alignment = { horizontal: 'center' };

    sheet.addRow([]);

    const titleRow = sheet.addRow(['DANH SÁCH THEO DÕI BÁO HỎNG, BẢO TRÌ & SỬA CHỮA TRANG THIẾT BỊ NĂM 2026']);
    titleRow.font = { name: 'Times New Roman', size: 13, bold: true };
    titleRow.alignment = { horizontal: 'center' };
    sheet.mergeCells(`A${titleRow.number}:M${titleRow.number}`);

    const subTitleRow = sheet.addRow([`Thời điểm xuất: ${new Date().toLocaleDateString('vi-VN')} | Tổng số hồ sơ: ${records.length}`]);
    subTitleRow.font = { name: 'Times New Roman', size: 10, italic: true };
    subTitleRow.alignment = { horizontal: 'center' };
    sheet.mergeCells(`A${subTitleRow.number}:M${subTitleRow.number}`);

    sheet.addRow([]);

    // Table Header
    const headerRow = sheet.addRow([
      'STT', 'Mã thiết bị', 'Tên trang thiết bị', 'Khoa / Phòng sử dụng', 'Khối quản lý',
      'Ngày báo hỏng', 'Người đề nghị', 'Mô tả sự cố hư hỏng', 'Cán bộ kỹ thuật / Tiếp nhận',
      'Đơn vị sửa chữa', 'Kinh phí (VNĐ)', 'Nguồn kinh phí', 'Trạng thái'
    ]);
    headerRow.height = 28;
    headerRow.font = { name: 'Times New Roman', size: 10, bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerRow.eachCell(c => {
      c.border = THIN_BORDER;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    });

    sheet.columns = [
      { key: 'stt', width: 6 },
      { key: 'code', width: 14 },
      { key: 'name', width: 28 },
      { key: 'dept', width: 22 },
      { key: 'unit', width: 14 },
      { key: 'date', width: 13 },
      { key: 'requester', width: 18 },
      { key: 'issue', width: 32 },
      { key: 'tech', width: 18 },
      { key: 'vendor', width: 22 },
      { key: 'cost', width: 16 },
      { key: 'source', width: 20 },
      { key: 'status', width: 15 }
    ];

    const dataStart = headerRow.number + 1;
    let currentRow = dataStart;

    records.forEach((r, idx) => {
      const u = (r as any).managingUnit || (r.asset as any)?.managingUnit || 'CNTT';
      const uLabel = u === 'DUOC' ? 'Khoa Dược (TBYT)' : u === 'CNTT' ? 'Tổ CNTT' : 'Phòng TCHC';
      const statusLabel = r.status === 'COMPLETED' ? 'Đã hoàn thành' :
                          r.status === 'IN_PROGRESS' ? 'Đang xử lý' :
                          r.status === 'REJECTED' ? 'Từ chối' : 'Chờ tiếp nhận';

      const row = sheet.addRow([
        idx + 1,
        r.asset?.assetCode || '',
        r.asset?.name || '',
        r.department?.name || r.asset?.department?.name || '',
        uLabel,
        r.requestDate ? new Date(r.requestDate).toLocaleDateString('vi-VN') : '',
        r.requestedBy || '',
        r.issueDescription || '',
        r.technicianName || '',
        r.repairVendor || '',
        r.repairCost || 0,
        (r as any).fundingSource || 'Nguồn ngân sách',
        statusLabel
      ]);

      row.font = { name: 'Times New Roman', size: 10 };
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(6).alignment = { horizontal: 'center' };
      row.getCell(11).alignment = { horizontal: 'right' };
      row.getCell(11).numFmt = '#,##0';
      row.getCell(13).alignment = { horizontal: 'center' };

      row.eachCell(c => { c.border = THIN_BORDER; });
      currentRow++;
    });

    // Total row
    const totalRow = sheet.addRow([
      'Tổng cộng', '', '', '', '', '', '', '', '', '',
      { formula: `SUM(K${dataStart}:K${currentRow - 1})` },
      '', ''
    ]);
    totalRow.font = { name: 'Times New Roman', size: 11, bold: true };
    sheet.mergeCells(`A${totalRow.number}:J${totalRow.number}`);
    totalRow.getCell(1).alignment = { horizontal: 'center' };
    totalRow.getCell(11).numFmt = '#,##0';
    totalRow.getCell(11).alignment = { horizontal: 'right' };
    totalRow.eachCell(c => { c.border = DOUBLE_BOTTOM_BORDER; });

    // Signature Block
    sheet.addRow([]);
    sheet.addRow([]);

    const sigDateRow = sheet.addRow(['', '', '', '', '', '', '', '', '', '', 'Đà Nẵng, ngày      tháng      năm 2026', '', '']);
    sigDateRow.font = { name: 'Times New Roman', size: 10, italic: true };
    sheet.mergeCells(`K${sigDateRow.number}:M${sigDateRow.number}`);
    sigDateRow.getCell(11).alignment = { horizontal: 'center' };

    const sigTitleRow = sheet.addRow([
      'NGƯỜI LẬP BIỂU', '', '', '',
      'PHỤ TRÁCH ĐƠN VỊ KỸ THUẬT', '', '', '',
      'BAN GIÁM ĐỐC', '', '', '', ''
    ]);
    sigTitleRow.font = { name: 'Times New Roman', size: 10, bold: true };
    sheet.mergeCells(`A${sigTitleRow.number}:D${sigTitleRow.number}`);
    sheet.mergeCells(`E${sigTitleRow.number}:H${sigTitleRow.number}`);
    sheet.mergeCells(`I${sigTitleRow.number}:M${sigTitleRow.number}`);
    sigTitleRow.eachCell(c => { c.alignment = { horizontal: 'center' }; });

    const sigNoteRow = sheet.addRow([
      '(Ký, ghi rõ họ tên)', '', '', '',
      '(Ký, ghi rõ họ tên)', '', '', '',
      '(Ký, ghi rõ họ tên, đóng dấu)', '', '', '', ''
    ]);
    sigNoteRow.font = { name: 'Times New Roman', size: 9, italic: true };
    sheet.mergeCells(`A${sigNoteRow.number}:D${sigNoteRow.number}`);
    sheet.mergeCells(`E${sigNoteRow.number}:H${sigNoteRow.number}`);
    sheet.mergeCells(`I${sigNoteRow.number}:M${sigNoteRow.number}`);
    sigNoteRow.eachCell(c => { c.alignment = { horizontal: 'center' }; });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=DanhSach_SuaChua_BaoTri_${sortBy}_2026.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Maintenance error:', error);
    res.status(500).json({ error: 'Error exporting maintenance Excel sheet' });
  }
});

// 4. Xuất danh sách Hiệu chuẩn, Thử nghiệm, Kiểm định TBYT (Excel chuẩn CDC Đà Nẵng có sắp xếp theo chỉ định)
router.get('/calibrations', requireAuth, async (req: any, res) => {
  try {
    const { serviceType, result, location, sortBy = 'date', sortOrder = 'asc' } = req.query;
    const where: any = {};

    if (result && result !== 'ALL') where.result = result;
    if (serviceType && serviceType !== 'ALL') where.serviceType = serviceType;

    let records = await prisma.calibrationRecord.findMany({
      where,
      include: {
        asset: {
          include: { department: true, category: true }
        }
      },
      orderBy: { calibrationDate: 'desc' }
    });

    if (location && location !== 'ALL') {
      records = records.filter(r => (r as any).departmentLocation?.includes(location as string));
    }

    // Dynamic sorting by user-specified criteria
    const isAsc = sortOrder === 'asc';
    records.sort((a: any, b: any) => {
      let comparison = 0;
      if (sortBy === 'fundingSource') {
        comparison = ((a as any).fundingSource || '').localeCompare((b as any).fundingSource || '', 'vi');
      } else if (sortBy === 'result') {
        comparison = (a.result || '').localeCompare(b.result || '');
      } else if (sortBy === 'serviceType') {
        comparison = (a.serviceType || '').localeCompare(b.serviceType || '');
      } else if (sortBy === 'decisionNumber') {
        comparison = ((a as any).decisionNumber || '').localeCompare((b as any).decisionNumber || '');
      } else if (sortBy === 'location') {
        const lA = (a as any).departmentLocation || a.asset?.department?.name || '';
        const lB = (b as any).departmentLocation || b.asset?.department?.name || '';
        comparison = lA.localeCompare(lB, 'vi');
      } else if (sortBy === 'assetCode') {
        const cA = a.asset?.assetCode || '';
        const cB = b.asset?.assetCode || '';
        comparison = cA.localeCompare(cB, undefined, { numeric: true, sensitivity: 'base' });
      } else if (sortBy === 'nextDate') {
        const tA = a.nextCalibrationDate ? new Date(a.nextCalibrationDate).getTime() : 0;
        const tB = b.nextCalibrationDate ? new Date(b.nextCalibrationDate).getTime() : 0;
        comparison = tA - tB;
      } else if (sortBy === 'cost') {
        comparison = ((a as any).cost || 0) - ((b as any).cost || 0);
      } else {
        comparison = new Date(a.calibrationDate).getTime() - new Date(b.calibrationDate).getTime();
      }
      return isAsc ? comparison : -comparison;
    });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('HieuChuan_TBYT', {
      views: [{ showGridLines: true }]
    });

    sheet.pageSetup = {
      orientation: 'landscape',
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 }
    };

    // Header
    const r1 = sheet.addRow(['TRUNG TÂM KIỂM SOÁT BỆNH TẬT THÀNH PHỐ ĐÀ NẴNG', '', '', '', '', '', '', '', '', '', '', '', 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM']);
    r1.font = { name: 'Times New Roman', size: 10, bold: true };
    sheet.mergeCells('A1:F1');
    sheet.mergeCells('G1:M1');
    r1.getCell(7).alignment = { horizontal: 'center' };

    const r2 = sheet.addRow(['KHOA DƯỢC - VẬT TƯ Y TẾ', '', '', '', '', '', '', '', '', '', '', '', 'Độc lập - Tự do - Hạnh phúc']);
    r2.font = { name: 'Times New Roman', size: 10, italic: true };
    sheet.mergeCells('A2:F2');
    sheet.mergeCells('G2:M2');
    r2.getCell(7).alignment = { horizontal: 'center' };

    sheet.addRow([]);

    const titleRow = sheet.addRow(['BẢNG THEO DÕI THỜI GIAN HIỆU CHUẨN, THỬ NGHIỆM, KIỂM ĐỊNH, KIỂM XẠ MÁY MÓC, TBYT NĂM 2026']);
    titleRow.font = { name: 'Times New Roman', size: 13, bold: true };
    titleRow.alignment = { horizontal: 'center' };
    sheet.mergeCells(`A${titleRow.number}:M${titleRow.number}`);

    const subTitleRow = sheet.addRow(['(Theo Quyết định số 34/QĐ-TTKSBT ngày 27/01/2026 - Đánh giá tiêu chuẩn ISO 17025)']);
    subTitleRow.font = { name: 'Times New Roman', size: 10, italic: true };
    subTitleRow.alignment = { horizontal: 'center' };
    sheet.mergeCells(`A${subTitleRow.number}:M${subTitleRow.number}`);

    sheet.addRow([]);

    // Table Header
    const headerRow = sheet.addRow([
      'STT', 'Mã TBYT', 'Tên thiết bị y tế', 'Bộ phận sử dụng', 'Loại hình',
      'Đơn vị thực hiện', 'Ngày thực hiện', 'Hạn hiệu chuẩn kế tiếp', 'Kinh phí (VNĐ)',
      'Nguồn kinh phí', 'Số quyết định', 'Tình trạng sau HC', 'Người nghiệm thu'
    ]);
    headerRow.height = 28;
    headerRow.font = { name: 'Times New Roman', size: 10, bold: true };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    headerRow.eachCell(c => {
      c.border = THIN_BORDER;
      c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
    });

    sheet.columns = [
      { key: 'stt', width: 6 },
      { key: 'code', width: 14 },
      { key: 'name', width: 30 },
      { key: 'dept', width: 20 },
      { key: 'type', width: 15 },
      { key: 'vendor', width: 24 },
      { key: 'date', width: 13 },
      { key: 'nextDate', width: 14 },
      { key: 'cost', width: 16 },
      { key: 'source', width: 18 },
      { key: 'decision', width: 20 },
      { key: 'status', width: 15 },
      { key: 'members', width: 24 }
    ];

    const dataStart = headerRow.number + 1;
    let currentRow = dataStart;

    records.forEach((r, idx) => {
      const typeLabel = r.serviceType === 'THU_NGHIEM' ? 'Thử nghiệm' :
                        r.serviceType === 'KIEM_DINH' ? 'Kiểm định' :
                        r.serviceType === 'KIEM_XA' ? 'Kiểm xạ' : 'Hiệu chuẩn';

      const row = sheet.addRow([
        idx + 1,
        r.asset?.assetCode || '',
        r.asset?.name || '',
        (r as any).departmentLocation || r.asset?.department?.name || '',
        typeLabel,
        r.vendor || 'TT SMETES',
        r.calibrationDate ? new Date(r.calibrationDate).toLocaleDateString('vi-VN') : '',
        r.nextCalibrationDate ? new Date(r.nextCalibrationDate).toLocaleDateString('vi-VN') : '',
        (r as any).cost || 0,
        (r as any).fundingSource || 'Thu sự nghiệp',
        (r as any).decisionNumber || '',
        (r as any).deviceStatusAfter || (r.result === 'PASS' ? 'Tốt' : 'Không đạt'),
        (r as any).acceptanceMembers || r.performedBy || ''
      ]);

      row.font = { name: 'Times New Roman', size: 10 };
      row.getCell(1).alignment = { horizontal: 'center' };
      row.getCell(2).alignment = { horizontal: 'center' };
      row.getCell(5).alignment = { horizontal: 'center' };
      row.getCell(7).alignment = { horizontal: 'center' };
      row.getCell(8).alignment = { horizontal: 'center' };
      row.getCell(9).alignment = { horizontal: 'right' };
      row.getCell(9).numFmt = '#,##0';
      row.getCell(12).alignment = { horizontal: 'center' };

      row.eachCell(c => { c.border = THIN_BORDER; });
      currentRow++;
    });

    // Total row
    const totalRow = sheet.addRow([
      'Tổng cộng', '', '', '', '', '', '', '',
      { formula: `SUM(I${dataStart}:I${currentRow - 1})` },
      '', '', '', ''
    ]);
    totalRow.font = { name: 'Times New Roman', size: 11, bold: true };
    sheet.mergeCells(`A${totalRow.number}:H${totalRow.number}`);
    totalRow.getCell(1).alignment = { horizontal: 'center' };
    totalRow.getCell(9).numFmt = '#,##0';
    totalRow.getCell(9).alignment = { horizontal: 'right' };
    totalRow.eachCell(c => { c.border = DOUBLE_BOTTOM_BORDER; });

    // Signature Block
    sheet.addRow([]);
    sheet.addRow([]);

    const sigDateRow = sheet.addRow(['', '', '', '', '', '', '', '', '', '', 'Đà Nẵng, ngày      tháng      năm 2026', '', '']);
    sigDateRow.font = { name: 'Times New Roman', size: 10, italic: true };
    sheet.mergeCells(`K${sigDateRow.number}:M${sigDateRow.number}`);
    sigDateRow.getCell(11).alignment = { horizontal: 'center' };

    const sigTitleRow = sheet.addRow([
      'NGƯỜI LẬP BIỂU', '', '', '',
      'TRƯỞNG KHOA DƯỢC - VTYT', '', '', '',
      'BAN GIÁM ĐỐC', '', '', '', ''
    ]);
    sigTitleRow.font = { name: 'Times New Roman', size: 10, bold: true };
    sheet.mergeCells(`A${sigTitleRow.number}:D${sigTitleRow.number}`);
    sheet.mergeCells(`E${sigTitleRow.number}:H${sigTitleRow.number}`);
    sheet.mergeCells(`I${sigTitleRow.number}:M${sigTitleRow.number}`);
    sigTitleRow.eachCell(c => { c.alignment = { horizontal: 'center' }; });

    const sigNoteRow = sheet.addRow([
      '(Ký, ghi rõ họ tên)', '', '', '',
      '(Ký, ghi rõ họ tên)', '', '', '',
      '(Ký, ghi rõ họ tên, đóng dấu)', '', '', '', ''
    ]);
    sigNoteRow.font = { name: 'Times New Roman', size: 9, italic: true };
    sheet.mergeCells(`A${sigNoteRow.number}:D${sigNoteRow.number}`);
    sheet.mergeCells(`E${sigNoteRow.number}:H${sigNoteRow.number}`);
    sheet.mergeCells(`I${sigNoteRow.number}:M${sigNoteRow.number}`);
    sigNoteRow.eachCell(c => { c.alignment = { horizontal: 'center' }; });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=BangTheoDoi_HieuChuan_TBYT_${sortBy}_2026.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Export Calibration error:', error);
    res.status(500).json({ error: 'Error exporting calibration Excel sheet' });
  }
});

export default router;

