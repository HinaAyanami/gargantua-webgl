// 验证鼠标交互：拖动旋转视角 / 滚轮缩放距离。
// 用法：node tools/drag.mjs [输出png=./screenshots/drag.png]
import path from 'node:path';
import { launch, sleep, ROOT, PAGE } from './browser.mjs';

const OUT = process.argv[2] || path.join(ROOT, 'screenshots', 'drag.png');
const round = (n) => +n.toFixed(4);
const snap = 'JSON.stringify({yaw:+__state.yaw.toFixed(4),pitch:+__state.pitch.toFixed(4),dist:+__state.dist.toFixed(3),tYaw:+__state.tYaw.toFixed(4),tPitch:+__state.tPitch.toFixed(4),tDist:+__state.tDist.toFixed(3)})';

const b = await launch();
try {
  await b.open(PAGE, 12000);
  await b.ev('window.__state.auto = false');   // 关掉自动旋转，隔离变量
  await sleep(500);
  const before = JSON.parse(await b.ev(snap));

  // 从 (520,380) 开始，向右拖 300px、向下拖 80px
  await b.cdp('Input.dispatchMouseEvent', { type: 'mousePressed', x: 520, y: 380, button: 'left', clickCount: 1, buttons: 1 });
  for (let i = 1; i <= 12; i++) {
    await b.cdp('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 520 + i * 25, y: 380 + i * 7, button: 'left', buttons: 1 });
    await sleep(30);
  }
  await b.cdp('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 820, y: 464, button: 'left', clickCount: 1, buttons: 0 });
  await sleep(1500);
  const afterDrag = JSON.parse(await b.ev(snap));

  // 向上滚一格（拉近）
  await b.cdp('Input.dispatchMouseEvent', { type: 'mouseWheel', x: 640, y: 380, deltaX: 0, deltaY: -360, buttons: 0 });
  await sleep(1500);
  const afterWheel = JSON.parse(await b.ev(snap));

  const info = await b.ev('JSON.stringify({gl:__diag.gl,err:__diag.err,fps:+__diag.fps.toFixed(2),post:__diag.post})');
  await b.shot(OUT);

  console.log('DIAG       :', info);
  console.log('BEFORE     :', JSON.stringify(before));
  console.log('AFTER_DRAG :', JSON.stringify(afterDrag));
  console.log('AFTER_WHEEL:', JSON.stringify(afterWheel));
  console.log('拖动增量    : yaw', round(afterDrag.tYaw - before.tYaw), ' pitch', round(afterDrag.tPitch - before.tPitch));
  console.log('滚轮增量    : dist', round(afterWheel.tDist - before.tDist));
  console.log('SHOT       :', OUT);
} catch (e) {
  console.log('FAILED:', e.message);
} finally {
  b.kill();
}
await sleep(500);
process.exit(0);
