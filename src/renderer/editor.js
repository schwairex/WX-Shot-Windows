"use strict";

const palette = ["#ff3b5c", "#ffb020", "#34d399", "#38bdf8", "#ffffff", "#111827"];
const base = document.querySelector(".base");
const effects = document.querySelector(".effects");
const draw = document.querySelector(".draw");
const preview = document.querySelector(".preview");
const workspace = document.querySelector(".workspace");
const stage = document.querySelector(".canvas-stage");
const toast = document.querySelector(".toast");
const baseCtx = base.getContext("2d");
const effectsCtx = effects.getContext("2d", { alpha: true, desynchronized: true });
const drawCtx = draw.getContext("2d", { alpha: true, desynchronized: true });
const previewCtx = preview.getContext("2d", { alpha: true, desynchronized: true });
const actions = [];
const redoStack = [];
const freehandTools = new Set(["pen", "highlight", "eraser"]);
const effectTools = new Set(["blur", "pixelate"]);

let tool = "pen";
let color = palette[0];
let lineWidth = 5;
let activeAction = null;
let animationFrame = 0;
let imageReady = false;
let zoom = 1;
let fitWidth = 1;
let fitHeight = 1;
let spacePressed = false;
let panState = null;
let historySaved = false;
let sourceId = crypto.randomUUID();
const styleState = { opacity: 1, fill: false, dashed: false, shadow: false, arrowHead: "classic" };

document.querySelector(".colors").innerHTML = palette.map((item, index) => `<button class="color ${index === 0 ? "active" : ""}" data-color="${item}" style="--color:${item}" aria-label="${item}"></button>`).join("");

window.wxDesktop.onEditorData(async ({ dataUrl }) => {
  try {
    await initializeImage(dataUrl);
  } catch (error) {
    showToast(`Görüntü açılamadı: ${error.message}`, "error");
  }
});

async function initializeImage(dataUrl) {
  const image = await loadImage(dataUrl);
  const surface = window.WXCore.fitDrawingSurface(image.naturalWidth, image.naturalHeight);
  base.width = image.naturalWidth;
  base.height = image.naturalHeight;
  effects.width = draw.width = preview.width = surface.width;
  effects.height = draw.height = preview.height = surface.height;
  baseCtx.drawImage(image, 0, 0);
  document.querySelector(".image-info").textContent = `${base.width} × ${base.height} px`;
  imageReady = true;
  actions.length = 0;
  redoStack.length = 0;
  historySaved = false;
  sourceId = crypto.randomUUID();
  updateHistoryButtons();
  requestAnimationFrame(fitImage);
}

function fitImage() {
  const availableWidth = Math.max(160, workspace.clientWidth - 56);
  const availableHeight = Math.max(120, workspace.clientHeight - 56);
  const fitScale = Math.min(1, availableWidth / base.width, availableHeight / base.height);
  fitWidth = Math.max(1, Math.round(base.width * fitScale));
  fitHeight = Math.max(1, Math.round(base.height * fitScale));
  applyZoom(1);
}

function applyZoom(next) {
  zoom = Math.max(0.25, Math.min(4, next));
  stage.style.width = `${fitWidth * zoom}px`;
  stage.style.height = `${fitHeight * zoom}px`;
  document.querySelector(".zoom-value").textContent = `${Math.round(zoom * 100)}%`;
}

document.querySelector(".zoom-in").addEventListener("click", () => applyZoom(zoom * 1.25));
document.querySelector(".zoom-out").addEventListener("click", () => applyZoom(zoom / 1.25));
document.querySelector(".zoom-value").addEventListener("click", () => applyZoom(1));
workspace.addEventListener("wheel", (event) => {
  if (!event.ctrlKey && !event.metaKey) return;
  event.preventDefault();
  applyZoom(zoom * (event.deltaY < 0 ? 1.12 : 0.89));
}, { passive: false });

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => selectTool(button.dataset.tool));
});

function selectTool(nextTool) {
  tool = nextTool;
  document.querySelectorAll("[data-tool]").forEach((button) => {
    const active = button.dataset.tool === tool;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
  preview.dataset.cursor = tool;
}

document.querySelectorAll("[data-color]").forEach((button) => {
  button.addEventListener("click", () => {
    document.querySelectorAll("[data-color]").forEach((item) => item.classList.remove("active"));
    button.classList.add("active");
    color = button.dataset.color;
  });
});

document.querySelector(".width-input").addEventListener("input", (event) => { lineWidth = Number(event.target.value); });
document.querySelector(".style-opacity").addEventListener("input", (event) => { styleState.opacity = Number(event.target.value) / 100; });
document.querySelector(".style-fill").addEventListener("change", (event) => { styleState.fill = event.target.checked; });
document.querySelector(".style-dashed").addEventListener("change", (event) => { styleState.dashed = event.target.checked; });
document.querySelector(".style-shadow").addEventListener("change", (event) => { styleState.shadow = event.target.checked; });
document.querySelector(".arrow-head").addEventListener("change", (event) => { styleState.arrowHead = event.target.value; });

const stylePanel = document.querySelector(".style-panel");
const historyPanel = document.querySelector(".history-panel");
document.querySelector(".style-toggle").addEventListener("click", () => {
  stylePanel.hidden = !stylePanel.hidden;
  historyPanel.hidden = true;
});
document.querySelector(".history-toggle").addEventListener("click", async () => {
  historyPanel.hidden = !historyPanel.hidden;
  stylePanel.hidden = true;
  if (!historyPanel.hidden) await renderHistory();
});

preview.addEventListener("pointerdown", (event) => {
  if (!imageReady) return;
  if (event.button === 1 || spacePressed) {
    event.preventDefault();
    panState = { x: event.clientX, y: event.clientY, left: workspace.scrollLeft, top: workspace.scrollTop };
    preview.setPointerCapture(event.pointerId);
    stage.classList.add("panning");
    return;
  }
  if (event.button !== 0) return;
  event.preventDefault();
  const point = canvasPoint(event, preview);
  point.pressure = normalizedPressure(event);
  if (tool === "text") {
    showTextInput(point);
    return;
  }
  activeAction = {
    tool,
    color,
    width: lineWidth,
    start: point,
    end: point,
    points: [point],
    pointerType: event.pointerType,
    renderedIndex: 0,
    style: { ...styleState }
  };
  previewCtx.clearRect(0, 0, preview.width, preview.height);
  if (tool === "eraser") {
    previewCtx.drawImage(draw, 0, 0);
    draw.style.visibility = "hidden";
  }
  preview.setPointerCapture(event.pointerId);
  scheduleActivePaint();
});

preview.addEventListener("pointermove", (event) => {
  if (panState) {
    workspace.scrollLeft = panState.left - (event.clientX - panState.x);
    workspace.scrollTop = panState.top - (event.clientY - panState.y);
    return;
  }
  if (!activeAction) return;
  event.preventDefault();
  const samples = typeof event.getCoalescedEvents === "function" ? event.getCoalescedEvents() : [event];
  for (const sample of samples) {
    const point = canvasPoint(sample, preview);
    point.pressure = normalizedPressure(sample);
    const last = activeAction.points.at(-1);
    if (!last || window.WXCore.distance(last, point) >= 0.35) activeAction.points.push(point);
  }
  const rawEnd = activeAction.points.at(-1) ?? canvasPoint(event, preview);
  activeAction.end = event.shiftKey ? window.WXCore.constrainedEnd(activeAction.start, rawEnd, activeAction.tool) : rawEnd;
  scheduleActivePaint();
});

function scheduleActivePaint() {
  if (!animationFrame) animationFrame = requestAnimationFrame(paintActiveAction);
}

function paintActiveAction() {
  animationFrame = 0;
  if (!activeAction) return;
  if (freehandTools.has(activeAction.tool)) {
    drawFreehandIncrement(previewCtx, activeAction);
    return;
  }
  previewCtx.clearRect(0, 0, preview.width, preview.height);
  drawAction(previewCtx, activeAction);
}

function finishAction(event) {
  if (panState) {
    panState = null;
    stage.classList.remove("panning");
    releasePointer(event);
    return;
  }
  if (!activeAction) return;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  const completed = { ...activeAction };
  delete completed.renderedIndex;
  if (freehandTools.has(completed.tool)) completed.points = window.WXCore.simplifyStrokePoints(completed.points, Math.max(0.45, completed.width * 0.1));
  if (effectTools.has(completed.tool)) renderEffect(effectsCtx, base, completed);
  else drawAction(drawCtx, completed);
  actions.push(completed);
  activeAction = null;
  redoStack.length = 0;
  draw.style.visibility = "visible";
  previewCtx.clearRect(0, 0, preview.width, preview.height);
  updateHistoryButtons();
  releasePointer(event);
}

function releasePointer(event) {
  if (event?.pointerId != null && preview.hasPointerCapture(event.pointerId)) preview.releasePointerCapture(event.pointerId);
}

preview.addEventListener("pointerup", finishAction);
preview.addEventListener("pointercancel", finishAction);

function updateHistoryButtons() {
  document.querySelector(".undo").disabled = actions.length === 0;
  document.querySelector(".redo").disabled = redoStack.length === 0;
}

function renderCommitted() {
  drawCtx.clearRect(0, 0, draw.width, draw.height);
  effectsCtx.clearRect(0, 0, effects.width, effects.height);
  for (const action of actions) {
    if (effectTools.has(action.tool)) renderEffect(effectsCtx, base, action);
    else drawAction(drawCtx, action);
  }
  updateHistoryButtons();
}

document.querySelector(".undo").addEventListener("click", () => {
  const action = actions.pop();
  if (action) redoStack.push(action);
  renderCommitted();
});
document.querySelector(".redo").addEventListener("click", () => {
  const action = redoStack.pop();
  if (action) actions.push(action);
  renderCommitted();
});

function drawAction(ctx, action) {
  ctx.save();
  applyActionStyle(ctx, action);
  if (freehandTools.has(action.tool)) {
    drawSmoothStroke(ctx, action);
  } else if (action.tool === "line") {
    ctx.beginPath(); ctx.moveTo(action.start.x, action.start.y); ctx.lineTo(action.end.x, action.end.y); ctx.stroke();
  } else if (action.tool === "rect") {
    const width = action.end.x - action.start.x;
    const height = action.end.y - action.start.y;
    if (action.style?.fill) { ctx.save(); ctx.globalAlpha *= 0.2; ctx.fillRect(action.start.x, action.start.y, width, height); ctx.restore(); }
    ctx.strokeRect(action.start.x, action.start.y, width, height);
  } else if (action.tool === "ellipse") {
    const centerX = (action.start.x + action.end.x) / 2;
    const centerY = (action.start.y + action.end.y) / 2;
    ctx.beginPath();
    ctx.ellipse(centerX, centerY, Math.max(0.5, Math.abs(action.end.x - action.start.x) / 2), Math.max(0.5, Math.abs(action.end.y - action.start.y) / 2), 0, 0, Math.PI * 2);
    if (action.style?.fill) { ctx.save(); ctx.globalAlpha *= 0.2; ctx.fill(); ctx.restore(); }
    ctx.stroke();
  } else if (action.tool === "arrow") {
    drawArrow(ctx, action.start, action.end, action.width, action.style?.arrowHead);
  } else if (effectTools.has(action.tool)) {
    ctx.save(); ctx.setLineDash([8, 6]); ctx.strokeStyle = "#fff"; ctx.fillStyle = "#6366f133";
    ctx.fillRect(action.start.x, action.start.y, action.end.x - action.start.x, action.end.y - action.start.y);
    ctx.strokeRect(action.start.x, action.start.y, action.end.x - action.start.x, action.end.y - action.start.y); ctx.restore();
  } else if (action.tool === "text") {
    ctx.font = `700 ${Math.max(18, action.width * 5)}px Inter, Arial, sans-serif`;
    ctx.textBaseline = "top"; ctx.fillText(action.text, action.start.x, action.start.y);
  }
  ctx.restore();
}

function applyActionStyle(ctx, action) {
  ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.strokeStyle = action.color; ctx.fillStyle = action.color;
  ctx.lineWidth = action.width; ctx.globalAlpha = action.style?.opacity ?? 1;
  if (action.style?.dashed) ctx.setLineDash([Math.max(4, action.width * 2.2), Math.max(3, action.width * 1.4)]);
  if (action.style?.shadow) { ctx.shadowColor = "#0009"; ctx.shadowBlur = Math.max(4, action.width * 2); ctx.shadowOffsetY = Math.max(1, action.width * 0.5); }
  if (action.tool === "eraser") { ctx.globalCompositeOperation = "destination-out"; ctx.lineWidth = action.width * 2.4; }
  if (action.tool === "highlight") { ctx.globalAlpha = (action.style?.opacity ?? 1) * 0.34; ctx.lineWidth = action.width * 3; }
}

function drawSmoothStroke(ctx, action) {
  const points = action.points ?? [];
  if (!points.length) return;
  if (points.length === 1) {
    const pressure = action.pointerType === "pen" ? 0.72 + points[0].pressure * 0.7 : 1;
    ctx.beginPath(); ctx.arc(points[0].x, points[0].y, ctx.lineWidth * pressure / 2, 0, Math.PI * 2); ctx.fill(); return;
  }
  if (action.tool === "pen" && action.pointerType === "pen") {
    for (let index = 1; index < points.length; index += 1) {
      const previousPrevious = points[Math.max(0, index - 2)];
      const previous = points[index - 1];
      const current = points[index];
      const start = index === 1 ? previous : window.WXCore.midpoint(previousPrevious, previous);
      const end = index === points.length - 1 ? current : window.WXCore.midpoint(previous, current);
      ctx.lineWidth = action.width * (0.72 + ((previous.pressure + current.pressure) / 2) * 0.7);
      ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.quadraticCurveTo(previous.x, previous.y, end.x, end.y); ctx.stroke();
    }
    return;
  }
  ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length - 1; index += 1) {
    const middle = window.WXCore.midpoint(points[index], points[index + 1]);
    ctx.quadraticCurveTo(points[index].x, points[index].y, middle.x, middle.y);
  }
  ctx.lineTo(points.at(-1).x, points.at(-1).y); ctx.stroke();
}

function drawFreehandIncrement(ctx, action) {
  const points = action.points;
  if (!points.length) return;
  const startIndex = Math.max(1, action.renderedIndex || 1);
  ctx.save(); applyActionStyle(ctx, action);
  if (!action.renderedIndex) {
    const pressure = action.pointerType === "pen" ? 0.72 + points[0].pressure * 0.7 : 1;
    ctx.beginPath(); ctx.arc(points[0].x, points[0].y, ctx.lineWidth * pressure / 2, 0, Math.PI * 2); ctx.fill();
  }
  for (let index = startIndex; index < points.length; index += 1) {
    const previous = points[index - 1]; const current = points[index];
    if (action.tool === "pen" && action.pointerType === "pen") ctx.lineWidth = action.width * (0.72 + ((previous.pressure + current.pressure) / 2) * 0.7);
    ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(current.x, current.y); ctx.stroke();
  }
  action.renderedIndex = points.length; ctx.restore();
}

function drawArrow(ctx, start, end, width, headStyle = "classic") {
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  const head = Math.max(12, width * 4);
  ctx.beginPath(); ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y); ctx.stroke();
  if (headStyle === "dot") { ctx.beginPath(); ctx.arc(end.x, end.y, Math.max(4, width * 1.8), 0, Math.PI * 2); ctx.fill(); return; }
  drawArrowHead(ctx, end, angle, head);
  if (headStyle === "double") drawArrowHead(ctx, start, angle + Math.PI, head);
}

function drawArrowHead(ctx, tip, angle, size) {
  ctx.beginPath();
  ctx.moveTo(tip.x - size * Math.cos(angle - Math.PI / 6), tip.y - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(tip.x, tip.y);
  ctx.lineTo(tip.x - size * Math.cos(angle + Math.PI / 6), tip.y - size * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

function renderEffect(ctx, source, action) {
  const x = Math.min(action.start.x, action.end.x); const y = Math.min(action.start.y, action.end.y);
  const width = Math.abs(action.end.x - action.start.x); const height = Math.abs(action.end.y - action.start.y);
  if (width < 1 || height < 1) return;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, width, height); ctx.clip();
  if (action.tool === "blur") {
    ctx.filter = `blur(${Math.max(5, action.width * 1.8)}px)`;
    ctx.drawImage(source, 0, 0, ctx.canvas.width, ctx.canvas.height);
  } else {
    const blockSize = Math.max(6, Math.round(action.width * 2.4));
    const tiny = document.createElement("canvas");
    tiny.width = Math.max(1, Math.ceil(width / blockSize)); tiny.height = Math.max(1, Math.ceil(height / blockSize));
    const ratioX = source.width / ctx.canvas.width; const ratioY = source.height / ctx.canvas.height;
    tiny.getContext("2d").drawImage(source, x * ratioX, y * ratioY, width * ratioX, height * ratioY, 0, 0, tiny.width, tiny.height);
    ctx.imageSmoothingEnabled = false; ctx.drawImage(tiny, 0, 0, tiny.width, tiny.height, x, y, width, height);
  }
  ctx.restore();
}

function showTextInput(point) {
  stage.querySelector(".text-entry")?.remove();
  const canvasRect = preview.getBoundingClientRect(); const stageRect = stage.getBoundingClientRect();
  const input = document.createElement("input");
  input.className = "text-entry"; input.placeholder = "Metni yazın…";
  input.style.left = `${canvasRect.left - stageRect.left + point.x / preview.width * canvasRect.width}px`;
  input.style.top = `${canvasRect.top - stageRect.top + point.y / preview.height * canvasRect.height}px`;
  input.style.color = color; input.style.fontSize = `${Math.max(15, lineWidth * 3)}px`;
  stage.appendChild(input); input.focus();
  let committed = false;
  const commit = () => {
    if (committed) return; committed = true;
    if (input.value.trim()) {
      const action = { tool: "text", color, width: lineWidth, start: point, text: input.value.trim(), style: { ...styleState } };
      actions.push(action); redoStack.length = 0; drawAction(drawCtx, action); updateHistoryButtons();
    }
    input.remove();
  };
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") commit();
    if (event.key === "Escape") { committed = true; input.remove(); }
  });
  input.addEventListener("blur", commit);
}

document.querySelector(".smart-redact").addEventListener("click", async (event) => {
  if (!imageReady) return;
  const button = event.currentTarget; button.disabled = true; showToast("Windows OCR metni tarıyor…", "success");
  try {
    const result = await window.wxDesktop.recognizeText(base.toDataURL("image/png"));
    const candidates = (result.regions ?? []).filter((item) => window.WXCore.isSensitiveText(item.text ?? "")).map((item) => ({
      x: item.x / item.imageWidth, y: item.y / item.imageHeight, width: item.width / item.imageWidth, height: item.height / item.imageHeight
    }));
    const regions = window.WXCore.dedupeRegions(candidates);
    if (!regions.length) {
      showToast(result.available ? "Hassas bilgi bulunamadı" : "Windows OCR kullanılamadı; manuel gizleme araçlarını kullanın", "error");
      return;
    }
    for (const region of regions) {
      actions.push({
        tool: "pixelate", color, width: Math.max(8, lineWidth),
        start: { x: region.x * effects.width, y: region.y * effects.height },
        end: { x: (region.x + region.width) * effects.width, y: (region.y + region.height) * effects.height },
        points: [], style: { ...styleState }
      });
    }
    redoStack.length = 0; renderCommitted(); showToast(`${regions.length} hassas satır gizlendi`, "success");
  } finally { button.disabled = false; }
});

document.querySelector(".copy").addEventListener("click", async () => {
  if (!imageReady) return;
  try {
    const dataUrl = await exportDataUrl("image/png", 1, 1);
    await window.wxDesktop.copyImage(dataUrl); await rememberCapture(); showToast("Panoya kopyalandı", "success");
  } catch (error) { showToast(`Kopyalanamadı: ${error.message}`, "error"); }
});

document.querySelector(".save").addEventListener("click", async () => {
  if (!imageReady) return;
  const format = document.querySelector(".format-select").value;
  const mime = `image/${format}`;
  const exportScale = Number(document.querySelector(".scale-select").value);
  const quality = Number(document.querySelector(".export-quality").value) / 100;
  try {
    const dataUrl = await exportDataUrl(mime, quality, exportScale);
    const result = await window.wxDesktop.saveImage({ dataUrl, mime });
    if (result.ok) { await rememberCapture(); showToast("Görüntü kaydedildi", "success"); }
  } catch (error) { showToast(`Kaydedilemedi: ${error.message}`, "error"); }
});

async function exportDataUrl(mime, quality, scale) {
  const output = document.createElement("canvas");
  output.width = Math.max(1, Math.round(base.width * scale)); output.height = Math.max(1, Math.round(base.height * scale));
  const ctx = output.getContext("2d");
  if (mime === "image/jpeg") { ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, output.width, output.height); }
  ctx.drawImage(base, 0, 0, output.width, output.height);
  ctx.drawImage(effects, 0, 0, output.width, output.height);
  ctx.drawImage(draw, 0, 0, output.width, output.height);
  return output.toDataURL(mime, quality);
}

async function rememberCapture() {
  if (historySaved) return;
  const dataUrl = await createHistoryPreview();
  await window.wxDesktop.addHistory({ id: sourceId, createdAt: Date.now(), width: base.width, height: base.height, dataUrl });
  historySaved = true;
}

async function createHistoryPreview() {
  const scale = Math.min(1, 1280 / Math.max(base.width, base.height));
  const output = document.createElement("canvas");
  output.width = Math.max(1, Math.round(base.width * scale)); output.height = Math.max(1, Math.round(base.height * scale));
  const ctx = output.getContext("2d");
  ctx.drawImage(base, 0, 0, output.width, output.height); ctx.drawImage(effects, 0, 0, output.width, output.height); ctx.drawImage(draw, 0, 0, output.width, output.height);
  return output.toDataURL("image/jpeg", 0.76);
}

async function renderHistory() {
  const list = document.querySelector(".history-list");
  const history = await window.wxDesktop.listHistory(); list.replaceChildren();
  if (!history.length) { const empty = document.createElement("div"); empty.className = "history-empty"; empty.textContent = "Henüz kayıt yok"; list.appendChild(empty); return; }
  for (const entry of history) {
    const button = document.createElement("button"); button.className = "history-item";
    const image = document.createElement("img"); image.src = entry.dataUrl; image.alt = "";
    const label = document.createElement("span"); label.textContent = new Date(entry.createdAt).toLocaleString("tr-TR");
    button.append(image, label); button.addEventListener("click", () => window.wxDesktop.openHistoryItem(entry.id)); list.appendChild(button);
  }
}

document.querySelector(".clear-history").addEventListener("click", async () => { await window.wxDesktop.clearHistory(); await renderHistory(); });
document.querySelector(".close").addEventListener("click", () => window.wxDesktop.closeWindow());
document.querySelector(".minimize").addEventListener("click", () => window.wxDesktop.minimizeWindow());

addEventListener("keydown", (event) => {
  const editing = event.target.matches("input,select");
  if (event.key === "Escape") { if (!stylePanel.hidden || !historyPanel.hidden) { stylePanel.hidden = historyPanel.hidden = true; } else window.wxDesktop.closeWindow(); }
  if (event.code === "Space" && !editing) { event.preventDefault(); spacePressed = true; stage.classList.add("pan-ready"); }
  const modifier = event.ctrlKey || event.metaKey;
  if (modifier && event.key.toLowerCase() === "z") { event.preventDefault(); document.querySelector(event.shiftKey ? ".redo" : ".undo").click(); }
  if (!modifier && !event.altKey && !editing) {
    const shortcut = { p: "pen", h: "highlight", l: "line", a: "arrow", r: "rect", o: "ellipse", b: "blur", x: "pixelate", t: "text", e: "eraser" }[event.key.toLowerCase()];
    if (shortcut) selectTool(shortcut);
  }
});
addEventListener("keyup", (event) => { if (event.code === "Space") { spacePressed = false; stage.classList.remove("pan-ready"); } });
addEventListener("resize", () => { if (imageReady && zoom === 1) fitImage(); });

function canvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return { x: (event.clientX - rect.left) * canvas.width / rect.width, y: (event.clientY - rect.top) * canvas.height / rect.height };
}

function normalizedPressure(event) {
  if (event.pointerType !== "pen") return 0.5;
  return Math.max(0.05, Math.min(1, event.pressure || 0.5));
}

function loadImage(src) {
  return new Promise((resolve, reject) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error("Geçersiz görüntü")); image.src = src; });
}

function showToast(message, type) {
  toast.textContent = message; toast.className = `toast show ${type}`;
  clearTimeout(showToast.timer); showToast.timer = setTimeout(() => { toast.className = "toast"; }, 2600);
}
