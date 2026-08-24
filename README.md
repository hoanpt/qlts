# Hệ Thống Quản Lý Trang Thiết Bị & Tài Sản - CDC Đà Nẵng

Hệ thống quản lý trang thiết bị y tế, thiết bị CNTT, cơ sở vật chất và tài sản hành chính được thiết kế riêng cho Trung tâm Kiểm soát bệnh tật (CDC) TP Đà Nẵng (Cơ sở 1: 118 Lê Đình Lý, Cơ sở 2: Bàn Thạch).

---

## 🌟 Tính Năng Chính

1. **Dashboard Trực Quan**:
   - Theo dõi số lượng thiết bị theo 3 khối quản lý chuyên trách: **Khoa Dược (TBYT)**, **Tổ CNTT**, **Phòng TCHC (Hành chính & Hạ tầng tòa nhà 8 tầng)**.
   - Thống kê tỷ lệ phân bổ theo 16 Khoa/Phòng, trạng thái hoạt động (*Đang sử dụng, Bảo trì, Hỏng, Chờ thanh lý, Đã thanh lý*).
   - Biểu đồ biến động tài sản, cảnh báo hiệu chuẩn TBYT đến hạn.

2. **Quản Lý Danh Mục Tài Sản**:
   - Quản lý đầy đủ mã tài sản chuẩn hóa theo hồ sơ kiểm kê thực tế (`TSPK...`, `TSXN...`, `MH/...`, `CPU/...`, `LAP/...`, `IN/...`, `BXN...`, `TN-T1...`).
   - Bộ lọc đa chiều: Lọc theo 3 Khối quản lý, Tầng tòa nhà (Tầng Hầm, T1 -> T7), Khoa/Phòng sử dụng, Cơ sở 1 & 2.
   - Tự động tạo mã QR Code động cho từng tài sản để dán lên thiết bị và quét bằng camera điện thoại.

3. **Phân Hệ Kiểm Kê (Mẫu số C53-HD chuẩn TT 107/2017/TT-BTC)**:
   - 5 chế độ biên bản kiểm kê độc lập: TBYT do Khoa Dược chủ trì, CNTT do Tổ CNTT chủ trì, Hành chính & CCDC do Phòng TCHC chủ trì, Hạ tầng tòa nhà theo tầng, và Kiểm kê theo từng Khoa/Phòng.
   - **Quản lý Hội đồng kiểm kê linh hoạt:** Tự động điền Chủ tịch hội đồng, Thư ký, Tổ trưởng chuyên trách, Thành viên tổ và Đại diện Khoa/Phòng vào tiêu đề & 4 vị trí chữ ký.
   - Cho phép chỉnh sửa số lượng thực tế trực tiếp trên bảng, tự động tính chênh lệch thừa/thiếu và lưu vào hệ thống.

4. **Quy Trình Quản Lý & Biên Bản Thanh Lý Tài Sản 4 Bước**:
   - **Bước 1:** Ban hành Thông báo / Kế hoạch đợt thanh lý.
   - **Bước 2:** Các Khoa/Phòng lập Báo cáo đề xuất gửi về đơn vị chuyên trách (Dược, CNTT, TCHC).
   - **Bước 3:** Khối chuyên trách kiểm tra tình trạng kỹ thuật & xuất **Biên bản kiểm tra kỹ thuật (A4)**.
   - **Bước 4:** Họp Hội đồng thanh lý, phê duyệt và xuất **Biên bản Hội đồng thanh lý tài sản (A4)**.

5. **Các Phân Hệ Bổ Trợ**:
   - Quản lý điều chuyển tài sản giữa các khoa phòng.
   - Quản lý báo hỏng / đề xuất sửa chữa từ các khoa phòng (ghi rõ người đề nghị).
   - Quản lý hiệu chuẩn định kỳ Trang thiết bị y tế (TBYT).
   - Tính toán khấu hao & hao mòn tài sản cố định.
   - Quản lý cơ cấu 16 Khoa/Phòng CDC Đà Nẵng.

---

## 🛠️ Công Nghệ Sử Dụng

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide React, Recharts, TanStack Query, Html5-QRCode.
- **Backend**: Node.js, Express, TypeScript, Prisma ORM, SQLite, ExcelJS, QRCode, JWT Authentication.
- **Deployment**: Docker, Docker Compose, tương thích 100% với **Coolify**, Railway, VPS Linux/Docker.

---

## 🚀 Hướng Dẫn Chạy Local

### 1. Cài đặt Backend:
```bash
cd server
npm install
npx prisma generate
npx ts-node prisma/seed.ts
npm run dev
```

### 2. Cài đặt Frontend:
```bash
cd client
npm install
npm run dev -- --host
```
Truy cập: `http://localhost:5173`

---

## 🐳 Triển Khai Trên Coolify

1. Kết nối kho lưu trữ GitHub `https://github.com/hoanpt/qlts` với **Coolify**.
2. Chọn loại ứng dụng: **Docker Compose** hoặc **Dockerfile**.
3. Cổng dịch vụ: `3001` (được cấu hình tự động phục vụ cả API và giao diện Web SPA).
4. Biến môi trường (Tùy chọn):
   - `PORT=3001`
   - `JWT_SECRET=qlts-cdc-danang-secret-key-2026`
   - `NODE_ENV=production`
5. Bấm **Deploy** trên Coolify để hoàn tất.
