import sqlite3
import bcrypt
import datetime
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

DB_PATH = r'f:\QLTS\server\prisma\dev.db'
conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

now_iso = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.000Z')

def hash_pw(pw):
    return bcrypt.hashpw(pw.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

cursor.execute("DELETE FROM User")

users = [
    # 1. ADMIN TỐI CAO
    ('admin', hash_pw('admin123'), 'Quản Trị Viên Tối Cao (Ban Giám Đốc)', 'ADMIN', None),

    # 2. NGƯỜI QUẢN LÝ TÀI SẢN 3 KHỐI
    ('manager_duoc', hash_pw('123456'), 'Quản Lý Tài Sản - Khoa Dược (TBYT)', 'MANAGER_DUOC', 11),
    ('manager_cntt', hash_pw('123456'), 'Quản Lý Tài Sản - Tổ CNTT', 'MANAGER_CNTT', 7),
    ('manager_tchc', hash_pw('123456'), 'Quản Lý Tài Sản - Phòng TCHC', 'MANAGER_TCHC', 15),

    # 3. 16 KHOA / PHÒNG (NGƯỜI DÙNG BÌNH THƯỜNG)
    ('pkdk', hash_pw('123456'), 'Phòng Khám Đa Khoa', 'DEPARTMENT', 1),
    ('xn', hash_pw('123456'), 'Khoa Xét Nghiệm - CĐHA - TDCN', 'DEPARTMENT', 2),
    ('bnn', hash_pw('123456'), 'Khoa Bệnh Nghề Nghiệp', 'DEPARTMENT', 3),
    ('dd', hash_pw('123456'), 'Khoa Dinh Dưỡng', 'DEPARTMENT', 4),
    ('skmt', hash_pw('123456'), 'Khoa Sức Khỏe Môi Trường - YTTH', 'DEPARTMENT', 5),
    ('skss', hash_pw('123456'), 'Khoa Sức Khỏe Sinh Sản', 'DEPARTMENT', 6),
    ('khnv', hash_pw('123456'), 'Phòng Kế Hoạch Nghiệp Vụ', 'DEPARTMENT', 7),
    ('ttgdsk', hash_pw('123456'), 'Khoa Truyền Thông Giáo Dục Sức Khỏe', 'DEPARTMENT', 8),
    ('kstct', hash_pw('123456'), 'Khoa Ký Sinh Trùng - Côn Trùng', 'DEPARTMENT', 9),
    ('pcbkln', hash_pw('123456'), 'Khoa Phòng Chống Bệnh Không Lây Nhiễm', 'DEPARTMENT', 10),
    ('dvtyt', hash_pw('123456'), 'Khoa Dược - Vật Tư Y Tế', 'DEPARTMENT', 11),
    ('hiv', hash_pw('123456'), 'Khoa HIV/AIDS và QLĐTNC', 'DEPARTMENT', 12),
    ('pcbtn', hash_pw('123456'), 'Khoa Phòng Chống Bệnh Truyền Nhiễm', 'DEPARTMENT', 13),
    ('tckt', hash_pw('123456'), 'Phòng Tài Chính - Kế Toán', 'DEPARTMENT', 14),
    ('tchc', hash_pw('123456'), 'Phòng Tổ Chức - Hành Chính', 'DEPARTMENT', 15),
    ('kdytqt', hash_pw('123456'), 'Khoa Kiểm Dịch Y Tế Quốc Tế', 'DEPARTMENT', 16),
]

for u in users:
    cursor.execute("""
        INSERT INTO User (username, password, fullName, role, departmentId, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (u[0], u[1], u[2], u[3], u[4], now_iso, now_iso))

conn.commit()

print("=== HOÀN TẤT TẠO TOÀN BỘ TÀI KHOẢN VÀ PHÂN QUYỀN HỆ THỐNG ===")
cursor.execute("SELECT id, username, fullName, role, departmentId FROM User ORDER BY id")
for r in cursor.fetchall():
    print(f"ID {r[0]:2d}: [{r[3]:12s}] Username: {r[1]:14s} | {r[2]} (DeptId: {r[4]})")

conn.close()
