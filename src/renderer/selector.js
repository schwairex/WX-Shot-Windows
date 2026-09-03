"use strict";

const screenImage = document.querySelector(".screen");
const shade = document.querySelector(".shade");
const selection = document.querySelector(".selection");
const sizeLabel = document.querySelector(".size");
let screenshotDataUrl = "";
let captureWidth = innerWidth;
let captureHeight = innerHeight;
let start = null;
let current = null;
let completing = false;

window.wxDesktop.onSelectionData(({ dataUrl, display }) => {
  screenshotDataUrl = dataUrl;
  captureWidth = Math.max(1, display?.bounds?.width ?? innerWidth);
  captureHeight = Math.max(1, display?.bounds?.height ?? innerHeight);
  screenImage.style.width = `${captureWidth}px`;
  screenImage.style.height = `${captureHeight}px`;
  shade.style.width = `${captureWidth}px`;
  shade.style.height = `${captureHeight}px`;
  screenImage.src = dataUrl;
  document.body.focus();
});

function viewportPoint(event) {
  return { x: Math.max(0, Math.min(captureWidth, event.clientX)), y: Math.max(0, Math.min(captureHeight, event.clientY)) };
}

function renderSelection() {
  if (!start || !current) return;
  const rect = window.WXCore.normalizeRect(start, current);
  selection.hidden = false;
  selection.style.left = `${rect.x}px`;
  selection.style.top = `${rect.y}px`;
  selection.style.width = `${rect.width}px`;
  selection.style.height = `${rect.height}px`;
  sizeLabel.textContent = `${Math.round(rect.width)} × ${Math.round(rect.height)}`;
}

addEventListener("pointerdown", (event) => {
  if (event.button !== 0 || completing) return;
  shade.style.display = "none";
  start = viewportPoint(event);
  current = start;
  document.body.setPointerCapture(event.pointerId);
  renderSelection();
});

addEventListener("pointermove", (event) => {
  if (!start || completing) return;
  current = viewportPoint(event);
  renderSelection();
});

addEventListener("pointerup", async (event) => {
  if (!start || completing) return;
  current = viewportPoint(event);
  const rect = window.WXCore.normalizeRect(start, current);
  start = null;
  if (rect.width < 8 || rect.height < 8) {
    selection.hidden = true;
    shade.style.display = "block";
    return;
  }
  await finish(rect);
});

addEventListener("keydown", async (event) => {
  if (event.key === "Escape") await window.wxDesktop.selectionCancel();
  if (event.key === "Enter") await finish({ x: 0, y: 0, width: captureWidth, height: captureHeight });
});

async function finish(rect) {
  if (completing || !screenshotDataUrl) return;
  completing = true;
  try {
    const image = await loadImage(screenshotDataUrl);
    const scaleX = image.naturalWidth / captureWidth;
    const scaleY = image.naturalHeight / captureHeight;
    const source = window.WXCore.clampRect({
      x: Math.round(rect.x * scaleX),
      y: Math.round(rect.y * scaleY),
      width: Math.round(rect.width * scaleX),
      height: Math.round(rect.height * scaleY)
    }, image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(source.width));
    canvas.height = Math.max(1, Math.round(source.height));
    canvas.getContext("2d").drawImage(image, source.x, source.y, source.width, source.height, 0, 0, canvas.width, canvas.height);
    await window.wxDesktop.selectionComplete(canvas.toDataURL("image/png"));
  } catch {
    completing = false;
  }
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}
