import sqlite3
import time
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = sqlite3.connect(r'f:\QLTS\server\prisma\dev.db')
cursor = conn.cursor()

# Create CommitteeMember table
cursor.execute("""
CREATE TABLE IF NOT EXISTS InventoryCommitteeMember (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    position TEXT NOT NULL,
    role TEXT NOT NULL,
    departmentId INTEGER,
    scope TEXT DEFAULT 'ALL', -- 'ALL', 'TCHC', 'DUOC', 'CNTT'
    isActive INTEGER DEFAULT 1,
    displayOrder INTEGER DEFAULT 0,
    createdAt INTEGER,
    updatedAt INTEGER
)
""")

now_ms = int(time.time() * 1000)

# Check if already seeded
cursor.execute("SELECT COUNT(*) FROM InventoryCommitteeMember")
if cursor.fetchone()[0] == 0:
    members = [
        ('Ông. Nguyễn Đại Vĩnh', 'Giám đốc', 'CHUTICH', None, 'ALL', 1),
        ('Ông. Hồ Phú Quảng', 'Trưởng phòng TC - KT', 'UYVIEN', 14, 'ALL', 2),
        ('Bà. Mai Thị Tính', 'Phụ trách Khoa Dược - VTYT', 'TOTRUONG_TBYT', 11, 'DUOC', 3),
        ('Ông. Trần Văn Vũ', 'Trưởng phòng KHNV', 'TOTRUONG_CNTT', 7, 'CNTT', 4),
        ('Ông. Trần Liên', 'Trưởng phòng TC - HC', 'TOTRUONG_TCHC', 15, 'TCHC', 5),
        ('Ông. Phạm Phú Ân', 'Cán bộ Khoa/Phòng', 'THANHVIEN', 15, 'ALL', 6),
        ('Ông. Lê Xuân Lộc', 'Cán bộ Khoa/Phòng', 'THANHVIEN', 15, 'ALL', 7),
        ('Ông. Huỳnh Bá Thành', 'Cán bộ Khoa/Phòng', 'THANHVIEN', 15, 'ALL', 8),
        ('Bà. Lê Thị Thanh Thủy', 'Cán bộ Khoa/Phòng', 'THANHVIEN', 15, 'ALL', 9),
        ('Ông. Trương Tấn Nam', 'Trưởng Phòng khám đa khoa', 'DAIDIEN_KHOA', 1, 'PKDK', 10),
        ('Ông. Nguyễn Trường Duy', 'Phó Trưởng khoa XN-CĐHA-TDCN', 'DAIDIEN_KHOA', 2, 'XN', 11),
        ('Ông. Cao Minh Thông', 'Trưởng khoa HIV/AIDS và QLĐTNC', 'DAIDIEN_KHOA', 12, 'HIV', 12),
        ('Ông. Dương Ấm Mậu', 'Trưởng khoa Bệnh nghề nghiệp', 'DAIDIEN_KHOA', 3, 'BNN', 13),
        ('Ông. Đặng Quang Ánh', 'Phó Trưởng khoa PCBTN', 'DAIDIEN_KHOA', 13, 'PCBTN', 14),
        ('Bà. Trần Thị Dạ Thảo', 'Trưởng khoa Sức khỏe sinh sản', 'DAIDIEN_KHOA', 6, 'SKSS', 15),
        ('Ông. Phan Văn Bửu', 'Trưởng khoa KDYTQT', 'DAIDIEN_KHOA', 16, 'KDYTQT', 16),
        ('Ông. Nguyễn Như Tiến', 'Phó Trưởng khoa KST - CT', 'DAIDIEN_KHOA', 9, 'KSTCT', 17),
        ('Bà. Bùi Thị Long Cảnh', 'Trưởng khoa PCBKLN', 'DAIDIEN_KHOA', 10, 'PCBKLN', 18),
    ]

    for m in members:
        cursor.execute("""
            INSERT INTO InventoryCommitteeMember (fullName, position, role, departmentId, scope, isActive, displayOrder, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
        """, (m[0], m[1], m[2], m[3], m[4], m[5], now_ms, now_ms))

    print(f"Seeded {len(members)} committee members")

conn.commit()

cursor.execute("SELECT id, fullName, position, role, scope FROM InventoryCommitteeMember ORDER BY displayOrder")
print("\nDanh sách Thành viên Hội đồng & Tổ kiểm kê:")
for r in cursor.fetchall():
    print(f"  {r[0]}: {r[1]} - {r[2]} ({r[3]}, Scope: {r[4]})")

conn.close()
