import openpyxl
import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

cntt_file = r'f:\QLTS\TS\CNTT\1. PKĐK 2026 chốt.xlsx'
wb = openpyxl.load_workbook(cntt_file, data_only=True)
ws = wb['2026 PKDK']

print(f"=== SAMPLE ROWS FROM {cntt_file} ===")
for r in range(14, 35):
    row_vals = [ws.cell(r, c).value for c in range(1, 10)]
    print(f"Row {r:2d}: {row_vals}")
