"""亮度分析 + 局部纹理度量 + 4 倍放大裁切（用于判断吸积盘/星场细节是否真的渲染出来了）。

用法：
    python tools/analyze.py [输入png=./screenshots/s11.png] [输出前缀=./analysis/an]
输出：<前缀>_zoom_disk.png / _zoom_sky.png / _zoom_arc.png
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
src = sys.argv[1] if len(sys.argv) > 1 else str(ROOT / 'screenshots' / 's11.png')
outpre = sys.argv[2] if len(sys.argv) > 2 else str(ROOT / 'analysis' / 'an')

im = Image.open(src).convert('RGB')
a = np.asarray(im).astype(np.float32) / 255.0
h, w, _ = a.shape
lum = a @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
print(f'size={w}x{h} mean_lum={lum.mean():.4f} max={lum.max():.3f}')
print(f'clipped(>0.95) pixels: {(lum > 0.95).mean() * 100:.2f}%   dark(<0.02): {(lum < 0.02).mean() * 100:.2f}%')

# 亮度质心（黑洞 + 吸积盘）
ys, xs = np.mgrid[0:h, 0:w]
m = lum.sum()
print(f'lum centroid: x={float((xs * lum).sum() / m):.0f} y={float((ys * lum).sum() / m):.0f}')
# 最暗大区域（事件视界阴影）质心
d = np.clip(0.02 - lum, 0, None)
print(f'dark centroid: x={float((xs * d).sum() / max(d.sum(), 1e-6)):.0f} y={float((ys * d).sum() / max(d.sum(), 1e-6)):.0f}')

rowsum = lum.sum(axis=1)
print('brightest rows:', sorted(int(t) for t in np.argsort(rowsum)[-6:]))
colsum = lum.sum(axis=0)
print('brightest cols:', sorted(int(t) for t in np.argsort(colsum)[-6:]))


# 局部细节度量：相邻像素一阶差的平均绝对值（纹理丰富度）
def detail(x0, y0, x1, y1):
    sub = lum[y0:y1, x0:x1]
    return (np.abs(np.diff(sub, axis=1)).mean() + np.abs(np.diff(sub, axis=0)).mean()) / 2, sub.mean()


regions = {
    'disk_left': (200, 400, 480, 462),
    'disk_right': (800, 400, 1080, 462),
    'arc_top': (480, 56, 800, 140),
    'sky': (60, 56, 340, 240),
    'shadow': (580, 280, 700, 340),
}
for k, (x0, y0, x1, y1) in regions.items():
    det, mn = detail(x0, y0, x1, y1)
    print(f'{k:12s} detail={det:.5f} mean={mn:.4f}')

# 放大裁切（NEAREST 保持像素真实，便于判断纹理）
crops = {
    'zoom_disk': (240, 392, 440, 460),
    'zoom_sky': (900, 40, 1080, 130),
    'zoom_arc': (500, 56, 780, 140),
}
for k, (x0, y0, x1, y1) in crops.items():
    c = im.crop((x0, y0, x1, y1))
    c = c.resize((c.width * 4, c.height * 4), Image.NEAREST)
    out = f'{outpre}_{k}.png'
    c.save(out)
    print('saved', out, c.size)
