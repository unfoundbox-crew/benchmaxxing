import test from "node:test";
import assert from "node:assert/strict";
import { mergeEvals, formatProvenance } from "../dist/merge.js";

const dawn = {
  model: "Meridian Dawn",
  tasks: [
    { name: "hellaswag", version: "1", shots: 0, score: 72.5 },
    { name: "arc_challenge", version: "2", shots: 0, score: 68.0 },
  ],
};

const rival = {
  model: "Rival X",
  tasks: [
    { name: "hellaswag", version: "1", shots: 0, score: 70.0 },
    { name: "arc_challenge", version: "2", shots: 0, score: 71.0 },
  ],
};

test("mergeEvals inner-joins on task name with slugged model keys", () => {
  const out = mergeEvals([dawn, rival]);
  assert.equal(out.length, 2);
  assert.equal(out[0]?.name, "hellaswag");
  assert.deepEqual(out[0]?.scores, { "meridian-dawn": 72.5, "rival-x": 70.0 });
  assert.equal(out[1]?.name, "arc_challenge");
});

test("mergeEvals drops non-common tasks", () => {
  const partial = {
    model: "Rival X",
    tasks: [{ name: "hellaswag", version: "1", shots: 0, score: 70.0 }],
  };
  const out = mergeEvals([dawn, partial]);
  assert.equal(out.length, 1);
  assert.equal(out[0]?.name, "hellaswag");
});

test("mergeEvals sets 0-shot note when shots uniform, omits otherwise", () => {
  const uniform = mergeEvals([dawn, rival]);
  assert.equal(uniform[0]?.note, "0-shot");
  const mixed = {
    model: "Rival X",
    tasks: [
      { name: "hellaswag", version: "1", shots: 5, score: 70.0 },
      { name: "arc_challenge", version: "2", shots: 0, score: 71.0 },
    ],
  };
  const out = mergeEvals([dawn, mixed]);
  assert.equal(out[0]?.note, undefined);
  assert.equal(out[1]?.note, "0-shot");
});

test("mergeEvals throws on empty intersection", () => {
  const disjoint = {
    model: "Rival X",
    tasks: [{ name: "mmlu", score: 60.0 }],
  };
  assert.throws(() => mergeEvals([dawn, disjoint]), /benchmaxxing: no common tasks/);
  assert.throws(() => mergeEvals([]), /benchmaxxing: /);
});

test("formatProvenance lists task versions and uniform shots", () => {
  assert.equal(
    formatProvenance([dawn, rival]),
    "hellaswag v1 · arc_challenge v2 · 0-shot",
  );
});

test("formatProvenance omits version/shots when absent or mixed", () => {
  const noMeta = {
    model: "Rival X",
    tasks: [{ name: "hellaswag", score: 70.0 }],
  };
  assert.equal(formatProvenance([noMeta]), "hellaswag");
});
