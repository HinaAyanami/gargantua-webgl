// 共享模块：定位浏览器 → 启动 headless → 建立 CDP 连接
// shot.mjs / drag.mjs / zoom.mjs 都复用它，避免三份重复代码。
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PAGE = pathToFileURL(path.join(ROOT, 'blackhole.html')).href;
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 找一个 Chromium 内核浏览器：环境变量优先，其次探测常见安装位置
export function findBrowser() {
  const ext = process.platform === 'win32' ? '.exe' : '';
  const candidates = [
    process.env.BROWSER_BIN,
    process.env.EDGE_BIN,
    `C:/Program Files (x86)/Microsoft/Edge/Application/msedge${ext}`,
    `C:/Program Files/Microsoft/Edge/Application/msedge${ext}`,
    `C:/Program Files/Google/Chrome/Application/chrome${ext}`,
    `C:/Program Files (x86)/Google/Chrome/Application/chrome${ext}`,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/microsoft-edge',
  ].filter(Boolean);

  for (const p of candidates) if (fs.existsSync(p)) return p;

  for (const dir of (process.env.PATH || '').split(path.delimiter)) {
    for (const name of ['msedge', 'google-chrome', 'chromium']) {
      const p = path.join(dir, name + ext);
      if (fs.existsSync(p)) return p;
    }
  }
  throw new Error(
    '找不到 Chromium 内核浏览器（Edge / Chrome）。请用 BROWSER_BIN 指定可执行文件路径，例如：\n' +
    '  BROWSER_BIN="C:/Program Files/Google/Chrome/Application/chrome.exe" node tools/shot.mjs'
  );
}

/** 启动 headless 浏览器并连上 CDP，返回一组操作句柄。 */
export async function launch({ port = 9333, width = 1280, height = 760 } = {}) {
  const exe = findBrowser();
  const profile = path.join(os.tmpdir(), `gargantua-prof-${process.pid}-${Date.now()}`);

  const proc = spawn(exe, [
    '--headless=new',
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    // 无显卡/无头环境下用 SwiftShader 软渲染跑 WebGL2
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
    `--window-size=${width},${height}`,
    'about:blank',
  ], { stdio: 'ignore' });

  let wsUrl = null;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    await sleep(300);
    try {
      const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
      const target = list.find((t) => t.type === 'page');
      if (target) wsUrl = target.webSocketDebuggerUrl;
    } catch { /* 还没起来，继续等 */ }
  }
  if (!wsUrl) { proc.kill(); throw new Error('NO_TARGET：浏览器没能在端口 ' + port + ' 上暴露调试目标'); }

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej; });

  let msgId = 0;
  const cdp = (method, params = {}) => new Promise((res, rej) => {
    const id = ++msgId;
    const onMsg = (evt) => {
      const m = JSON.parse(evt.data);
      if (m.id === id) {
        ws.removeEventListener('message', onMsg);
        m.error ? rej(new Error(JSON.stringify(m.error))) : res(m.result);
      }
    };
    ws.addEventListener('message', onMsg);
    ws.send(JSON.stringify({ id, method, params }));
  });

  const ev = async (expr) => {
    const r = await cdp('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    return r.result && r.result.value;
  };

  // 打开页面并等比设置视口
  await cdp('Page.enable');
  await cdp('Runtime.enable');
  await cdp('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });

  return {
    cdp,
    ev,
    async open(url = PAGE, waitMs = 12000) {
      // url 可以是完整 URL（含 file:// ），也可以是本地文件路径
      const target = /^[a-z][a-z0-9+.-]*:/i.test(url) ? url : pathToFileURL(path.resolve(url)).href;
      await cdp('Page.navigate', { url: target });
      await sleep(waitMs);
    },
    async shot(out) {
      const s = await cdp('Page.captureScreenshot', { format: 'png' });
      fs.mkdirSync(path.dirname(out), { recursive: true });
      fs.writeFileSync(out, Buffer.from(s.data, 'base64'));
      return out;
    },
    kill() { try { ws.close(); } catch {} try { proc.kill(); } catch {} },
  };
}
