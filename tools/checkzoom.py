"""批量体检 zoom_*.png：画面几乎全黑 = 黑洞消失了（拉远后最常见的回归）。

用法：
    python tools/checkzoom.py [目录=./screenshots]
"""
import glob
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
D = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / 'screenshots')

print(f"{'file':18s} {'mean':>7s} {'max':>6s} {'center':>7s} {'bright%':>7s}  verdict")
for p in sorted(glob.glob(os.path.join(D, 'zoom_*.png'))):
    a = np.asarray(Image.open(p).convert('RGB')).astype(np.float32) / 255.0
    lum = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    h, w = lum.shape
    c = lum[h // 2 - 90:h // 2 + 90, w // 2 - 90:w // 2 + 90]
    bright = (lum > 0.5).mean() * 100
    verdict = 'BLANK/消失!' if lum.mean() < 0.01 else ('ok 有内容' if bright > 0.5 else 'dim 可疑')
    print(f'{os.path.basename(p):18s} {lum.mean():7.4f} {lum.max():6.3f} {c.mean():7.4f} {bright:6.2f}%  {verdict}')
