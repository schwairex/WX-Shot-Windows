(function exposeCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.WXCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, () => {
  "use strict";

  function normalizeRect(a, b) {
    return {
      x: Math.min(a.x, b.x),
      y: Math.min(a.y, b.y),
      width: Math.abs(a.x - b.x),
      height: Math.abs(a.y - b.y)
    };
  }

  function clampRect(rect, width, height) {
    const x = Math.max(0, Math.min(width, rect.x));
    const y = Math.max(0, Math.min(height, rect.y));
    return {
      x,
      y,
      width: Math.max(0, Math.min(width - x, rect.width)),
      height: Math.max(0, Math.min(height - y, rect.height))
    };
  }

  function distance(a, b) {
    return Math.hypot(b.x - a.x, b.y - a.y);
  }

  function midpoint(a, b) {
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  }

  function simplifyStrokePoints(points, tolerance) {
    if (points.length <= 2) return points.slice();
    const simplified = [points[0]];
    let previous = points[0];
    for (let index = 1; index < points.length - 1; index += 1) {
      if (distance(previous, points[index]) >= tolerance) {
        simplified.push(points[index]);
        previous = points[index];
      }
    }
    simplified.push(points.at(-1));
    return simplified;
  }

  function constrainedEnd(start, end, tool) {
    const deltaX = end.x - start.x;
    const deltaY = end.y - start.y;
    if (tool === "rect" || tool === "ellipse") {
      const size = Math.max(Math.abs(deltaX), Math.abs(deltaY));
      return { x: start.x + Math.sign(deltaX || 1) * size, y: start.y + Math.sign(deltaY || 1) * size };
    }
    if (tool === "line" || tool === "arrow") {
      const radius = Math.hypot(deltaX, deltaY);
      const angle = Math.round(Math.atan2(deltaY, deltaX) / (Math.PI / 4)) * (Math.PI / 4);
      return { x: start.x + Math.cos(angle) * radius, y: start.y + Math.sin(angle) * radius };
    }
    return { ...end };
  }

  function fitDrawingSurface(width, height) {
    const maxEdge = 3200;
    const maxPixels = 8_000_000;
    const scale = Math.min(1, maxEdge / Math.max(width, height), Math.sqrt(maxPixels / (width * height)));
    return {
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
      scale
    };
  }

  function isSensitiveText(value) {
    return /[\w.+-]+@[\w.-]+\.[a-z]{2,}|(?:\+?\d[\d\s().-]{8,}\d)|(?:\d[ -]*?){13,19}/i.test(value);
  }

  function dedupeRegions(regions) {
    const unique = [];
    for (const region of regions) {
      const valid = region && [region.x, region.y, region.width, region.height].every(Number.isFinite) && region.width > 0 && region.height > 0;
      if (!valid) continue;
      const duplicate = unique.some((item) => {
        const overlapWidth = Math.max(0, Math.min(item.x + item.width, region.x + region.width) - Math.max(item.x, region.x));
        const overlapHeight = Math.max(0, Math.min(item.y + item.height, region.y + region.height) - Math.max(item.y, region.y));
        return overlapWidth * overlapHeight > Math.min(item.width * item.height, region.width * region.height) * 0.72;
      });
      if (!duplicate) unique.push(region);
    }
    return unique;
  }

  return { normalizeRect, clampRect, distance, midpoint, simplifyStrokePoints, constrainedEnd, fitDrawingSurface, isSensitiveText, dedupeRegions };
});
