import test from "node:test";
import assert from "node:assert/strict";
import { benchmaxx, meridianDawnPreset } from "../dist/index.js";

const THEMES = ["launch", "paper", "terminal"];

function panelsOpts(theme) {
  const config = meridianDawnPreset();
  config.theme = theme;
  return config;
}

function ogOpts(theme) {
  const config = meridianDawnPreset();
  config.theme = theme;
  config.layout = "og";
  config.benchmarks = config.benchmarks.slice(0, 3);
  return config;
}

function hexes(svg) {
  return [...svg.matchAll(/#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})(?![0-9a-fA-F])/g)].map((m) => m[0]);
}

function isGray(hex) {
  let h = hex.slice(1).toLowerCase();
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  return h.slice(0, 2) === h.slice(2, 4) && h.slice(2, 4) === h.slice(4, 6);
}

for (const theme of THEMES) {
  test(`${theme} panels render deterministically`, () => {
    assert.equal(benchmaxx(panelsOpts(theme)), benchmaxx(panelsOpts(theme)));
  });

  test(`${theme} og renders deterministically`, () => {
    assert.equal(benchmaxx(ogOpts(theme)), benchmaxx(ogOpts(theme)));
  });
}

test("default theme is launch", () => {
  const config = meridianDawnPreset();
  assert.equal(benchmaxx(config), benchmaxx({ ...meridianDawnPreset(), theme: "launch" }));
});

test("launch keeps the current look", () => {
  const svg = benchmaxx(panelsOpts("launch"));
  assert.match(svg, /#ffffff/i);
  assert.match(svg, /#2563eb/i);
  assert.match(svg, /#fafaf9/i);
});

test("paper hero is solid black and output has no hue", () => {
  for (const opts of [panelsOpts("paper"), ogOpts("paper")]) {
    const svg = benchmaxx(opts);
    assert.match(svg, /#111/i);
    assert.match(svg, /fill="#111111"/i);
    assert.doesNotMatch(svg, /#2563eb/i);
    assert.doesNotMatch(svg, /#10b981/i);
    for (const hex of hexes(svg)) {
      assert.ok(isGray(hex), `paper output must be gray-balanced, found ${hex}`);
    }
  }
});

test("explicit color overrides beat the theme", () => {
  const panels = benchmaxx({ ...panelsOpts("paper"), highlightColor: "#ff6600" });
  assert.match(panels, /#ff6600/i);

  const bg = benchmaxx({ ...panelsOpts("terminal"), background: "#123456" });
  assert.match(bg, /#123456/i);
  assert.doesNotMatch(bg, /#09090b/i);

  const og = benchmaxx({ ...ogOpts("terminal"), highlightColor: "#ff6600" });
  assert.match(og, /#ff6600/i);
  assert.doesNotMatch(og, /#10b981/i);
});

test("terminal background is present in both layouts", () => {
  assert.match(benchmaxx(panelsOpts("terminal")), /#09090b/i);
  assert.match(benchmaxx(ogOpts("terminal")), /#09090b/i);
  assert.match(benchmaxx(panelsOpts("terminal")), /#10b981/i);
});

test("visualBias stays orthogonal to theme", () => {
  const honest = benchmaxx({ ...panelsOpts("terminal"), visualBias: "honest" });
  const startup = benchmaxx({ ...panelsOpts("terminal"), visualBias: "startup" });
  assert.match(honest, /#09090b/i);
  assert.match(startup, /#09090b/i);
  assert.notEqual(honest, startup);
});

test("unknown theme throws benchmaxxing:", () => {
  assert.throws(() => benchmaxx({ ...panelsOpts("mauve") }), (err) => err.message.startsWith("benchmaxxing: "));
});
