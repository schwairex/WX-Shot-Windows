"use strict";

document.querySelectorAll("[data-mode]").forEach((button) => {
  button.addEventListener("click", async () => {
    button.disabled = true;
    try {
      if (button.dataset.mode === "display") await window.wxDesktop.captureDisplay();
      else await window.wxDesktop.captureArea();
    } finally {
      button.disabled = false;
    }
  });
});

document.querySelector(".history").addEventListener("click", async () => {
  const items = await window.wxDesktop.listHistory();
  if (items[0]) await window.wxDesktop.openHistoryItem(items[0].id);
});

window.wxDesktop.onAppState((state) => {
  document.querySelector(".version").textContent = `v${state.version}`;
  const note = document.querySelector(".shortcut-note");
  if (!state.shortcuts.printScreen) {
    note.className = "shortcut-note warning";
    note.textContent = "PrtSc Windows tarafından kullanılıyor. Alt + Shift + S kısayolu hazır.";
  } else {
    note.className = "shortcut-note";
    note.textContent = "PrtSc ve Alt + Shift + S kısayolları etkin.";
  }
});
