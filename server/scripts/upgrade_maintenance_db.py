import sqlite3
import datetime
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DB_PATH = r'f:\QLTS\server\prisma\dev.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

now_iso = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

print("1. Checking and upgrading MaintenanceRequest columns...")
cursor.execute("PRAGMA table_info(MaintenanceRequest)")
existing_cols = [c[1] for c in cursor.fetchall()]

new_cols = [
    ('managingUnit', 'TEXT DEFAULT "CNTT"'),
    ('technicianName', 'TEXT'),
    ('locationDetail', 'TEXT'),
    ('contactPhone', 'TEXT')
]

for col_name, col_type in new_cols:
    if col_name not in existing_cols:
        cursor.execute(f"ALTER TABLE MaintenanceRequest ADD COLUMN {col_name} {col_type}")
        print(f"  Added column: {col_name}")

conn.commit()

# Seed sample realistic maintenance requests if empty or few
cursor.execute("SELECT COUNT(*) FROM MaintenanceRequest")
count = cursor.fetchone()[0]

if count < 5:
    print("\n2. Seeding initial realistic maintenance records...")
    sample_requests = [
        (
            # Asset 1: PC Phòng Xét nghiệm
            2, 2, 'KS. Nguyễn Trường Duy', '0905123456',
            'Máy tính mở không lên nguồn, quạt CPU kêu to sau sự cố sụt áp điện lưới.',
            'HIGH', 'COMPLETED', 350000, 'Công ty TNHH Tin Học CDC',
            'Đã thay thế bộ nguồn Huntkey 450W, vệ sinh quạt tản nhiệt CPU, máy hoạt động bình thường.',
            'KS. Phan Thanh Hoàn', 'CNTT', 'Phòng Xét nghiệm Sinh hóa (Tầng 2)',
            '2026-01-10T08:30:00.000Z', '2026-01-11T16:00:00.000Z'
        ),
        (
            # Asset 2: Máy in Phòng Khám Đa Khoa
            1, 1, 'BS. Trương Tấn Nam', '0913987654',
            'Máy in bị kẹt giấy liên tục, bản in ra bị sọc đen mép trái tờ giấy khám bệnh.',
            'MEDIUM', 'COMPLETED', 220000, 'Dịch vụ Thiết bị Văn phòng',
            'Đã thay trục cao su cuốn giấy (Pick-up roller) và gạt mực hộp mực 85A.',
            'KS. Huỳnh Bá Thành', 'CNTT', 'Phòng Tiếp nhận Khám bệnh (Tầng 1)',
            '2026-01-18T09:15:00.000Z', '2026-01-18T15:30:00.000Z'
        ),
        (
            # Asset 3: Kính hiển vi quang học Khoa Xét nghiệm
            500, 2, 'DS. Nguyễn Văn Hùng', '0905555888',
            'Đèn chiếu sáng halogen của kính hiển vi chập chờn, núm chỉnh vi cấp bị kẹt cứng.',
            'HIGH', 'COMPLETED', 1200000, 'Hãng Olympus Việt Nam',
            'Thay bóng đèn halogen 6V/30W chính hãng và bảo dưỡng tra dầu mỡ bộ phận cơ học vi cấp.',
            'KS. Phạm Phú Ân', 'DUOC', 'Phòng Ký sinh trùng Xét nghiệm (Tầng 3)',
            '2026-02-05T10:00:00.000Z', '2026-02-08T14:00:00.000Z'
        ),
        (
            # Asset 4: Máy tính Khoa KHNV
            70, 7, 'ThS. Trần Văn Vũ', '0905111222',
            'Máy tính bị màn hình xanh Dump file khi xuất báo cáo phần mềm quản lý.',
            'MEDIUM', 'IN_PROGRESS', None, None,
            'Đã kiểm tra ổ cứng SSD còn tốt, đang tiến hành quét virus và cài lại hệ điều hành Windows 11.',
            'KS. Lê Xuân Lộc', 'CNTT', 'Phòng Kế hoạch Nghiệp vụ (Tầng 4)',
            '2026-02-20T14:30:00.000Z', None
        ),
        (
            # Asset 5: Quạt trần Phòng Tổ chức Hành chính
            1500, 15, 'Ông. Trần Liên', '0905333444',
            'Quạt trần phòng họp rung lắc mạnh, hộp số điều khiển bị hỏng nấc 3.',
            'LOW', 'PENDING', None, None,
            'Chờ thợ điện bảo trì kiểm tra thay hộp số và cân cánh.',
            None, 'TCHC', 'Phòng Họp TCHC (Tầng 1)',
            '2026-02-22T08:00:00.000Z', None
        )
    ]

    for req in sample_requests:
        # Find a valid assetId
        cursor.execute("SELECT id FROM Asset LIMIT 1 OFFSET ?", (req[0] % 100,))
        row = cursor.fetchone()
        asset_id = row[0] if row else 1

        cursor.execute("""
            INSERT INTO MaintenanceRequest (
                assetId, departmentId, requestedBy, contactPhone, issueDescription,
                priority, status, repairCost, repairVendor, repairNote,
                technicianName, managingUnit, locationDetail, requestDate, completedDate,
                createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            asset_id, req[1], req[2], req[3], req[4],
            req[5], req[6], req[7], req[8], req[9],
            req[10], req[11], req[12], req[13], req[14],
            now_iso, now_iso
        ))

    conn.commit()
    print("  Seeded 5 realistic maintenance request records.")

conn.close()
print("Done! MaintenanceRequest upgraded successfully.")
