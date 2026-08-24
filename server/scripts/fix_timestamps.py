import sqlite3
import time

conn = sqlite3.connect(r'f:\QLTS\server\prisma\dev.db')
cursor = conn.cursor()

now_ms = int(time.time() * 1000)

cursor.execute("UPDATE Asset SET createdAt = ?, updatedAt = ?", (now_ms, now_ms))
conn.commit()

cursor.execute("SELECT COUNT(*) FROM Asset WHERE typeof(createdAt) = 'integer'")
count = cursor.fetchone()[0]
print(f"Updated {count} assets to integer millisecond timestamp ({now_ms})")

conn.close()
