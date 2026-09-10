import { PrismaClient } from '@prisma/client';

export const BT_DATA = [
  {
    "code": "TSXN267",
    "name": "Hệ thống Real - Time PCR nguyên khối (5 màu) Model: ARIAMX, Hãng SX: AGILENT Mỹ",
    "deptId": 2,
    "year": 2017,
    "maintDate": "2026-03-09",
    "vendor": "Công ty CP KHCN \nĐồng Tâm",
    "planContent": "Bảo trì bảo dưỡng - Bảo trì bảo dưỡng \ntoàn bộ hệ thống",
    "result": "PASS",
    "cost": 11340000.0,
    "decisionNumber": "Quyết định số \n57/QĐ-TTKSBT \nngày 04/02/2026",
    "acceptanceMembers": "Ds. Tính, Ds. Lộc, \nCn. Duy, Cn. Phong",
    "fundingSource": "Thu sự nghiệp",
    "deviceStatusAfter": "Tốt",
    "note": ""
  },
  {
    "code": "TSXN324",
    "name": "Máy đếm Tế bào T-CD4",
    "deptId": 2,
    "year": 2015,
    "maintDate": "2026-03-24",
    "vendor": "Công ty TNHH UNT VN",
    "planContent": "Bảo trì bảo dưỡng - Bảo trì bảo dưỡng \ntoàn bộ hệ thống",
    "result": "PASS",
    "cost": 39000000.0,
    "decisionNumber": "Quyết định số \n56/QĐ-TTKSBT \nngày 04/02/2026",
    "acceptanceMembers": "Ds. Tính, Ds. Lộc, \nCn. Duy, Cn. Phúc",
    "fundingSource": "Thu sự nghiệp",
    "deviceStatusAfter": "Tốt",
    "note": ""
  },
  {
    "code": "TSXN004",
    "name": "Hệ thống máy sắc ký khí",
    "deptId": 2,
    "year": 2006,
    "maintDate": "2026-01-13",
    "vendor": "Công ty TNHH Hóa chất \nvà Vật tư Khoa học kỹ thuật Cường Thịnh",
    "planContent": "Dịch vụ bảo trì, bảo dưỡng và nâng cấp phần mềm",
    "result": "FAIL",
    "cost": 0.0,
    "decisionNumber": "Ko thanh toán",
    "acceptanceMembers": "Công ty Đã đến thực hiện DV\n(tuy nhiên TB SD 2006, ko có linh kiện thay thế nên ko thanh toán)",
    "fundingSource": "Thu sự nghiệp",
    "deviceStatusAfter": "Không hoạt\n động",
    "note": "TB sử dụng từ 2006, không có linh kiện thay thế nên không thanh toán"
  },
  {
    "code": "TSXN411",
    "name": "Hệ thống ký sắc lỏng hiệu năng cao HPLC/UV-VIS 2489 Waters (Alliance e2695 XE)",
    "deptId": 2,
    "year": 2017,
    "maintDate": "2026-07-01",
    "vendor": "Công ty TNHH dịch vụ\n Khoa học và Công nghệ \nTIC.",
    "planContent": "Dịch vụ Bảo trì toàn bộ hệ thống",
    "result": "PASS",
    "cost": 27000000.0,
    "decisionNumber": "Quyết định số\n 394/QĐ-TTKSBT\n ngày 01/7/2026",
    "acceptanceMembers": "Ds. Tính, Ds.Thành, \nCn. Hải, Cn. Thu",
    "fundingSource": "Thu sự nghiệp",
    "deviceStatusAfter": "Tốt",
    "note": ""
  },
  {
    "code": "TSKD058",
    "name": "Hệ thống khí y tế trung tâm",
    "deptId": 11,
    "year": 2022,
    "maintDate": "2026-05-29",
    "vendor": "Công ty A.S.T MEDI",
    "planContent": "Dịch vụ bảo trì, \nbảo dưỡng, thay thế linh kiện",
    "result": "PASS",
    "cost": 49500000.0,
    "decisionNumber": "Quyết định số \n327/QĐ-TTKSBT\n ngày 29/5/2026",
    "acceptanceMembers": "Ds. Tính, \nDs. Thành,\nCn. Huệ,\nCn. Bình",
    "fundingSource": "Quỹ \nPTHĐSN",
    "deviceStatusAfter": "Tốt",
    "note": "Linh kiện: Nhớt, bạc đạn, đầu dẫn van lọc ngõ ra khí."
  },
  {
    "code": "TSKD059",
    "name": "Hệ thống lọc nước RO 250L/h",
    "deptId": 11,
    "year": 2023,
    "maintDate": "2026-08-17",
    "vendor": "Công ty XL nước Gia Hưng Phát DTH",
    "planContent": "Dịch vụ bảo trì, \nbảo dưỡng, thay thế linh kiện, VT - Dịch vụ bảo trì, \nbảo dưỡng, thay thế linh kiện",
    "result": "PASS",
    "cost": 20304000.0,
    "decisionNumber": "Quyết định số \n429/QĐ-TTKSBT\n ngày 21/7/2026",
    "acceptanceMembers": "Ds. Tính, \nDs. Lộc,\nCn. Duy,\nCn. Nghĩa",
    "fundingSource": "Quỹ \nPTHĐSN",
    "deviceStatusAfter": "Tốt",
    "note": "Linh kiện: Thay bộ do hiển thị TDS; Thay bóng đèn UV S150RL-HO; Thay lõi lọc tinh 5 micron; Thay lõi lọc sát khuẩn 0,2 micron"
  }
];

export const SC_DATA = [
  {
    "code": "TSPK368",
    "name": "Máy đo chức năng hô hấp; Model: Datospir Touch Easy-T; Xuất sứ: Tây Ban Nha",
    "deptId": 1,
    "year": 2024,
    "requestedBy": "Ds. Tính,",
    "issueDescription": "Không hiện biểu đồ\n khi đo thổi",
    "status": "COMPLETED",
    "cost": 30450000.0,
    "vendor": "Công ty CP Dược TBYT Tuấn Hà",
    "remedy": "Sửa chữa và thay thế linh \nkiện Transducer",
    "parts": "Transducer",
    "decision": "Quyết định số \n213/QĐ-TTKSBT \nngày 14/4/2026",
    "members": "Ds. Tính, \nDs. Lộc, \nBs. Nam, \nCn. Thảo",
    "funding": "Thu sự\n nghiệp",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSXN178",
    "name": "Tủ sấy JSON-153P(JSOF,",
    "deptId": 1,
    "year": 2026,
    "requestedBy": "Ds. Tính,",
    "issueDescription": "Hỏng cánh quạt",
    "status": "COMPLETED",
    "cost": 648000.0,
    "vendor": "Cơ sở điện lạnh Tuấn Vĩnh (Hộ KD Phạm Sĩ Vĩnh)",
    "remedy": "Hàn cánh quạt tủ sấy",
    "parts": "Không",
    "decision": "",
    "members": "Ds. Tính, \nDs. Lộc,  \nCn. Hồng",
    "funding": "Thu sự\n nghiệp",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSPK019",
    "name": "Máy siêu âm",
    "deptId": 1,
    "year": 2019,
    "requestedBy": "Ds. Tính,",
    "issueDescription": "Thường xuyên không\n khởi động được máy",
    "status": "COMPLETED",
    "cost": 44500000.0,
    "vendor": "Công ty TNHH \nVăn Thanh",
    "remedy": "Sửa chữa bo mạch CPU\nBảo hành: 03 tháng.",
    "parts": "Không",
    "decision": "Quyết định số \n349/QĐ-TTKSBT \nngày 10/6/2026",
    "members": "Ds. Tính, \nDs. Lộc,  \nBs. Nam\nCn. Huệ",
    "funding": "Quỹ \nPTHĐSN",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSPK369",
    "name": "Máy đo thính lực",
    "deptId": 1,
    "year": 2024,
    "requestedBy": "Ds. Tính,",
    "issueDescription": "Không phát được \ntín hiệu đo thính lực",
    "status": "COMPLETED",
    "cost": 5500000.0,
    "vendor": "Công ty TNHH Thiết bị VTYT DHA",
    "remedy": "Sửa chữa nút bẩm phản ứng bệnh nhân",
    "parts": "Không",
    "decision": "",
    "members": "Ds. Tính, \nDs. Lộc,  \nBs. Nam\nCn. Huệ",
    "funding": "Thu sự\n nghiệp",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSXN133",
    "name": "Máy sắc ký lỏng khối phổ LC/MS-MS (model: 8040, hãng: Shimadzu - Nhật Bản)",
    "deptId": 2,
    "year": 2019,
    "requestedBy": "Ds. Tính,",
    "issueDescription": "Chân không của máy \nkhông đạt, báo lỗi IG",
    "status": "COMPLETED",
    "cost": 13176000.0,
    "vendor": "Công ty CP TB-VT \nKHKT và Du lịch Trung Sơn T.S.S.E",
    "remedy": "Kiểm tra toàn bộ thiết bị; Thay thế đồng hồ đo IG",
    "parts": "Đồng hồ đo \nIG",
    "decision": "Quyết định số \n176/QĐ-TTKSBT \nngày 24/9/2025",
    "members": "Ds. Tính, \nDs. Lộc, \nCn. Hải, \nCn. N.Châu",
    "funding": "Thu sự\n nghiệp",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSXN073",
    "name": "Máy quang phổ U-2900;",
    "deptId": 2,
    "year": 2020,
    "requestedBy": "Ds. Tính,",
    "issueDescription": "- Độ hấp thụ tại các \nbước sóng không chính xác, ảnh hưởng đến kết quả XN;\n- Thiết bị có chảy nước, hiệu suất thu hồi thấp;\n- Công tấc nguồn chập chờn.",
    "status": "COMPLETED",
    "cost": 21276000.0,
    "vendor": "Công ty TNHH\n KHCN VIETCALIB",
    "remedy": "- Kiểm tra toàn bộ thiết bị; Thay thế bộ lọc Máy U-2900;\n- Kiểm tra toàn bộ thiết bị; Thay thế bình 1 lít cho bộ hấp thu khí thải Bộ phá mẫu đạm (SMS);\n- Sửa chữa lỗi và thay thế công tất nguồn của Lò nung Nebertherm L3C6.",
    "parts": "-  Thay thế bộ lọc Máy U-2900;\n- Thay thế bình 1 lít cho bộ hấp thu khí thải Bộ phá mẫu đạm (SMS);\n- Thay thế công tất nguồn của Lò nung Nebertherm L3C6.",
    "decision": "Quyết định số \n254/QĐ-TTKSBT \nngày 24/12/2025",
    "members": "Ds. Tính, \nDs. Lộc, \nCn. Hải",
    "funding": "Thu sự\n nghiệp",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSXN412",
    "name": "Hệ thống khối phổ Plasma ghép cặp cảm ứng",
    "deptId": 2,
    "year": 2021,
    "requestedBy": "Ds. Tính,",
    "issueDescription": "Lỗi chân không",
    "status": "COMPLETED",
    "cost": 21600000.0,
    "vendor": "Công ty TNHH \nAnalytik Jena Việt Nam",
    "remedy": "Kiểm tra sửa chữa hệ thống bị \nlỗi chân không",
    "parts": "Không",
    "decision": "Quyết định số \n155/QĐ-TTKSBT \nngày 12/3/2026",
    "members": "Ds. Tính,\nDs. Lộc, \nCn. Hải, \nCn. Bình",
    "funding": "Thu sự\n nghiệp",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSXN-UPS-ICP",
    "name": "Bộ lưu điện Santak C10K",
    "deptId": 2,
    "year": 2021,
    "requestedBy": "Ds. Tính,",
    "issueDescription": "Hỏng bình ắc quy Bộ\n lưu điện Santak C10K",
    "status": "COMPLETED",
    "cost": 9828000.0,
    "vendor": "Công ty TNHH TM Nguyên Hà",
    "remedy": "Kiểm tra và thay thế ắc quy\n Bộ lưu điện Santak C10K",
    "parts": "Ắc quy",
    "decision": "",
    "members": "Ds. Tính,\nDs. Lộc, \nCn. Hải, \nCn. Bình",
    "funding": "Thu sự\n nghiệp",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSXN255",
    "name": "Máy phân tích huyết học tự động 26 thông số 5 thành phần bạch cầu (Sysmex XS1000i)",
    "deptId": 2,
    "year": 2016,
    "requestedBy": "Ds. Tính,",
    "issueDescription": "Khởi động máy liên tục\nbáo lỗi, không thực hiện được xét nghiệm mẫu",
    "status": "COMPLETED",
    "cost": 7560000.0,
    "vendor": "Công ty Hoàng Anh",
    "remedy": "Kiểm tra sửa chữa và thay bơm",
    "parts": "Thay bơm",
    "decision": "",
    "members": "Ds. Tính,\nDs. Lộc, \nCn. Duy, \nCn. Nghĩa",
    "funding": "Thu sự\n nghiệp",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSXN082",
    "name": "Sửa chữa Thiết bị phân tích thủy",
    "deptId": 2,
    "year": 2018,
    "requestedBy": "Ds. Tính,",
    "issueDescription": "Hệ số hấp thu và hiệu suất thu hồi thấp",
    "status": "COMPLETED",
    "cost": 9828000.0,
    "vendor": "Công ty TNHH \nTM và DV TB Hân Hảo",
    "remedy": "Kiểm tra sửa chữa",
    "parts": "Không",
    "decision": "",
    "members": "Ds. Tính,\nDs. Lộc, \nCn. Hà",
    "funding": "Thu sự\n nghiệp",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSXN032",
    "name": "Sửa chữa Hệ thống phá mẫu vi sóng",
    "deptId": 2,
    "year": 2018,
    "requestedBy": "Cán bộ phụ trách",
    "issueDescription": "Hư hỏng thiết bị cần sửa chữa",
    "status": "IN_PROGRESS",
    "cost": 0.0,
    "vendor": "Đơn vị kỹ thuật chuyên trách",
    "remedy": "",
    "parts": "",
    "decision": "",
    "members": "",
    "funding": "",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSXN197",
    "name": "Máy ly tâm lạnh ống eppendorf tách mẫu DNA để bàn Model: 5424R",
    "deptId": 2,
    "year": 2015,
    "requestedBy": "Cán bộ phụ trách",
    "issueDescription": "Chức năng làm lạnh không hoạt động",
    "status": "IN_PROGRESS",
    "cost": 0.0,
    "vendor": "Công ty TNHH Việt Kim Hùng",
    "remedy": "Kiểm tra lốc lạnh, tụ khởi động.\nSửa chữa bộ phận xử lý nhiệt độ của máy.\nNạp gas.\nVận hành.",
    "parts": "Không",
    "decision": "",
    "members": "",
    "funding": "",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSXN023",
    "name": "Máy chưng cất nước 2 lần dạng tủ",
    "deptId": 2,
    "year": 2004,
    "requestedBy": "Cán bộ phụ trách",
    "issueDescription": "Hư hỏng thiết bị cần sửa chữa",
    "status": "IN_PROGRESS",
    "cost": 0.0,
    "vendor": "Đơn vị kỹ thuật chuyên trách",
    "remedy": "",
    "parts": "",
    "decision": "",
    "members": "",
    "funding": "",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSXN019",
    "name": "Hệ thống lọc nước siêu sạch",
    "deptId": 2,
    "year": 2004,
    "requestedBy": "Cán bộ phụ trách",
    "issueDescription": "Hư hỏng thiết bị cần sửa chữa",
    "status": "IN_PROGRESS",
    "cost": 0.0,
    "vendor": "Đơn vị kỹ thuật chuyên trách",
    "remedy": "",
    "parts": "",
    "decision": "",
    "members": "",
    "funding": "",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSXN222",
    "name": "Máy nước cất 2 lần A4000D;",
    "deptId": 2,
    "year": 2020,
    "requestedBy": "Ds. Tính,",
    "issueDescription": "- Kiểm tra nguyên nhân lỗi và sửa chữa.",
    "status": "COMPLETED",
    "cost": 9720000.0,
    "vendor": "Công ty TNHH\n KHCN VIETCALIB",
    "remedy": "- Kiểm tra nguyên nhân lỗi.\n- Kiểm tra nguyên nhân lỗi.\nSửa bo mạch chính (mainboard).\nChỉnh lại trục quay của cách tử.\nHiệu chỉnh lại đường nền, bước sóng. Kiểm tra lại thiết bị sau khi sửa chữa;\n- Kiểm tra nguyên nhân lỗi. Chỉnh lại nút bịt đầu ống mẫu.\nChỉnh lại vị trí gá giữ ống mẫu.\nNối tạm phần ống thủy tinh bị vỡ bằng ống silicon để sử dụng.\nVận hành thử sau khi sửa chữa.",
    "parts": "Không",
    "decision": "",
    "members": "Ds. Tính, \nDs. Lộc, \nCn. Hải",
    "funding": "Thu sự\n nghiệp",
    "statusAfter": "Tốt"
  },
  {
    "code": "TS-XN-954",
    "name": "Máy quang phổ U-2900 (lần 1)",
    "deptId": 2,
    "year": 2011,
    "requestedBy": "Ds. Tính,",
    "issueDescription": "Máy bị nhiễu vùng bước sóng, hư kính lọc.",
    "status": "COMPLETED",
    "cost": 18144000.0,
    "vendor": "Công ty TNHH\n KHCN VIETCALIB",
    "remedy": "Kiểm tra, sửa chữa và thay thế bộ lọc Máy U-2900",
    "parts": "Thay thế bộ lọc Máy U-2900",
    "decision": "Quyết định số \n136/QĐ-TTKSBT \nngày 11/3/2026",
    "members": "Ds. Tính, \nDs. Lộc, \nCn. Hải",
    "funding": "Thu sự\n nghiệp",
    "statusAfter": "Tốt"
  },
  {
    "code": "TS-XN-972",
    "name": "Máy quang phổ hấp thụ nguyên tử AAS",
    "deptId": 2,
    "year": 2018,
    "requestedBy": "Ds. Tính,",
    "issueDescription": "Hệ thống bị sự cố, chạy không ổn định. Khi phân tích các kim loại trên hệ thống graphite lên nhiệt độ cao hệ thống không chạy được",
    "status": "COMPLETED",
    "cost": 49140000.0,
    "vendor": "Công ty TNHH \nTM và DV TB Hân Hảo",
    "remedy": "Dịch vụ sửa chữa, bảo trì, bảo dưỡng Máy quang phổ hấp thụ nguyên tử AAS\nModel: PinAAcle900H\nHãng sản xuất: Perkin Elmer\nNội dung sửa chữa, bảo trì, bảo dưỡng:\nSửa chữa mạch điều khiển nguồn của KT Lò.\nSửa chữa mạch điều khiển gia nhiệt của KT Lò.\nKiểm tra tổng quát toàn bộ hệ thống.\nBảo trì và bảo dưỡng toàn bộ hệ thống.\nHướng dẫn sử dụng kỹ thuật hóa hơi nguội (FIAS).\nBảo hành: 06 tháng.",
    "parts": "Không",
    "decision": "Quyết định số \n137/QĐ-TTKSBT \nngày 11/3/2026",
    "members": "Ds. Tính, \nDs. Lộc, \nCn. Hải",
    "funding": "Thu sự\n nghiệp",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSXN-BUCHI-CS2",
    "name": "Máy chưng cất đạm Buchi",
    "deptId": 2,
    "year": 2017,
    "requestedBy": "Ds. Tính,",
    "issueDescription": "Thiết bị có chảy nước,\n không cất mẫu được",
    "status": "COMPLETED",
    "cost": 13500000.0,
    "vendor": "Công ty TNHH\n KHCN VIETCALIB",
    "remedy": "- Dịch vụ hàn Bình bảo vệ mẫu\n (Splash protection vessel) bị nứt vỡ;\n- Thay thế Vòng đệm (Seal with ring CSM)\nCode: 11073674;\nHãng: Buchi.",
    "parts": "Vòng đệm \n(Seal with ring CSM)",
    "decision": "Quyết định số \n214/QĐ-TTKSBT \nngày 14/4/2026",
    "members": "Ds. Tính, \nDs. Lộc, \nCn. Hải",
    "funding": "Thu sự\n nghiệp",
    "statusAfter": "Tốt"
  },
  {
    "code": "TS-XN-954-2",
    "name": "Máy quang phổ U-2900 (lần 2)",
    "deptId": 2,
    "year": 2011,
    "requestedBy": "Ds. Tính,",
    "issueDescription": "Hỏng bo mạch",
    "status": "IN_PROGRESS",
    "cost": 49680000.0,
    "vendor": "Công ty TNHH\nTMDV KT VIETNGUYEN",
    "remedy": "Kiểm tra, sửa chữa và thay thế bo mạch",
    "parts": "Thay thế bo mạch Máy U-2900",
    "decision": "Quyết định số \n/QĐ-TTKSBT \nngày 1..../3/2026",
    "members": "Ds. Tính, \nDs. Tân, \nCn. Hải",
    "funding": "Quỹ \nPTHĐSN",
    "statusAfter": "Tốt"
  },
  {
    "code": "TS-XN-934",
    "name": "Tủ ấm 37 độ",
    "deptId": 2,
    "year": 1997,
    "requestedBy": "Cán bộ phụ trách",
    "issueDescription": "Hư hỏng thiết bị cần sửa chữa",
    "status": "IN_PROGRESS",
    "cost": 0.0,
    "vendor": "Đơn vị kỹ thuật chuyên trách",
    "remedy": "",
    "parts": "",
    "decision": "",
    "members": "",
    "funding": "",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSXN-NRB-CS2",
    "name": "Tủ ấm lạnh 130L",
    "deptId": 2,
    "year": 2019,
    "requestedBy": "Cán bộ phụ trách",
    "issueDescription": "Hư hỏng thiết bị cần sửa chữa",
    "status": "IN_PROGRESS",
    "cost": 0.0,
    "vendor": "Đơn vị kỹ thuật chuyên trách",
    "remedy": "",
    "parts": "",
    "decision": "",
    "members": "",
    "funding": "",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSKD059",
    "name": "Hệ thống lọc nước RO250l/h",
    "deptId": 1,
    "year": 2023,
    "requestedBy": "Ds. Tính, Ds. Lộc",
    "issueDescription": "Nắp màng RO bị sự cố, nước tràn ra nền nhà",
    "status": "COMPLETED",
    "cost": 3847500.0,
    "vendor": "Công ty TNHH XL nước Gia Hưng Phát",
    "remedy": "Sửa chữa, thay thế linh kiện (bộ vỏ màng RO 4040)",
    "parts": "Bộ vỏ màng\n RO 4040",
    "decision": "",
    "members": "Ds. Tính, Ds. Lộc",
    "funding": "Thu sự\n nghiệp",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSKD017",
    "name": "Tủ lạnh Domectic TCW 4000 AC (Luxembourg)",
    "deptId": 11,
    "year": 2020,
    "requestedBy": "Ds. Tính, Ds. Lộc, Ds. Ngà",
    "issueDescription": "Hỏng ko sử dụng được",
    "status": "COMPLETED",
    "cost": 1944000.0,
    "vendor": "Cơ sở Điện lạnh Tuấn Vĩnh",
    "remedy": "Thay thế linh kiện (tiếp nhận từ Viện Pasteur Nha Trang cấp)",
    "parts": "Bộ phụ tùng đầy đủ Tủ TCW4000AC",
    "decision": "",
    "members": "Ds. Tính, Ds. Lộc, Ds. Ngà",
    "funding": "Ngân sách NN",
    "statusAfter": "Tốt"
  },
  {
    "code": "TSPK011",
    "name": "Tủ ALASKA SL-8C (tủ mát) VN",
    "deptId": 13,
    "year": 2019,
    "requestedBy": "Ds. Tính, Ds. Lộc, Ths. Ánh, Cn. Hà",
    "issueDescription": "Hỏng, nhiệt độ không \nổn định",
    "status": "COMPLETED",
    "cost": 8100000.0,
    "vendor": "Cơ sở Điện lạnh Tuấn Vĩnh",
    "remedy": "Sửa chữa không chạy block, xử lý máng nước và hệ thống ga sưởi, thay thế bộ điều khiển nhiệt độ",
    "parts": "Bộ điều khiển nhiệt độ",
    "decision": "",
    "members": "Ds. Tính, Ds. Lộc, Ths. Ánh, Cn. Hà",
    "funding": "Thu sự\n nghiệp",
    "statusAfter": "Tốt"
  }
];

export async function syncTbytRecords(prisma: PrismaClient) {
  console.log('[TBYT Sync] Starting resilient cross-database TBYT synchronization...');
  const isPg = (process.env.DATABASE_URL || '').toLowerCase().includes('postgres');

  // 1. Safe creation of PlannedMaintenance table
  try {
    if (isPg) {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PlannedMaintenance" (
          "id" SERIAL PRIMARY KEY,
          "assetId" INTEGER NOT NULL REFERENCES "Asset"("id") ON DELETE CASCADE,
          "maintenanceDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "nextMaintenanceDate" TIMESTAMP(3),
          "cycleMonths" INTEGER DEFAULT 6,
          "performedBy" TEXT,
          "vendor" TEXT,
          "planContent" TEXT,
          "result" TEXT NOT NULL DEFAULT 'PASS',
          "cost" DOUBLE PRECISION DEFAULT 0,
          "decisionNumber" TEXT,
          "acceptanceMembers" TEXT,
          "fundingSource" TEXT,
          "deviceStatusAfter" TEXT DEFAULT 'Hoạt động tốt',
          "note" TEXT,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "PlannedMaintenance_assetId_idx" ON "PlannedMaintenance"("assetId");
      `).catch(() => {});
    } else {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "PlannedMaintenance" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "assetId" INTEGER NOT NULL,
          "maintenanceDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "nextMaintenanceDate" DATETIME,
          "cycleMonths" INTEGER DEFAULT 6,
          "performedBy" TEXT,
          "vendor" TEXT,
          "planContent" TEXT,
          "result" TEXT NOT NULL DEFAULT 'PASS',
          "cost" REAL DEFAULT 0,
          "decisionNumber" TEXT,
          "acceptanceMembers" TEXT,
          "fundingSource" TEXT,
          "deviceStatusAfter" TEXT DEFAULT 'Tốt',
          "note" TEXT,
          "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "PlannedMaintenance_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
      `);
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "PlannedMaintenance_assetId_idx" ON "PlannedMaintenance"("assetId");
      `).catch(() => {});
    }
    console.log(`[TBYT Sync] PlannedMaintenance table verified for ${isPg ? 'PostgreSQL' : 'SQLite'}`);
  } catch (tblErr: any) {
    console.warn('[TBYT Sync] Table check notice:', tblErr.message);
  }

  // 2. Ensure all TBYT assets exist and have proper code, name, category, and managingUnit
  const allItems = [
    ...BT_DATA.map(b => ({ code: b.code, name: b.name, deptId: b.deptId, year: b.year })),
    ...SC_DATA.map(s => ({ code: s.code, name: s.name, deptId: s.deptId, year: s.year }))
  ];

  const assetMap = new Map<string, any>();

  for (const item of allItems) {
    if (assetMap.has(item.code)) continue;

    // First try finding by assetCode
    let asset = await prisma.asset.findFirst({
      where: { assetCode: item.code }
    });

    // If not found, try finding by name == item.code (for previously inverted seed records)
    if (!asset) {
      asset = await prisma.asset.findFirst({
        where: { name: item.code }
      });
      if (asset) {
        asset = await prisma.asset.update({
          where: { id: asset.id },
          data: {
            assetCode: item.code,
            name: item.name,
            categoryId: 1,
            departmentId: item.deptId,
            managingUnit: 'DUOC'
          }
        });
      }
    }

    // If still not found, create new asset
    if (!asset) {
      asset = await prisma.asset.create({
        data: {
          assetCode: item.code,
          name: item.name,
          categoryId: 1,
          departmentId: item.deptId,
          location: item.deptId === 13 ? 'Cơ sở 2' : 'Cơ sở 1',
          locationDetail: 'Khoa Dược / Thiết bị y tế',
          yearInUse: item.year,
          originalPrice: 50000000,
          currentValue: 25000000,
          depreciationRate: 10,
          status: 'DANG_SU_DUNG',
          managingUnit: 'DUOC',
          bookQuantity: 1,
          actualQuantity: 1,
          quantityDifference: 0,
          source: 'Ngân sách nhà nước',
          fundingSource: 'Thu sự nghiệp',
          qrCode: `QR-TBYT-${item.code}`
        }
      });
    } else {
      // Make sure categoryId = 1 and managingUnit = DUOC
      if (asset.categoryId !== 1 || asset.managingUnit !== 'DUOC' || asset.departmentId !== item.deptId) {
        asset = await prisma.asset.update({
          where: { id: asset.id },
          data: {
            categoryId: 1,
            managingUnit: 'DUOC',
            departmentId: item.deptId
          }
        });
      }
    }

    assetMap.set(item.code, asset);
  }

  console.log(`[TBYT Sync] Successfully synchronized ${assetMap.size} distinct TBYT asset master records.`);

  // 3. Clean up miscategorized records in MaintenanceRequest
  // Remove any items that have "Bảo trì bảo dưỡng" in issueDescription or TSXN267/TSXN324
  const asset267 = assetMap.get('TSXN267');
  const asset324 = assetMap.get('TSXN324');
  const idsToRemove: number[] = [];
  if (asset267) idsToRemove.push(asset267.id);
  if (asset324) idsToRemove.push(asset324.id);

  if (idsToRemove.length > 0) {
    await prisma.maintenanceRequest.deleteMany({
      where: {
        assetId: { in: idsToRemove }
      }
    }).catch(() => {});
  }

  await prisma.maintenanceRequest.deleteMany({
    where: {
      issueDescription: { contains: 'Bảo trì bảo dưỡng' }
    }
  }).catch(() => {});

  // 4. Synchronize the 24 Repair (MaintenanceRequest) items
  const validScAssetIds = new Set<number>();
  for (const s of SC_DATA) {
    const asset = assetMap.get(s.code);
    if (!asset) continue;
    validScAssetIds.add(asset.id);

    const existingReq = await prisma.maintenanceRequest.findFirst({
      where: {
        assetId: asset.id,
        managingUnit: 'DUOC'
      }
    });

    const reqData = {
      assetId: asset.id,
      departmentId: s.deptId,
      managingUnit: 'DUOC',
      requestedBy: s.requestedBy,
      contactPhone: '0236.3821469',
      locationDetail: asset.locationDetail || 'Khoa chuyên môn',
      issueDescription: s.issueDescription,
      priority: 'HIGH',
      status: s.status,
      repairCost: s.cost,
      repairVendor: s.vendor,
      repairNote: s.remedy,
      technicianName: s.members?.split(',')[0]?.trim() || 'Kỹ sư TBYT',
      maintenanceType: 'SUA_CHUA',
      servicePackage: s.parts,
      replacementParts: s.parts && s.parts.toLowerCase() !== 'không' ? s.parts : null,
      acceptanceMembers: s.members,
      fundingSource: s.funding,
      decisionNumber: s.decision,
      deviceStatusAfter: s.statusAfter,
      requestDate: new Date('2026-01-15'),
      completedDate: s.status === 'COMPLETED' ? new Date('2026-06-30') : null
    };

    if (existingReq) {
      await prisma.maintenanceRequest.update({
        where: { id: existingReq.id },
        data: reqData
      });
    } else {
      await prisma.maintenanceRequest.create({
        data: reqData
      });
    }
  }

  // Remove any obsolete TBYT repair requests not in the 24 official items
  const allDuocReqs = await prisma.maintenanceRequest.findMany({
    where: { managingUnit: 'DUOC' },
    select: { id: true, assetId: true }
  });
  for (const req of allDuocReqs) {
    if (!validScAssetIds.has(req.assetId)) {
      await prisma.maintenanceRequest.delete({ where: { id: req.id } }).catch(() => {});
    }
  }

  // 5. Synchronize the 6 Planned Maintenance items
  const validBtAssetIds = new Set<number>();
  for (const b of BT_DATA) {
    const asset = assetMap.get(b.code);
    if (!asset) continue;
    validBtAssetIds.add(asset.id);

    const maintDate = new Date(b.maintDate);
    const nextDate = new Date(b.maintDate);
    nextDate.setMonth(nextDate.getMonth() + 6);

    const existingPm = await prisma.plannedMaintenance.findFirst({
      where: { assetId: asset.id }
    });

    const pmData = {
      assetId: asset.id,
      maintenanceDate: maintDate,
      nextMaintenanceDate: nextDate,
      cycleMonths: 6,
      performedBy: b.acceptanceMembers?.split(',')[0]?.trim() || 'Tổ Kỹ thuật',
      vendor: b.vendor,
      planContent: b.planContent,
      result: b.result,
      cost: b.cost,
      decisionNumber: b.decisionNumber,
      acceptanceMembers: b.acceptanceMembers,
      fundingSource: b.fundingSource,
      deviceStatusAfter: b.deviceStatusAfter,
      note: b.note
    };

    if (existingPm) {
      await prisma.plannedMaintenance.update({
        where: { id: existingPm.id },
        data: pmData
      });
    } else {
      await prisma.plannedMaintenance.create({
        data: pmData
      });
    }
  }

  // Clean any extraneous planned maintenance records not in the 6 official codes
  const allPm = await prisma.plannedMaintenance.findMany({ select: { id: true, assetId: true } });
  for (const pm of allPm) {
    if (!validBtAssetIds.has(pm.assetId)) {
      await prisma.plannedMaintenance.delete({ where: { id: pm.id } }).catch(() => {});
    }
  }

  const finalPmCount = await prisma.plannedMaintenance.count().catch(() => 0);
  const finalScCount = await prisma.maintenanceRequest.count({ where: { managingUnit: 'DUOC' } }).catch(() => 0);
  console.log(`[TBYT Sync] Finished! PlannedMaintenance: ${finalPmCount} records, TBYT Repair: ${finalScCount} records.`);
}
