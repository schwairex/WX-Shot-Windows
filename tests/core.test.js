const test = require("node:test");
const assert = require("node:assert/strict");
const core = require("../src/shared/core.js");

test("normalizeRect handles reverse dragging", () => {
  assert.deepEqual(core.normalizeRect({ x: 50, y: 40 }, { x: 10, y: 15 }), { x: 10, y: 15, width: 40, height: 25 });
});

test("clampRect keeps selection inside the image", () => {
  assert.deepEqual(core.clampRect({ x: -2, y: 4, width: 20, height: 20 }, 12, 10), { x: 0, y: 4, width: 12, height: 6 });
});

test("constrainedEnd locks shapes and lines", () => {
  assert.deepEqual(core.constrainedEnd({ x: 0, y: 0 }, { x: 8, y: 3 }, "rect"), { x: 8, y: 8 });
  const line = core.constrainedEnd({ x: 0, y: 0 }, { x: 9, y: 2 }, "line");
  assert.ok(Math.abs(line.y) < 1e-9);
});

test("fitDrawingSurface caps oversized images", () => {
  const result = core.fitDrawingSurface(12000, 8000);
  assert.ok(result.width <= 3200 && result.height <= 3200);
  assert.ok(result.width * result.height <= 8_000_000);
});

test("sensitive text detection finds common private data", () => {
  assert.equal(core.isSensitiveText("mail: test@example.com"), true);
  assert.equal(core.isSensitiveText("+90 555 111 22 33"), true);
  assert.equal(core.isSensitiveText("ordinary label"), false);
});

test("dedupeRegions removes heavily overlapping regions", () => {
  const result = core.dedupeRegions([
    { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
    { x: 0.11, y: 0.1, width: 0.2, height: 0.1 },
    { x: 0.7, y: 0.7, width: 0.1, height: 0.1 }
  ]);
  assert.equal(result.length, 2);
});
