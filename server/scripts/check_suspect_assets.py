import sqlite3
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DB_PATH = r'f:\QLTS\server\prisma\dev.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Search for assets with person names or footer titles
suspect_patterns = [
    'thành viên', 'ông.', 'bà.', 'trần văn vũ', 'phan thanh hoàn', 'trần thị liên',
    'huỳnh thị thanh tú', 'nguyễn đại vĩnh', 'hồ phú quảng', 'mai thị tính',
    'trần liên', 'chủ tịch', 'tổ trưởng', 'đại diện', 'ký tên'
]

print("=== CHECKING SUSPECT ASSET ROWS ===")
for p in suspect_patterns:
    cursor.execute("SELECT id, assetCode, name, departmentId, managingUnit FROM Asset WHERE LOWER(name) LIKE ?", (f"%{p}%",))
    rows = cursor.fetchall()
    if rows:
        print(f"\nPattern '{p}' matched {len(rows)} rows:")
        for r in rows:
            print(f"  ID: {r[0]} | Code: {r[1]} | Name: '{r[2]}' | Dept: {r[3]} | Unit: {r[4]}")

conn.close()
