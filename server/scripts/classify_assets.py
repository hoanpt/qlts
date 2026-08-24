import sqlite3
import re
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

conn = sqlite3.connect(r'f:\QLTS\server\prisma\dev.db')
cursor = conn.cursor()

# Ensure we have categories:
# 1: TBVP (Thiết bị Hành chính & CCDC)
# 2: CNTT (Thiết bị Công nghệ thông tin)
# 3: TBYT / DUOC (Trang thiết bị Y tế - Khoa Dược)
# 4: TBVP_TOANHA (Tài sản hạ tầng gắn liền tòa nhà theo tầng)

cursor.execute("SELECT id, code FROM AssetCategory")
cat_map = {c[1]: c[0] for c in cursor.fetchall()}

if 'TBVP_TOANHA' not in cat_map:
    cursor.execute("INSERT INTO AssetCategory (code, name, description) VALUES (?, ?, ?)",
                   ('TBVP_TOANHA', 'Tài sản hạ tầng gắn liền tòa nhà theo tầng', 'Công tắc, ổ cắm, đèn, tủ điện, PCCC... theo từng tầng'))
    cat_map['TBVP_TOANHA'] = cursor.lastrowid

if 'TBYT' not in cat_map:
    cursor.execute("INSERT INTO AssetCategory (code, name, description) VALUES (?, ?, ?)",
                   ('TBYT', 'Trang thiết bị Y tế chuyên dụng', 'Thiết bị khám chữa bệnh, xét nghiệm, chẩn đoán hình ảnh (Khoa Dược quản lý)'))
    cat_map['TBYT'] = cursor.lastrowid

# Update all assets
cursor.execute("SELECT id, assetCode, name, categoryId, departmentId, locationDetail, note, source FROM Asset")
all_assets = cursor.fetchall()

tchc_hc_count = 0
tchc_toanha_count = 0
duoc_tbyt_count = 0
cntt_count = 0

for a in all_assets:
    a_id, a_code, a_name, a_cat, a_dept, a_loc, a_note, a_src = a
    
    a_code_str = str(a_code or '').upper()
    a_name_str = str(a_name or '').lower()
    a_loc_str = str(a_loc or '').lower()
    a_note_str = str(a_note or '').lower()

    # 1. CNTT
    if 'CNTT' in a_code_str or a_cat == cat_map.get('CNTT') or any(k in a_name_str for k in ['máy vi tính', 'laptop', 'máy in', 'máy tính', 'switch', 'router', 'server', 'màn hình vi tính', 'ổ cứng', 'chuột vi tính', 'bàn phím']):
        managing_unit = 'CNTT'
        cat_id = cat_map.get('CNTT', 2)
        building_asset = 0
        floor = None
        cntt_count += 1

    # 2. TCHC - Tài sản đi kèm theo tòa nhà (T1, T2, T3, T4, T5, T6, T7, Tầng hầm)
    elif 'TCHC-T' in a_code_str or 'TCHC-TANG' in a_code_str or 'tầng' in a_loc_str or any(k in a_name_str for k in ['công tắc', 'ổ cắm', 'đèn led panel', 'đèn chống ẩm', 'đèn downlight', 'tủ điện', 'đầu báo khói', 'đầu phun sprinkler', 'quả cầu chữa cháy', 'máy bơm chìm', 'van chọn vùng', 'nút nhấn kích hoạt', 'chuông báo động', 'còi / đèn', 'miệng gió']):
        managing_unit = 'TCHC'
        cat_id = cat_map.get('TBVP_TOANHA', 1)
        building_asset = 1
        
        # Determine floor
        floor = 'Tầng 1'
        if 't7' in a_code_str.lower() or 'tầng 7' in a_loc_str or 't7.' in a_loc_str:
            floor = 'Tầng 7'
        elif 't6' in a_code_str.lower() or 'tầng 6' in a_loc_str or 't6.' in a_loc_str:
            floor = 'Tầng 6'
        elif 't5' in a_code_str.lower() or 'tầng 5' in a_loc_str or 't5.' in a_loc_str:
            floor = 'Tầng 5'
        elif 't4' in a_code_str.lower() or 'tầng 4' in a_loc_str or 't4.' in a_loc_str:
            floor = 'Tầng 4'
        elif 't3' in a_code_str.lower() or 'tầng 3' in a_loc_str or 't3.' in a_loc_str:
            floor = 'Tầng 3'
        elif 't2' in a_code_str.lower() or 'tầng 2' in a_loc_str or 't2.' in a_loc_str:
            floor = 'Tầng 2'
        elif 'tangham' in a_code_str.lower() or 'hầm' in a_loc_str:
            floor = 'Tầng Hầm'
        elif 't1' in a_code_str.lower() or 'tầng 1' in a_loc_str or 't1.' in a_loc_str:
            floor = 'Tầng 1'
        
        tchc_toanha_count += 1

    # 3. TCHC - Thiết bị hành chính thông thường (bàn, ghế, tủ, quạt, giường...)
    elif a_dept == 15 or any(k in a_name_str for k in ['bàn làm việc', 'ghế xoay', 'tủ sắt', 'tủ gỗ', 'bàn họp', 'ghế hội trường', 'quạt trần', 'quạt cây', 'giường inox', 'xe đẩy', 'tủ nhôm']):
        managing_unit = 'TCHC'
        cat_id = cat_map.get('TBVP', 1)
        building_asset = 0
        floor = 'Tầng 1'
        tchc_hc_count += 1

    # 4. Khoa Dược - Trang thiết bị y tế chuyên dụng (TBYT)
    else:
        managing_unit = 'DUOC'
        cat_id = cat_map.get('TBYT', cat_map.get('DUOC', 3))
        building_asset = 0
        floor = None
        duoc_tbyt_count += 1

    cursor.execute("""
        UPDATE Asset 
        SET managingUnit = ?, categoryId = ?, buildingAsset = ?, floor = ?
        WHERE id = ?
    """, (managing_unit, cat_id, building_asset, floor, a_id))

conn.commit()

print("\n=== KẾT QUẢ PHÂN CHIA TÀI SẢN THEO 3 KHỐI QUẢN LÝ ===")
print(f"1. Khối TCHC - Thiết bị hành chính: {tchc_hc_count} tài sản")
print(f"2. Khối TCHC - Hạ tầng đi kèm tòa nhà theo tầng: {tchc_toanha_count} tài sản")
print(f"   => Tổng tài sản Phòng TCHC quản lý: {tchc_hc_count + tchc_toanha_count} tài sản")
print(f"3. Khối Khoa Dược - Trang thiết bị y tế (TBYT): {duoc_tbyt_count} tài sản")
print(f"4. Khối CNTT - Thiết bị Công nghệ thông tin: {cntt_count} tài sản")
print(f"TOTAL: {tchc_hc_count + tchc_toanha_count + duoc_tbyt_count + cntt_count} tài sản")

# Summary by floor for building assets
cursor.execute("SELECT floor, COUNT(*) FROM Asset WHERE buildingAsset = 1 GROUP BY floor ORDER BY floor")
print("\nPhân bổ tài sản hạ tầng tòa nhà TCHC theo tầng:")
for r in cursor.fetchall():
    print(f"  {r[0]}: {r[1]} thiết bị (công tắc, ổ cắm, đèn, PCCC...)")

conn.close()
