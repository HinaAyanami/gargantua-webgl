// 验证不同相机距离下的渲染（重点是拉远后黑洞是否仍在画面里）。
// 用法：node tools/zoom.mjs [输出目录=./screenshots]
import path from 'node:path';
import { launch, sleep, ROOT, PAGE } from './browser.mjs';

const OUTDIR = process.argv[2] || path.join(ROOT, 'screenshots');

const b = await launch();
try {
  await b.open(PAGE, 13000);
  await b.ev('window.__state.auto = false');

  const shotAt = async (tag) => {
    await sleep(7000);   // 等相机平滑到位并渲染若干帧
    const info = await b.ev('JSON.stringify({dist:+__state.dist.toFixed(2),tDist:+__state.tDist.toFixed(2),err:__diag.err})');
    await b.shot(path.join(OUTDIR, tag + '.png'));
    console.log(tag.padEnd(18), info);
  };

  await shotAt('zoom_a_dist25');            // 基准视角

  // 用真实滚轮事件拉远（每格 ×1.141，20 格足以撞到上限）
  for (let i = 0; i < 20; i++) {
    await b.cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 640, y: 380, deltaX: 0, deltaY: 120, buttons: 0 });
    await sleep(60);
  }
  console.log('滚轮拉远后目标距离:', await b.ev('JSON.stringify({tDist:+__state.tDist.toFixed(2)})'));
  await shotAt('zoom_c_wheel_max');

  await b.ev('window.__state.tDist = 80');  // 直接给到上限，确认极限值
  await shotAt('zoom_d_dist80');

  await b.ev('window.__state.tDist = 12');  // 回到中近距离
  await shotAt('zoom_b_dist12');
} catch (e) {
  console.log('FAILED:', e.message);
} finally {
  b.kill();
}
await sleep(500);
process.exit(0);
