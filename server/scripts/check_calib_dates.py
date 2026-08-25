import sqlite3
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DB_PATH = r'f:\QLTS\server\prisma\dev.db'
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("SELECT id, calibrationDate, nextCalibrationDate, createdAt, proposalDate, approvalDate FROM CalibrationRecord LIMIT 10")
for r in cursor.fetchall():
    print(f"ID {r[0]}: calibDate={r[1]} (type: {type(r[1])}), nextCalibDate={r[2]} (type: {type(r[2])}), createdAt={r[3]}, propDate={r[4]}, appDate={r[5]}")

conn.close()
