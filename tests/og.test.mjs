import test from "node:test";
import assert from "node:assert/strict";
import { benchmaxx, meridianDawnPreset } from "../dist/index.js";

function ogOpts(n = 3) {
  const names = ["Alpha", "Beta", "Gamma", "Delta", "Eps", "Zeta", "Eta"];
  return {
    title: "OG Test",
    subtitle: "sub",
    models: [
      { id: "a", label: "Alpha One", mark: "A" },
      { id: "b", label: "Beta Two", mark: "B" }
    ],
    highlight: "a",
    visualBias: "startup",
    satireLabel: "SATIRE · SYNTHETIC SCORES",
    footer: "tiny footer",
    benchmarks: names.slice(0, n).map((name) => ({
      name,
      scores: { a: 82.5, b: 61 },
      max: 100
    })),
    layout: "og"
  };
}

test("og layout is 1200x630", () => {
  const svg = benchmaxx(ogOpts());
  assert.match(svg, /width="1200" height="630"/);
  assert.match(svg, /viewBox="0 0 1200 630"/);
  assert.doesNotMatch(svg, /NaN/);
});

test("og renders one row-group per benchmark, all models as horizontal bars", () => {
  const svg = benchmaxx(ogOpts(3));
  const groups = svg.match(/data-benchmark="/g) ?? [];
  assert.equal(groups.length, 3);
  for (const name of ["Alpha", "Beta", "Gamma"]) {
    assert.match(svg, new RegExp(`data-benchmark="${name}"`));
  }
  // horizontal bars: bar rects wider than tall
  const bars = [...svg.matchAll(/<rect x="([\d.]+)" y="([\d.]+)" width="([\d.]+)" height="([\d.]+)"[^>]*fill="/g)]
    .filter((m) => Number(m[3]) > Number(m[4]));
  assert.ok(bars.length >= 3 * 2, `expected >=6 horizontal bars, got ${bars.length}`);
  // both model marks appear once per group
  assert.equal((svg.match(/>A</g) ?? []).length, 3);
  assert.equal((svg.match(/>B</g) ?? []).length, 3);
});

test("og rejects more than 6 benchmarks, suggesting --tasks", () => {
  assert.throws(() => benchmaxx(ogOpts(7)), /benchmaxxing: .*--tasks/);
});

test("og keeps title top-left and satireLabel", () => {
  const svg = benchmaxx(ogOpts());
  assert.match(svg, /<text x="48" y="58"[^>]*>OG Test<\/text>/);
  assert.match(svg, /SATIRE · SYNTHETIC SCORES/);
  assert.match(svg, /tiny footer/);
});

test("og is deterministic", () => {
  const opts = ogOpts(4);
  assert.equal(benchmaxx(opts), benchmaxx(opts));
});

test("og escapes labels", () => {
  const opts = ogOpts();
  opts.title = `<script>alert("x")</script>`;
  const svg = benchmaxx(opts);
  assert.doesNotMatch(svg, /<script>/);
  assert.match(svg, /&lt;script&gt;/);
});

test("og errors are prefixed benchmaxxing:", () => {
  const bad = ogOpts();
  bad.models = [];
  assert.throws(() => benchmaxx(bad), (err) => err.message.startsWith("benchmaxxing: "));
  const preset = meridianDawnPreset();
  preset.layout = "og";
  assert.throws(() => benchmaxx(preset), (err) => err.message.startsWith("benchmaxxing: "));
});

test("og carries ticks and value labels", () => {
  const svg = benchmaxx(ogOpts(2));
  assert.match(svg, /font-size="9"/); // tick labels
  assert.match(svg, /82\.5/); // interior/exterior value labels
});

test("panels default unaffected by og work", () => {
  const svg = benchmaxx(meridianDawnPreset());
  assert.doesNotMatch(svg, /height="630"/);
  assert.match(svg, /BulshitBench/);
});
