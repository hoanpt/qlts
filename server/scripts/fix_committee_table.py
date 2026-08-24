import sqlite3
import datetime

conn = sqlite3.connect(r'f:\QLTS\server\prisma\dev.db')
cursor = conn.cursor()

cursor.execute("DROP TABLE IF EXISTS InventoryCommitteeMember")

cursor.execute("""
CREATE TABLE InventoryCommitteeMember (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fullName TEXT NOT NULL,
    position TEXT NOT NULL,
    role TEXT NOT NULL,
    departmentId INTEGER,
    scope TEXT DEFAULT 'ALL',
    isActive INTEGER DEFAULT 1,
    displayOrder INTEGER DEFAULT 0,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
)
""")

now_iso = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

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
    """, (m[0], m[1], m[2], m[3], m[4], m[5], now_iso, now_iso))

conn.commit()
conn.close()
print("InventoryCommitteeMember table recreated with valid DATETIME format!")
