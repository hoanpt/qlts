import sqlite3
import datetime
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DB_PATH = r'f:\QLTS\server\prisma\dev.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

now_iso = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

# 1. Delete all fake asset rows that contain human names or signature titles
print("1. Cleaning fake asset rows (footer signature lines)...")
bad_names = [
    'Thành viên tổ kiểm kê', 'Trần Văn Vũ', 'Phan Thanh Hoàn', 'Trần Thị Liên',
    'Huỳnh Thị Thanh Tú', 'Nguyễn Đại Vĩnh', 'Hồ Phú Quảng', 'Mai Thị Tính', 'Trần Liên'
]
for name in bad_names:
    cursor.execute("DELETE FROM Asset WHERE LOWER(name) = LOWER(?)", (name,))

conn.commit()

# Check remaining assets
cursor.execute("SELECT managingUnit, COUNT(*) FROM Asset GROUP BY managingUnit")
print("\nRemaining assets after cleaning fake rows:")
for r in cursor.fetchall():
    print(f"  • {r[0]}: {r[1]} assets")

cursor.execute("SELECT COUNT(*) FROM Asset")
print(f"  TOTAL ASSETS: {cursor.fetchone()[0]}")

# 2. Update InventoryCommitteeMember table for Tổ CNTT
print("\n2. Updating InventoryCommitteeMember for Tổ CNTT...")
# Remove old CNTT members
cursor.execute("DELETE FROM InventoryCommitteeMember WHERE scope = 'CNTT' OR role LIKE '%CNTT%'")

cntt_members = [
    ('Ông. Trần Văn Vũ', 'Trưởng phòng KHNV / Phụ trách CNTT', 'TOTRUONG_CNTT', 7, 'CNTT', 20),
    ('Ông. Phan Thanh Hoàn', 'Cán bộ Tổ kiểm kê CNTT', 'THANHVIEN_CNTT', 7, 'CNTT', 21),
    ('Bà. Trần Thị Liên', 'Cán bộ Tổ kiểm kê CNTT', 'THANHVIEN_CNTT', 7, 'CNTT', 22),
    ('Bà. Huỳnh Thị Thanh Tú', 'Cán bộ Tổ kiểm kê CNTT', 'THANHVIEN_CNTT', 7, 'CNTT', 23),
]

for m in cntt_members:
    cursor.execute("""
        INSERT INTO InventoryCommitteeMember (fullName, position, role, departmentId, scope, isActive, displayOrder, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)
    """, (m[0], m[1], m[2], m[3], m[4], m[5], now_iso, now_iso))

conn.commit()

# Print current committee
print("\nCurrent Committee Members by Team:")
cursor.execute("SELECT role, fullName, position, scope FROM InventoryCommitteeMember ORDER BY displayOrder")
for r in cursor.fetchall():
    print(f"  [{r[0]}] {r[1]} - {r[2]} (Scope: {r[3]})")

# 3. Upgrade Disposal Table
print("\n3. Upgrading Disposal table structure...")
cursor.execute("PRAGMA table_info(Disposal)")
existing_cols = [c[1] for c in cursor.fetchall()]

new_cols = [
    ('campaignName', 'TEXT DEFAULT "Đợt 1/2026 - Rà soát & Thanh lý tài sản đầu năm"'),
    ('departmentId', 'INTEGER DEFAULT 1'),
    ('technicalAssessment', 'TEXT'),
    ('technicalInspector', 'TEXT'),
    ('inspectionDate', 'DATETIME'),
    ('disposalMethod', 'TEXT DEFAULT "Bán phế liệu"')
]

for col_name, col_type in new_cols:
    if col_name not in existing_cols:
        cursor.execute(f"ALTER TABLE Disposal ADD COLUMN {col_name} {col_type}")
        print(f"  Added column: {col_name}")

# Create DisposalCampaign table if not exists
cursor.execute("""
CREATE TABLE IF NOT EXISTS DisposalCampaign (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    campaignCode TEXT UNIQUE,
    startDate DATETIME DEFAULT CURRENT_TIMESTAMP,
    endDate DATETIME,
    status TEXT DEFAULT 'OPEN', -- OPEN, INSPECTING, BOARD_REVIEW, COMPLETED
    description TEXT,
    issuedBy TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
)
""")

# Seed default campaign
cursor.execute("SELECT COUNT(*) FROM DisposalCampaign")
if cursor.fetchone()[0] == 0:
    cursor.execute("""
    INSERT INTO DisposalCampaign (title, campaignCode, startDate, endDate, status, description, issuedBy, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        'Thông báo rà soát & lập danh mục đề xuất thanh lý tài sản, CCDC Đợt 1 năm 2026',
        'TB-TL-2026-01',
        '2026-01-15T08:00:00.000Z',
        '2026-03-30T17:00:00.000Z',
        'OPEN',
        'Đề nghị các Khoa/Phòng trực thuộc tiến hành kiểm tra, rà soát toàn bộ tài sản, máy móc, trang thiết bị y tế, thiết bị CNTT, CCDC bị hư hỏng không thể phục hồi hoặc chi phí sửa chữa không hiệu quả để lập báo cáo đề xuất gửi về các đơn vị chuyên trách (Khoa Dược, Tổ CNTT, Phòng TCHC).',
        'Ban Giám Đốc CDC Đà Nẵng',
        now_iso,
        now_iso
    ))

conn.commit()
conn.close()
print("\nDone! Database upgraded with accurate committee and disposal workflow tables.")
