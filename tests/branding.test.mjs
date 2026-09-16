import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import {
  loadConfig,
  defaultHighlight,
  themeColors,
  normalizeScores,
  filterByTasks,
  resolveValue,
  detectAdapterId,
} from "../dist/branding.js";

const REPO = new URL("..", import.meta.url).pathname;

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "bm-branding-"));
}

// --- loadConfig ---

test("loadConfig returns {} when no config file exists", () => {
  assert.deepEqual(loadConfig(tmpDir()), {});
});

test("loadConfig reads benchmaxx.config.json", () => {
  const dir = tmpDir();
  fs.writeFileSync(
    path.join(dir, "benchmaxx.config.json"),
    JSON.stringify({ title: "Hi", tasks: ["a"] }),
  );
  assert.deepEqual(loadConfig(dir), { title: "Hi", tasks: ["a"] });
});

test("loadConfig throws benchmaxxing: on malformed JSON", () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, "benchmaxx.config.json"), "{nope");
  assert.throws(() => loadConfig(dir), /benchmaxxing: /);
});

test("loadConfig throws benchmaxxing: on non-object JSON", () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, "benchmaxx.config.json"), "[1,2]");
  assert.throws(() => loadConfig(dir), /benchmaxxing: /);
});

// --- defaultHighlight ---

test("defaultHighlight picks the model with the highest mean score", () => {
  const bms = [
    { name: "a", scores: { x: 90, y: 50 } },
    { name: "b", scores: { x: 70, y: 60 } },
  ];
  assert.equal(defaultHighlight(bms), "x");
});

test("defaultHighlight is deterministic on ties", () => {
  const bms = [{ name: "a", scores: { bbb: 80, aaa: 80 } }];
  assert.equal(defaultHighlight(bms), defaultHighlight(bms));
  assert.equal(defaultHighlight(bms), "aaa");
});

test("defaultHighlight throws benchmaxxing: on empty input", () => {
  assert.throws(() => defaultHighlight([]), /benchmaxxing: /);
});

// --- themeColors ---

test("themeColors maps light and dark", () => {
  assert.deepEqual(themeColors("light"), {
    background: "#ffffff",
    foreground: "#111111",
    panelColor: "#f7f7f7",
  });
  const dark = themeColors("dark");
  assert.notEqual(dark.background, "#ffffff");
  assert.ok(dark.background && dark.foreground && dark.panelColor);
});

test("themeColors throws benchmaxxing: on unknown theme", () => {
  assert.throws(() => themeColors("sepia"), /benchmaxxing: /);
});

// --- normalizeScores ---

test("normalizeScores auto scales fractions, passes percents", () => {
  assert.deepEqual(normalizeScores({ a: 0.72, b: 72 }, "auto"), { a: 72, b: 72 });
  assert.deepEqual(normalizeScores({ a: 0.72 }, undefined), { a: 72 });
});

test("normalizeScores 1 forces x100, 100 passes through", () => {
  assert.deepEqual(normalizeScores({ a: 0.5 }, "1"), { a: 50 });
  assert.deepEqual(normalizeScores({ a: 0.5 }, "100"), { a: 0.5 });
});

test("normalizeScores throws benchmaxxing: on bad scale", () => {
  assert.throws(() => normalizeScores({ a: 1 }, "ten"), /benchmaxxing: /);
});

// --- filterByTasks ---

test("filterByTasks filters by name, empty filter is a passthrough", () => {
  const bms = [{ name: "a" }, { name: "b" }];
  assert.deepEqual(filterByTasks(bms, ["b"]), [{ name: "b" }]);
  assert.deepEqual(filterByTasks(bms, undefined), bms);
});

test("filterByTasks throws benchmaxxing: when nothing matches", () => {
  assert.throws(() => filterByTasks([{ name: "a" }], ["zzz"]), /benchmaxxing: /);
});

// --- resolveValue (CLI wins over config) ---

test("resolveValue prefers flag, then config, then fallback", () => {
  assert.equal(resolveValue("f", "c", "d"), "f");
  assert.equal(resolveValue(undefined, "c", "d"), "c");
  assert.equal(resolveValue(undefined, undefined, "d"), "d");
  assert.equal(resolveValue(undefined, undefined, undefined), undefined);
});

// --- detectAdapterId ---

test("detectAdapterId tries candidates in order", () => {
  const candidates = [
    { id: "lm-eval", detect: () => false },
    { id: "inspect", detect: () => true },
    { id: "csv", detect: () => true },
  ];
  assert.equal(detectAdapterId(candidates, {}), "inspect");
});

test("detectAdapterId throws benchmaxxing: when nothing matches", () => {
  assert.throws(
    () => detectAdapterId([{ id: "csv", detect: () => false }], {}),
    /benchmaxxing: /,
  );
});

// --- CLI end to end (legacy chart-config path, no adapters needed) ---

function runCli(...cliArgs) {
  return spawnSync("node", [path.join(REPO, "bin/benchmaxxing.mjs"), ...cliArgs], {
    encoding: "utf8",
  });
}

test("cli renders legacy chart config to a file, deterministically", () => {
  const dir = tmpDir();
  const out1 = path.join(dir, "one.svg");
  const out2 = path.join(dir, "two.svg");
  const r1 = runCli("--input", path.join(REPO, "examples/launch.json"), "--out", out1);
  assert.equal(r1.status, 0, r1.stderr);
  const r2 = runCli("--input", path.join(REPO, "examples/launch.json"), "--out", out2);
  assert.equal(r2.status, 0, r2.stderr);
  const a = fs.readFileSync(out1, "utf8");
  const b = fs.readFileSync(out2, "utf8");
  assert.equal(a, b);
  assert.match(a, /Totally Real Preview/);
});

test("cli writes chart.svg when --out is a directory", () => {
  const dir = tmpDir();
  const r = runCli("--input", path.join(REPO, "examples/launch.json"), "--out", dir + "/");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(dir, "chart.svg")));
});

test("cli errors are prefixed benchmaxxing:", () => {
  const bad = runCli("--from", "bogus", "--input", path.join(REPO, "examples/launch.json"));
  assert.notEqual(bad.status, 0);
  assert.match(bad.stderr, /benchmaxxing: /);

  const unknown = runCli("--frobnicate");
  assert.notEqual(unknown.status, 0);
  assert.match(unknown.stderr, /benchmaxxing: /);
});

test("cli eval path renders a csv bundle with report", () => {
  const dir = tmpDir();
  const a = path.join(dir, "a.csv");
  const b = path.join(dir, "b.csv");
  fs.writeFileSync(a, "model,benchmark,score\nAlpha,hellaswag,72\nAlpha,arc_challenge,0.65\n");
  fs.writeFileSync(b, "model,benchmark,score\nBeta,hellaswag,68\nBeta,arc_challenge,0.6\n");
  const bundle = path.join(dir, "bundle");
  const r = runCli("--from", "csv", "--input", a, "--input", b, "--names", "Alpha,Beta", "--out", bundle + "/");
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(bundle, "chart.svg")));
  const report = fs.readFileSync(path.join(bundle, "report.txt"), "utf8");
  assert.match(report, /adapter: csv/);
  assert.match(report, /highlight: .* \(highest mean score\)/);
});
