import test from "node:test";
import assert from "node:assert/strict";
import { benchmaxx, meridianDawnPreset } from "../dist/index.js";

test("preset renders deterministically", () => {
  const config = meridianDawnPreset();
  const a = benchmaxx(config);
  const b = benchmaxx(config);
  assert.equal(a, b);
  assert.match(a, /BulshitBench/);
  assert.match(a, /BenchMaxxing\.lol/);
  assert.match(a, /SATIRE · SYNTHETIC SCORES/);
  assert.doesNotMatch(a, /NaN/);
});

test("panels carry y-axis ticks", () => {
  const svg = benchmaxx(meridianDawnPreset());
  assert.match(svg, /text-anchor="end" font-size="9.5"/);
});

test("renderer escapes labels", () => {
  const config = meridianDawnPreset();
  config.title = `<script>alert("x")</script>`;
  const svg = benchmaxx(config);
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;/);
});

test("renderer rejects missing scores", () => {
  const config = meridianDawnPreset();
  delete config.benchmarks[0].scores.meridian;
  assert.throws(() => benchmaxx(config), /missing score/);
});
