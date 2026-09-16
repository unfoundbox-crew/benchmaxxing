import test from "node:test";
import assert from "node:assert/strict";
import { csvAdapter } from "../dist/adapters/csv.js";

const basic = `model,benchmark,score
Meridian Dawn,hellaswag,72.5
Meridian Dawn,arc_challenge,0.68
`;

const full = `model,benchmark,score,version,shots,stderr
Meridian Dawn,hellaswag,72.5,1,0,1.2
`;

test("detect sniffs csv headers without throwing", () => {
  assert.equal(csvAdapter.id, "csv");
  assert.equal(csvAdapter.detect(basic), true);
  assert.equal(csvAdapter.detect(full), true);
  assert.equal(csvAdapter.detect(`{"results": {}}`), false);
  assert.equal(csvAdapter.detect(undefined), false);
  assert.equal(csvAdapter.detect(42), false);
});

test("parse reads model/benchmark/score and scales fractions", () => {
  const out = csvAdapter.parse(basic);
  assert.equal(out.model, "Meridian Dawn");
  assert.equal(out.tasks.length, 2);
  assert.deepEqual(out.tasks[0], { name: "hellaswag", score: 72.5 });
  // 0.68 fraction scaled to percent
  assert.equal(out.tasks[1]?.name, "arc_challenge");
  assert.equal(out.tasks[1]?.score, 68);
});

test("parse honours version, shots, stderr", () => {
  const out = csvAdapter.parse(full);
  assert.deepEqual(out.tasks[0], {
    name: "hellaswag",
    version: "1",
    shots: 0,
    score: 72.5,
    stderr: 1.2,
  });
});

test("parse applies modelOverride and selects that model's rows", () => {
  const two = `model,benchmark,score
Meridian Dawn,hellaswag,72.5
Rival X,hellaswag,70.0
`;
  const out = csvAdapter.parse(two, "Rival X");
  assert.equal(out.model, "Rival X");
  assert.equal(out.tasks.length, 1);
  assert.equal(out.tasks[0]?.score, 70.0);
  // rename path: single-model file + override renames
  const renamed = csvAdapter.parse(basic, "Renamed");
  assert.equal(renamed.model, "Renamed");
  assert.equal(renamed.tasks.length, 2);
});

test("parse throws benchmaxxing:-prefixed errors on garbage", () => {
  assert.throws(() => csvAdapter.parse(""), /benchmaxxing: /);
  assert.throws(
    () => csvAdapter.parse("model,benchmark\nMeridian Dawn,hellaswag\n"),
    /benchmaxxing: csv missing required column "score"/,
  );
  assert.throws(
    () => csvAdapter.parse("model,benchmark,score\nMeridian Dawn,hellaswag,abc\n"),
    /benchmaxxing: /,
  );
  assert.throws(
    () =>
      csvAdapter.parse(
        "model,benchmark,score\nMeridian Dawn,hellaswag,72.5\nRival X,hellaswag,70.0\n",
      ),
    /benchmaxxing: csv contains multiple models/,
  );
  // quoted fields with commas survive
  const quoted = `model,benchmark,score\n"Meridian, Dawn",hellaswag,72.5\n`;
  assert.equal(csvAdapter.parse(quoted).model, "Meridian, Dawn");
});
