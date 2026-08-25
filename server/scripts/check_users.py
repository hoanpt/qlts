import sqlite3
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DB_PATH = r'f:\QLTS\server\prisma\dev.db'
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("=== CURRENT USERS IN DB ===")
cursor.execute("SELECT id, username, fullName, role, departmentId FROM User")
for r in cursor.fetchall():
    print(f"ID {r[0]}: username='{r[1]}', fullName='{r[2]}', role='{r[3]}', deptId={r[4]}")

conn.close()
