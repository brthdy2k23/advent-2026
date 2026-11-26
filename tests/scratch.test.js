import assert from "node:assert/strict";
import test from "node:test";
import { ScratchCoverage } from "../scripts/scratch.js";

test("one mark is partial and tracing the same stroke cannot complete the reveal", () => {
  const coverage = new ScratchCoverage(400, 240);
  const start = { x: 40, y: 60 };
  const end = { x: 360, y: 60 };
  const fraction = coverage.markStroke(start, end, 24);
  assert.ok(fraction > 0.1 && fraction < 0.3);
  assert.equal(coverage.markStroke(start, end, 24), fraction);
});

test("separate strokes across the card accumulate even when events are far apart", () => {
  const coverage = new ScratchCoverage(400, 240);
  assert.ok(coverage.markStroke({ x: 0, y: 42 }, { x: 400, y: 42 }, 24) < 0.42);
  assert.ok(coverage.markStroke({ x: 0, y: 120 }, { x: 400, y: 120 }, 24) < 0.42);
  assert.ok(coverage.markStroke({ x: 0, y: 196 }, { x: 400, y: 196 }, 24) > 0.42);
});

test("marking a point works at the edge even if pointer capture delivers coordinates outside", () => {
  const coverage = new ScratchCoverage(400, 240);
  assert.equal(coverage.markStroke({ x: -50, y: -50 }, { x: -50, y: -50 }, 24), 0);
  const edge = coverage.markStroke({ x: 0, y: 0 }, { x: 0, y: 0 }, 24);
  assert.ok(edge > 0 && edge < 0.04);
});
