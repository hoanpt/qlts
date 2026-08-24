import sqlite3

conn = sqlite3.connect(r'f:\QLTS\server\prisma\dev.db')
cursor = conn.cursor()

# Check User createdAt (created by Prisma seed)
cursor.execute("SELECT id, username, createdAt, updatedAt FROM User LIMIT 3")
print("User dates (Prisma format):")
for r in cursor.fetchall():
    print(r)

# Check Asset createdAt (created by Python import)
cursor.execute("SELECT id, assetCode, createdAt, updatedAt FROM Asset LIMIT 3")
print("\nAsset dates (Python format):")
for r in cursor.fetchall():
    print(r)

conn.close()
