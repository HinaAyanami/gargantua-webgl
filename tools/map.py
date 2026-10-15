"""把一张截图打成亮度 ASCII 图 + 行列剖面 + 采样点颜色，用文本就能看出画面结构。

用法：
    python tools/map.py [输入png=./screenshots/s11.png]
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
src = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / 'screenshots' / 's11.png')

im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.float32) / 255.0
h, w, _ = a.shape
lum = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)

BW, BH = 64, 40  # 粗块平均亮度 ASCII 图
ch = ' .:-=+*#%@'
print(f'--- luminance map ({w}x{h}), block {BW}x{BH} ---')
for by in range(0, h, BH):
    row = ''
    for bx in range(0, w, BW):
        v = lum[by:by + BH, bx:bx + BW].mean()
        row += ch[min(9, int(v * 10))]
    print(f'{by:4d} {row}')

print('--- row profiles (mean lum per 64px column) ---')
for y in range(20, h, 60):
    band = lum[max(0, y - 12):y + 12, :]
    print(f'y={y:4d} ' + ' '.join(f'{band[:, x:x + 64].mean():.3f}' for x in range(0, w, 128)))

print('--- column profiles (mean lum per 40px row) ---')
for x in range(40, w, 160):
    band = lum[:, x - 20:x + 20]
    print(f'x={x:4d} ' + ' '.join(f'{band[y:y + 40, :].mean():.3f}' for y in range(0, h, 80)))

print('--- sample colors ---')
for (x, y) in [(640, 120), (640, 240), (640, 330), (640, 420), (640, 600), (200, 120),
               (1100, 120), (1100, 420), (300, 420), (950, 380), (640, 700)]:
    r, g, b = a[y, x] * 255
    print(f'({x:4d},{y:4d}) rgb=({r:5.1f},{g:5.1f},{b:5.1f}) lum={lum[y, x]:.3f}')
