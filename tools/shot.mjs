// 无头渲染一张截图，并读取页面内建的诊断信号。
// 用法：node tools/shot.mjs [输出png=./screenshots/shot.png] [等待ms=12000] [页面url]
import path from 'node:path';
import { launch, sleep, ROOT, PAGE } from './browser.mjs';

const OUT = process.argv[2] || path.join(ROOT, 'screenshots', 'shot.png');
const WAIT = parseInt(process.argv[3] || '12000', 10);
const URL_ = process.argv[4] || PAGE;

const b = await launch();
try {
  console.log('BROWSER:', process.env.BROWSER_BIN || '(自动探测)');
  await b.open(URL_, WAIT);

  const diag = await b.ev('JSON.stringify(window.__diag||{missing:true})');
  const err = await b.ev('document.getElementById("err").textContent');
  const status = await b.ev('document.getElementById("sRes").textContent + " | " + document.getElementById("sFps").textContent');

  console.log('DIAG  :', diag);            // gl / err / fps / hdr / post
  console.log('ERROR :', JSON.stringify(err));
  console.log('STATUS:', status);          // 分辨率 | 帧率
  await b.shot(OUT);
  console.log('SAVED :', OUT);

  if (diag === '{"missing":true}') {
    console.error('页面没有暴露 window.__diag —— 导航失败或 WebGL2 不可用。');
    b.kill();
    process.exit(1);
  }
} finally {
  b.kill();
}
await sleep(300);
process.exit(0);
