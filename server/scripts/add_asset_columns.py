import sqlite3
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = sqlite3.connect(r'f:\QLTS\server\prisma\dev.db')
cursor = conn.cursor()

# Check table info
cursor.execute("PRAGMA table_info(Asset)")
columns = [c[1] for c in cursor.fetchall()]
print("Asset columns:", columns)

# Add new columns if not exists
if 'managingUnit' not in columns:
    cursor.execute("ALTER TABLE Asset ADD COLUMN managingUnit TEXT DEFAULT 'TCHC'")
    print("Added managingUnit column")

if 'floor' not in columns:
    cursor.execute("ALTER TABLE Asset ADD COLUMN floor TEXT")
    print("Added floor column")

if 'buildingAsset' not in columns:
    cursor.execute("ALTER TABLE Asset ADD COLUMN buildingAsset INTEGER DEFAULT 0")
    print("Added buildingAsset column")

# Ensure categories exist
cursor.execute("SELECT id, code, name FROM AssetCategory")
cats = cursor.fetchall()
print("Current categories:", cats)

conn.commit()
conn.close()
