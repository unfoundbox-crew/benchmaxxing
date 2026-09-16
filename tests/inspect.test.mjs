import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { detect, parse } from "../dist/adapters/inspect.js";

const fixtureText = readFileSync(
  new URL("./fixtures/inspect-log.json", import.meta.url),
  "utf8",
);
const fixtureDoc = JSON.parse(fixtureText);

test("detect accepts an inspect log dump (object or text)", () => {
  assert.equal(detect(fixtureDoc), true);
  assert.equal(detect(fixtureText), true);
});

test("detect rejects non-inspect input without throwing", () => {
  const bad = [
    null,
    undefined,
    42,
    "not json",
    "[]",
    {},
    { eval: { model: "m", task_name: "t" } },
    { eval: { model: "m" }, results: { scores: [] } },
    { results: { hellaswag: { acc_norm: 0.5 } } },
    { eval: "m", results: { scores: [{ metrics: { acc: 0.5 } }] } },
  ];
  for (const input of bad) assert.equal(detect(input), false);
});

test("parse extracts model, task, headline score and stderr", () => {
  const out = parse(fixtureText);
  assert.equal(out.model, "mockllm/model");
  assert.equal(out.tasks.length, 1);
  const task = out.tasks[0];
  assert.equal(task.name, "hellaswag");
  assert.ok(Math.abs(task.score - 62) < 1e-9);
  assert.ok(Math.abs(task.stderr - 1.2) < 1e-9);
});

test("parse honours modelOverride", () => {
  assert.equal(parse(fixtureText, "Meridian Dawn").model, "Meridian Dawn");
});

test("parse passes percent-scale scores through untouched", () => {
  const doc = JSON.parse(fixtureText);
  doc.results.scores[0].metrics.accuracy.value = 62;
  doc.results.scores[0].metrics.accuracy.stderr = 3;
  const task = parse(JSON.stringify(doc)).tasks[0];
  assert.equal(task.score, 62);
  assert.equal(task.stderr, 3);
});

test("parse accepts a bare-number metric (no stderr)", () => {
  const doc = {
    eval: { model: "m", task_name: "t" },
    results: { scores: [{ name: "s", metrics: { acc: 0.5 } }] },
  };
  const task = parse(JSON.stringify(doc)).tasks[0];
  assert.equal(task.score, 50);
  assert.equal(task.stderr, undefined);
});

test("parse throws benchmaxxing: on garbage", () => {
  const bad = [
    "",
    "not json",
    "[]",
    "{}",
    JSON.stringify({ eval: { model: "m" } }),
    JSON.stringify({ eval: { model: "", task_name: "t" } }),
    JSON.stringify({
      eval: { model: "m", task_name: "t" },
      results: { scores: [] },
    }),
    JSON.stringify({
      eval: { model: "m", task_name: "t" },
      results: { scores: [{ metrics: {} }] },
    }),
    JSON.stringify({
      eval: { model: "m", task_name: "t" },
      results: { scores: [{ metrics: { acc: { value: "high" } } }] },
    }),
  ];
  for (const text of bad) {
    assert.throws(
      () => parse(text),
      (e) => e instanceof Error && e.message.startsWith("benchmaxxing: "),
    );
  }
});

test("parse is deterministic", () => {
  assert.deepEqual(parse(fixtureText), parse(fixtureText));
});
