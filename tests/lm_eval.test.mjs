import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { detect, parse } from "../dist/adapters/lm_eval.js";

const fixture = readFileSync(
  new URL("./fixtures/lm-eval.json", import.meta.url),
  "utf8",
);

test("parse prefers acc_norm and scales fractions to percent", () => {
  const eval_ = parse(fixture);
  assert.equal(eval_.model, "hf-test-model");
  const hellaswag = eval_.tasks.find((t) => t.name === "hellaswag");
  assert.ok(hellaswag);
  assert.equal(hellaswag.score, 62.34);
  assert.equal(hellaswag.stderr, 0.67);
  assert.equal(hellaswag.version, "1");
  assert.equal(hellaswag.shots, 0);
});

test("parse falls back to first non-stderr metric when acc_norm absent", () => {
  const eval_ = parse(fixture);
  const arc = eval_.tasks.find((t) => t.name === "arc_challenge");
  assert.ok(arc);
  assert.equal(arc.score, 51.12);
  assert.equal(arc.stderr, 1.46);
  assert.equal(arc.version, "2");
});

test("parse passes percent-scale values through untouched", () => {
  const eval_ = parse(fixture);
  const mmlu = eval_.tasks.find((t) => t.name === "mmlu");
  assert.ok(mmlu);
  assert.equal(mmlu.score, 63.2);
  assert.equal(mmlu.stderr, 1.7);
});

test("parse honors model override and metric option", () => {
  const eval_ = parse(fixture, "Override Model");
  assert.equal(eval_.model, "Override Model");
  const byMetric = parse(fixture, undefined, { metric: "acc" });
  const hellaswag = byMetric.tasks.find((t) => t.name === "hellaswag");
  assert.ok(hellaswag);
  assert.equal(hellaswag.score, 45.21);
});

test("parse defaults model to unknown when config.model missing", () => {
  const doc = JSON.parse(fixture);
  delete doc.config.model;
  assert.equal(parse(JSON.stringify(doc)).model, "unknown");
});

test("detect sniffs harness shape without throwing", () => {
  assert.equal(detect(JSON.parse(fixture)), true);
  assert.equal(detect(fixture), true);
  for (const junk of [null, 42, "nope", [], {}, { results: [] }]) {
    assert.equal(detect(junk), false);
  }
});

test("detect rejects inspect log results blocks", () => {
  const inspectLog = readFileSync(
    new URL("./fixtures/inspect-log.json", import.meta.url),
    "utf8",
  );
  assert.equal(detect(inspectLog), false);
});

test("parse throws benchmaxxing:-prefixed errors on garbage", () => {
  assert.throws(() => parse("not json"), /benchmaxxing: /);
  assert.throws(() => parse("{}"), /benchmaxxing: /);
  assert.throws(() => parse('{"results": {}}'), /benchmaxxing: /);
  assert.throws(
    () => parse('{"results": {"t": {"alias": "t"}}}'),
    /benchmaxxing: /,
  );
});

test("parse is deterministic", () => {
  assert.deepEqual(parse(fixture), parse(fixture));
});
