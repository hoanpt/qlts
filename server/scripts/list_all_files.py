import os
import sys
import io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

print("=== CNTT FILES ===")
for f in sorted(os.listdir(r'f:\QLTS\TS\CNTT')):
    if not f.startswith('~$'):
        print(f"  {repr(f)}")

print("\n=== TBVP FILES ===")
for f in sorted(os.listdir(r'f:\QLTS\TS\TBVP Kiem ke tai san hoan thien')):
    if not f.startswith('~$'):
        print(f"  {repr(f)}")
