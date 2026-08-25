import sqlite3
import datetime
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DB_PATH = r'f:\QLTS\server\prisma\dev.db'
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

def fix_iso(val):
    if not val:
        return None
    s = str(val).strip()
    if s.endswith('Z') and '.' in s:
        return s
    if 'T' in s:
        if '.' not in s:
            s = s.split('T')[0] + 'T' + s.split('T')[1].split('+')[0]
            if len(s.split('T')[1]) == 8:
                return f"{s}.000Z"
            elif len(s.split('T')[1]) == 5:
                return f"{s}:00.000Z"
        else:
            base = s.split('.')[0]
            return f"{base}.000Z"
    else:
        return f"{s}T00:00:00.000Z"

# Fix CalibrationRecord
cursor.execute("SELECT id, calibrationDate, nextCalibrationDate, createdAt, proposalDate, approvalDate FROM CalibrationRecord")
calibs = cursor.fetchall()
for c in calibs:
    c_id, c_date, next_date, created, prop_date, app_date = c
    new_c_date = fix_iso(c_date)
    new_next_date = fix_iso(next_date)
    new_created = fix_iso(created)
    new_prop = fix_iso(prop_date)
    new_app = fix_iso(app_date)
    cursor.execute("""
        UPDATE CalibrationRecord 
        SET calibrationDate = ?, nextCalibrationDate = ?, createdAt = ?, proposalDate = ?, approvalDate = ?
        WHERE id = ?
    """, (new_c_date, new_next_date, new_created, new_prop, new_app, c_id))

# Fix MaintenanceRequest
cursor.execute("SELECT id, requestDate, completedDate, createdAt, updatedAt, proposalDate, approvalDate FROM MaintenanceRequest")
maints = cursor.fetchall()
for m in maints:
    m_id, req_date, comp_date, created, updated, prop_date, app_date = m
    new_req = fix_iso(req_date)
    new_comp = fix_iso(comp_date)
    new_created = fix_iso(created)
    new_updated = fix_iso(updated)
    new_prop = fix_iso(prop_date)
    new_app = fix_iso(app_date)
    cursor.execute("""
        UPDATE MaintenanceRequest
        SET requestDate = ?, completedDate = ?, createdAt = ?, updatedAt = ?, proposalDate = ?, approvalDate = ?
        WHERE id = ?
    """, (new_req, new_comp, new_created, new_updated, new_prop, new_app, m_id))

conn.commit()
conn.close()
print("Done fixing ISO date strings for Prisma!")
