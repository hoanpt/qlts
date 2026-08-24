import sqlite3

conn = sqlite3.connect(r'f:\QLTS\server\prisma\dev.db')
cursor = conn.cursor()

# Get table schema
cursor.execute("PRAGMA table_info(Asset)")
columns = cursor.fetchall()
print("Columns in Asset:")
for c in columns:
    print(c)

# Test query sample rows
cursor.execute("SELECT * FROM Asset LIMIT 5")
rows = cursor.fetchall()
print("\nSample rows:")
for r in rows:
    print(r)

# Check for non-numeric or malformed dates in createdAt / updatedAt
cursor.execute("SELECT id, assetCode, createdAt, updatedAt, originalPrice, currentValue, yearInUse, status FROM Asset LIMIT 10")
for r in cursor.fetchall():
    print(r)

conn.close()
