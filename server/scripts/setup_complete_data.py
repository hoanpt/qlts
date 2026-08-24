import sqlite3
import datetime
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DB_PATH = r'f:\QLTS\server\prisma\dev.db'

def setup_database():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    now_iso = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

    # =========================================================================
    # 1. STANDARDIZE CATEGORIES (CNTT, DUOC, TCHC, TOANHA)
    # =========================================================================
    print("1. Standardizing Asset Categories...")
    cursor.execute("DELETE FROM AssetCategory")
    categories = [
        (1, 'DUOC', 'Trang thiết bị Y tế (Khoa Dược quản lý)', 'Máy xét nghiệm, siêu âm, X-quang, chẩn đoán hình ảnh, bảo quản vắc xin, tủ sấy, kính hiển vi...'),
        (2, 'CNTT', 'Thiết bị Công nghệ thông tin (Tổ CNTT quản lý)', 'Máy vi tính (PC), Laptop, Máy in, Máy Scan, Thiết bị mạng, Server, Màn hình...'),
        (3, 'TCHC', 'Thiết bị Hành chính & CCDC (Phòng TCHC quản lý)', 'Bàn làm việc, ghế xoay, tủ sắt, tủ gỗ, bàn họp, quạt, giường inox, xe đẩy...'),
        (4, 'TBVP_TOANHA', 'Cơ sở vật chất & Hạ tầng tòa nhà theo tầng (TCHC)', 'Công tắc điện, ổ cắm, ổ cắm điện thoại, đèn chiếu sáng, tủ điện, PCCC, máy bơm... theo tầng')
    ]
    for cat in categories:
        cursor.execute("INSERT INTO AssetCategory (id, code, name, description) VALUES (?, ?, ?, ?)", cat)
    conn.commit()

    # =========================================================================
    # 2. STANDARDIZE 16 DEPARTMENTS
    # =========================================================================
    print("\n2. Standardizing 16 Departments...")
    cursor.execute("DELETE FROM Department")
    depts = [
        (1, 'PKDK', 'Phòng Khám Đa Khoa', 'Cơ sở 1', '118 Lê Đình Lý, Thanh Khê, Đà Nẵng'),
        (2, 'XN', 'Khoa Xét Nghiệm - CĐHA - TDCN', 'Cơ sở 1', '118 Lê Đình Lý, Thanh Khê, Đà Nẵng'),
        (3, 'BNN', 'Khoa Bệnh Nghề Nghiệp', 'Cơ sở 1', '118 Lê Đình Lý, Thanh Khê, Đà Nẵng'),
        (4, 'DD', 'Khoa Dinh Dưỡng', 'Cơ sở 1', '118 Lê Đình Lý, Thanh Khê, Đà Nẵng'),
        (5, 'SKMT', 'Khoa Sức Khỏe Môi Trường - YTTH', 'Cơ sở 1', '118 Lê Đình Lý, Thanh Khê, Đà Nẵng'),
        (6, 'SKSS', 'Khoa Sức Khỏe Sinh Sản', 'Cơ sở 1', '118 Lê Đình Lý, Thanh Khê, Đà Nẵng'),
        (7, 'KHNV', 'Phòng Kế Hoạch Nghiệp Vụ', 'Cơ sở 1', '118 Lê Đình Lý, Thanh Khê, Đà Nẵng'),
        (8, 'TTGDSK', 'Khoa Truyền Thông Giáo Dục Sức Khỏe', 'Cơ sở 1', '118 Lê Đình Lý, Thanh Khê, Đà Nẵng'),
        (9, 'KSTCT', 'Khoa Ký Sinh Trùng - Côn Trùng', 'Cơ sở 1', '118 Lê Đình Lý, Thanh Khê, Đà Nẵng'),
        (10, 'PCBKLN', 'Khoa Phòng Chống Bệnh Không Lây Nhiễm', 'Cơ sở 1', '118 Lê Đình Lý, Thanh Khê, Đà Nẵng'),
        (11, 'DVTYT', 'Khoa Dược - Vật Tư Y Tế', 'Cơ sở 1', '118 Lê Đình Lý, Thanh Khê, Đà Nẵng'),
        (12, 'HIV', 'Khoa HIV/AIDS và QLĐTNC', 'Cơ sở 1', '118 Lê Đình Lý, Thanh Khê, Đà Nẵng'),
        (13, 'PCBTN', 'Khoa Phòng Chống Bệnh Truyền Nhiễm', 'Cơ sở 2', 'Bàn Thạch, Hòa Vang, Đà Nẵng'),
        (14, 'TCKT', 'Phòng Tài Chính - Kế Toán', 'Cơ sở 1', '118 Lê Đình Lý, Thanh Khê, Đà Nẵng'),
        (15, 'TCHC', 'Phòng Tổ Chức - Hành Chính', 'Cơ sở 1', '118 Lê Đình Lý, Thanh Khê, Đà Nẵng'),
        (16, 'KDYTQT', 'Khoa Kiểm Dịch Y Tế Quốc Tế', 'Cơ sở 1', '118 Lê Đình Lý, Thanh Khê, Đà Nẵng')
    ]
    for d in depts:
        cursor.execute("INSERT INTO Department (id, code, name, location, description, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
                       (d[0], d[1], d[2], d[3], d[4], now_iso, now_iso))
    conn.commit()

    # =========================================================================
    # 3. STANDARDIZE ASSETS CATEGORIZATION (CNTT, DUOC, TCHC)
    # =========================================================================
    print("\n3. Categorizing all Assets into matching categories...")
    # DUOC (TBYT) -> categoryId = 1
    cursor.execute("UPDATE Asset SET categoryId = 1 WHERE managingUnit = 'DUOC'")
    # CNTT -> categoryId = 2
    cursor.execute("UPDATE Asset SET categoryId = 2 WHERE managingUnit = 'CNTT'")
    # TCHC HC -> categoryId = 3
    cursor.execute("UPDATE Asset SET categoryId = 3 WHERE managingUnit = 'TCHC' AND (buildingAsset = 0 OR buildingAsset IS NULL)")
    # TCHC TOANHA -> categoryId = 4
    cursor.execute("UPDATE Asset SET categoryId = 4 WHERE managingUnit = 'TCHC' AND buildingAsset = 1")
    conn.commit()

    # =========================================================================
    # 4. SETUP 3 DISTINCT INVENTORY TEAMS + 16 DEPARTMENT REPRESENTATIVES
    # =========================================================================
    print("\n4. Setting up 3 distinct inventory teams & department reps...")
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

    committee = [
        # Chung toàn Hội Đồng
        ('Ông. Nguyễn Đại Vĩnh', 'Giám đốc', 'CHUTICH', None, 'ALL', 1),
        ('Ông. Hồ Phú Quảng', 'Trưởng phòng TC - KT', 'UYVIEN', 14, 'ALL', 2),

        # TỔ 1: Tổ Kiểm Kê Trang Thiết Bị Y Tế (Khoa Dược chủ trì)
        ('Bà. Mai Thị Tính', 'Phụ trách Khoa Dược - VTYT', 'TOTRUONG_TBYT', 11, 'DUOC', 10),
        ('Bà. Trần Thị Ngọc Diệp', 'Dược sĩ Khoa Dược - VTYT', 'THANHVIEN_DUOC', 11, 'DUOC', 11),
        ('Bà. Lê Thị Thanh Thủy', 'Dược sĩ Khoa Dược - VTYT', 'THANHVIEN_DUOC', 11, 'DUOC', 12),
        ('Ông. Phạm Phú Ân', 'Kỹ sư Thiết bị y tế', 'THANHVIEN_DUOC', 11, 'DUOC', 13),

        # TỔ 2: Tổ Kiểm Kê Thiết Bị CNTT (Tổ CNTT / Phòng KHNV chủ trì)
        ('Ông. Trần Văn Vũ', 'Trưởng phòng KHNV', 'TOTRUONG_CNTT', 7, 'CNTT', 20),
        ('Ông. Huỳnh Bá Thành', 'Kỹ sư CNTT', 'THANHVIEN_CNTT', 7, 'CNTT', 21),
        ('Ông. Lê Xuân Lộc', 'Kỹ sư CNTT', 'THANHVIEN_CNTT', 7, 'CNTT', 22),
        ('Ông. Nguyễn Văn Hùng', 'Chuyên viên CNTT', 'THANHVIEN_CNTT', 7, 'CNTT', 23),

        # TỔ 3: Tổ Kiểm Kê Thiết Bị Hành Chính & Hạ Tầng Tòa Nhà (Phòng TCHC chủ trì)
        ('Ông. Trần Liên', 'Trưởng phòng TC - HC', 'TOTRUONG_TCHC', 15, 'TCHC', 30),
        ('Ông. Phạm Phú Ân', 'Cán bộ phòng TCHC', 'THANHVIEN_TCHC', 15, 'TCHC', 31),
        ('Ông. Lê Xuân Lộc', 'Cán bộ phòng TCHC', 'THANHVIEN_TCHC', 15, 'TCHC', 32),
        ('Bà. Lê Thị Thanh Thủy', 'Cán bộ phòng TCHC', 'THANHVIEN_TCHC', 15, 'TCHC', 33),
        ('Ông. Huỳnh Bá Thành', 'Cán bộ phòng TCHC', 'THANHVIEN_TCHC', 15, 'TCHC', 34),

        # ĐẠI DIỆN 16 KHOA / PHÒNG
        ('Ông. Trương Tấn Nam', 'Trưởng Phòng khám đa khoa', 'DAIDIEN_KHOA', 1, 'PKDK', 40),
        ('Ông. Nguyễn Trường Duy', 'Phó Trưởng khoa XN-CĐHA-TDCN', 'DAIDIEN_KHOA', 2, 'XN', 41),
        ('Ông. Dương Ấm Mậu', 'Trưởng khoa Bệnh nghề nghiệp', 'DAIDIEN_KHOA', 3, 'BNN', 42),
        ('Bà. Nguyễn Thị Thu Trang', 'Phó Trưởng khoa Dinh dưỡng', 'DAIDIEN_KHOA', 4, 'DD', 43),
        ('Ông. Lê Văn Cường', 'Phó Trưởng khoa Sức khỏe môi trường - YTTH', 'DAIDIEN_KHOA', 5, 'SKMT', 44),
        ('Bà. Trần Thị Dạ Thảo', 'Trưởng khoa Sức khỏe sinh sản', 'DAIDIEN_KHOA', 6, 'SKSS', 45),
        ('Ông. Trần Văn Vũ', 'Trưởng phòng Kế hoạch nghiệp vụ', 'DAIDIEN_KHOA', 7, 'KHNV', 46),
        ('Bà. Phan Thị Mỹ Lệ', 'Phó Trưởng khoa Truyền thông GDSK', 'DAIDIEN_KHOA', 8, 'TTGDSK', 47),
        ('Ông. Nguyễn Như Tiến', 'Phó Trưởng khoa Ký sinh trùng - Côn trùng', 'DAIDIEN_KHOA', 9, 'KSTCT', 48),
        ('Bà. Bùi Thị Long Cảnh', 'Trưởng khoa Phòng chống Bệnh không lây nhiễm', 'DAIDIEN_KHOA', 10, 'PCBKLN', 49),
        ('Bà. Mai Thị Tính', 'Phụ trách Khoa Dược - VTYT', 'DAIDIEN_KHOA', 11, 'DVTYT', 50),
        ('Ông. Cao Minh Thông', 'Trưởng khoa HIV/AIDS và QLĐTNC', 'DAIDIEN_KHOA', 12, 'HIV', 51),
        ('Ông. Đặng Quang Ánh', 'Phó Trưởng khoa Phòng chống Bệnh truyền nhiễm', 'DAIDIEN_KHOA', 13, 'PCBTN', 52),
        ('Ông. Hồ Phú Quảng', 'Trưởng phòng Tài chính - Kế toán', 'DAIDIEN_KHOA', 14, 'TCKT', 53),
        ('Ông. Trần Liên', 'Trưởng phòng Tổ chức - Hành chính', 'DAIDIEN_KHOA', 15, 'TCHC', 54),
        ('Ông. Phan Văn Bửu', 'Trưởng khoa Kiểm dịch Y tế Quốc tế', 'DAIDIEN_KHOA', 16, 'KDYTQT', 55)
    ]

    for m in committee:
        cursor.execute("""
            INSERT INTO InventoryCommitteeMember (fullName, position, role, departmentId, scope, isActive, displayOrder, createdAt, updatedAt)
            VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
        """, (m[0], m[1], m[2], m[3], m[4], m[5], now_iso, now_iso))

    conn.commit()

    print("\n=== SUMMARY AFTER SETUP ===")
    cursor.execute("SELECT code, name, (SELECT COUNT(*) FROM Asset WHERE categoryId = AssetCategory.id) FROM AssetCategory")
    for c in cursor.fetchall():
        print(f"  Category: {c[0]} - {c[1]}: {c[2]} assets")

    cursor.execute("SELECT COUNT(*) FROM Department")
    print(f"  Total Departments: {cursor.fetchone()[0]}")

    cursor.execute("SELECT COUNT(*) FROM InventoryCommitteeMember")
    print(f"  Total Committee Members: {cursor.fetchone()[0]}")

    conn.close()

if __name__ == '__main__':
    setup_database()
