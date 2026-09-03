"use strict";

const assert = require("node:assert/strict");
const endpoint = "http://127.0.0.1:9444";
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function targets() {
  return (await fetch(`${endpoint}/json/list`)).json();
}

async function waitTarget(fragment, attempts = 60) {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const target = (await targets()).find((item) => item.type === "page" && item.url.includes(fragment));
    if (target) return target;
    await sleep(200);
  }
  throw new Error(`Target not found: ${fragment}`);
}

function connect(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  let id = 0;
  const pending = new Map();
  const opened = new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (!message.id || !pending.has(message.id)) return;
    const item = pending.get(message.id); pending.delete(message.id);
    if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result);
  };
  return {
    async send(method, params = {}) {
      await opened;
      return new Promise((resolve, reject) => {
        const requestId = ++id; pending.set(requestId, { resolve, reject });
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
    close() { socket.close(); }
  };
}

async function evaluate(client, expression) {
  const response = await client.send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (response.exceptionDetails) throw new Error(response.exceptionDetails.exception?.description ?? response.exceptionDetails.text);
  return response.result.value;
}

(async () => {
  const launcherClient = connect(await waitTarget("launcher.html"));
  await launcherClient.send("Runtime.enable");
  const launcherState = await evaluate(launcherClient, `({title:document.title, note:document.querySelector('.shortcut-note').textContent, buttons:document.querySelectorAll('[data-mode]').length})`);
  assert.equal(launcherState.title, "WX Shot");
  assert.equal(launcherState.buttons, 2);
  await evaluate(launcherClient, `document.querySelector('[data-mode="area"]').click()`);

  const selectorClient = connect(await waitTarget("selector.html"));
  await selectorClient.send("Runtime.enable");
  await selectorClient.send("Page.bringToFront");
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await evaluate(selectorClient, `Boolean(document.querySelector('.screen')?.naturalWidth)`)) break;
    await sleep(100);
  }
  const screenSize = await evaluate(selectorClient, `({width:innerWidth,height:innerHeight,surfaceWidth:document.querySelector('.screen').getBoundingClientRect().width,surfaceHeight:document.querySelector('.screen').getBoundingClientRect().height,naturalWidth:document.querySelector('.screen').naturalWidth,naturalHeight:document.querySelector('.screen').naturalHeight})`);
  assert.ok(screenSize.naturalWidth > 0 && screenSize.naturalHeight > 0);
  assert.equal(screenSize.surfaceWidth, screenSize.naturalWidth);
  assert.equal(screenSize.surfaceHeight, screenSize.naturalHeight);
  const endX = Math.min(screenSize.width - 80, 560);
  const endY = Math.min(screenSize.height - 80, 400);
  await selectorClient.send("Input.dispatchMouseEvent", { type: "mousePressed", x: 120, y: 120, button: "left", buttons: 1, clickCount: 1 });
  await selectorClient.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: endX, y: endY, button: "left", buttons: 1 });
  await selectorClient.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: endX, y: endY, button: "left", buttons: 0, clickCount: 1 });

  const editorClient = connect(await waitTarget("editor.html"));
  await editorClient.send("Runtime.enable");
  await editorClient.send("Page.bringToFront");
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await evaluate(editorClient, `Boolean(document.querySelector('.base')?.width)`)) break;
    await sleep(100);
  }
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await evaluate(editorClient, `document.querySelector('.canvas-stage')?.getBoundingClientRect().width > 100`)) break;
    await sleep(50);
  }
  const editorState = await evaluate(editorClient, `({base:[document.querySelector('.base').width,document.querySelector('.base').height],formats:[...document.querySelector('.format-select').options].map(x=>x.value),stage:document.querySelector('.canvas-stage').getBoundingClientRect().toJSON()})`);
  assert.ok(editorState.base[0] > 100 && editorState.base[1] > 100);
  assert.deepEqual(editorState.formats, ["png", "jpeg", "webp"]);

  const rect = editorState.stage;
  const startX = rect.x + rect.width * 0.18;
  const startY = rect.y + rect.height * 0.35;
  await editorClient.send("Input.dispatchMouseEvent", { type: "mousePressed", x: startX, y: startY, button: "left", buttons: 1, clickCount: 1 });
  for (let step = 1; step <= 22; step += 1) {
    await editorClient.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: startX + step * rect.width * 0.025, y: startY + Math.sin(step / 3) * rect.height * 0.12, button: "left", buttons: 1 });
  }
  await editorClient.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: startX + rect.width * 0.55, y: startY, button: "left", buttons: 0, clickCount: 1 });
  await sleep(150);
  const ink = await evaluate(editorClient, `(()=>{const c=document.querySelector('.draw'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<p.length;i+=4)if(p[i])n++;return n})()`);
  assert.ok(ink > 0);

  await evaluate(editorClient, `document.querySelector('[data-tool="eraser"]').click()`);
  const eraseX = rect.x + rect.width * 0.46;
  await editorClient.send("Input.dispatchMouseEvent", { type: "mousePressed", x: eraseX, y: rect.y + 20, button: "left", buttons: 1, clickCount: 1 });
  await editorClient.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: eraseX, y: rect.y + rect.height - 20, button: "left", buttons: 1 });
  await editorClient.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: eraseX, y: rect.y + rect.height - 20, button: "left", buttons: 0, clickCount: 1 });
  const inkAfterErase = await evaluate(editorClient, `(()=>{const c=document.querySelector('.draw'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<p.length;i+=4)if(p[i])n++;return n})()`);
  assert.ok(inkAfterErase < ink);

  await evaluate(editorClient, `document.querySelector('[data-tool="blur"]').click()`);
  await editorClient.send("Input.dispatchMouseEvent", { type: "mousePressed", x: rect.x + 25, y: rect.y + 25, button: "left", buttons: 1, clickCount: 1 });
  await editorClient.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: rect.x + Math.min(180, rect.width - 25), y: rect.y + Math.min(120, rect.height - 25), button: "left", buttons: 1 });
  await editorClient.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: rect.x + Math.min(180, rect.width - 25), y: rect.y + Math.min(120, rect.height - 25), button: "left", buttons: 0, clickCount: 1 });
  const effectPixels = await evaluate(editorClient, `(()=>{const c=document.querySelector('.effects'),p=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=3;i<p.length;i+=4)if(p[i])n++;return n})()`);
  assert.ok(effectPixels > 0);

  const widthBefore = await evaluate(editorClient, `document.querySelector('.canvas-stage').getBoundingClientRect().width`);
  await evaluate(editorClient, `document.querySelector('.zoom-in').click()`);
  const widthAfter = await evaluate(editorClient, `document.querySelector('.canvas-stage').getBoundingClientRect().width`);
  assert.ok(widthAfter > widthBefore);

  console.log(JSON.stringify({
    app: "WX Shot Windows",
    launcher: true,
    shortcutStatus: launcherState.note,
    desktopCapture: true,
    capturedDisplay: screenSize,
    selection: true,
    editor: true,
    cropSize: editorState.base,
    penPixels: ink,
    eraserPixels: inkAfterErase,
    blurPixels: effectPixels,
    zoom: true,
    formats: editorState.formats
  }, null, 2));

  await evaluate(editorClient, `window.wxDesktop.quitApp()`);
  launcherClient.close(); selectorClient.close(); editorClient.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
