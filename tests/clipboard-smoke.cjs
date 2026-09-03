"use strict";

const { app, ClipboardItem, clipboard, nativeImage } = require("electron");

app.whenReady().then(() => {
  const methods = {
    write: typeof clipboard?.write,
    writeImage: typeof clipboard?.writeImage,
    clipboardItem: typeof ClipboardItem,
    read: typeof clipboard?.read
  };
  const image = nativeImage.createFromBuffer(Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+X2NDNwAAAABJRU5ErkJggg==",
    "base64"
  ));
  if (typeof ClipboardItem !== "function" || typeof clipboard?.write !== "function") {
    throw new Error("Electron pano görüntü yazma yöntemi bulunamadı.");
  }
  return clipboard.write([
    new ClipboardItem({
      "image/png": new Blob([image.toPNG()], { type: "image/png" })
    })
  ]).then(async () => {
    const items = await clipboard.read();
    const pngItem = items.find((item) => item.types.includes("image/png"));
    if (!pngItem) throw new Error("Panoya yazılan PNG görüntüsü bulunamadı.");
    const blob = await pngItem.getType("image/png");
    if (!blob.size) throw new Error("Panoya yazılan PNG görüntüsü boş.");
    console.log(JSON.stringify({ ok: true, methods, bytes: blob.size }));
  });
}).then(() => {
  app.quit();
}).catch((error) => {
  console.error(error);
  app.exit(1);
});
