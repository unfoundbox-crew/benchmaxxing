import test from "node:test";
import assert from "node:assert/strict";
import { renderMarkdownTable, renderHfCard, renderPost } from "../dist/snippets.js";

const bms = [
  { name: "hellaswag", scores: { rival: 72, "meridian-dawn": 78.5 } },
  { name: "arc_challenge", scores: { rival: 80, "meridian-dawn": 91.24 }, note: "0-shot" },
];

const provenance = "hellaswag v1 · arc_challenge v2 · 0-shot";

test("renderMarkdownTable: exact output, models sorted, scores to 1 decimal", () => {
  assert.equal(
    renderMarkdownTable(bms),
    "| benchmark | meridian-dawn | rival | note |\n" +
      "| --- | --- | --- | --- |\n" +
      "| hellaswag | 78.5 | 72.0 |  |\n" +
      "| arc_challenge | 91.2 | 80.0 | 0-shot |\n",
  );
});

test("renderMarkdownTable: deterministic", () => {
  assert.equal(renderMarkdownTable(bms), renderMarkdownTable(structuredClone(bms)));
});

test("renderMarkdownTable: no note column when no notes", () => {
  const out = renderMarkdownTable([{ name: "x", scores: { b: 1, a: 2 } }]);
  assert.equal(out, "| benchmark | a | b |\n| --- | --- | --- |\n| x | 2.0 | 1.0 |\n");
});

test("renderMarkdownTable: missing score renders n/a, pipes escaped", () => {
  const out = renderMarkdownTable([{ name: "a|b", scores: { a: 50 } }, { name: "c", scores: { b: 60 } }]);
  assert.equal(
    out,
    "| benchmark | a | b |\n| --- | --- | --- |\n| a\\|b | 50.0 | n/a |\n| c | n/a | 60.0 |\n",
  );
});

test("renderMarkdownTable: empty input throws benchmaxxing error", () => {
  assert.throws(() => renderMarkdownTable([]), /benchmaxxing: /);
  assert.throws(() => renderMarkdownTable([{ name: "x", scores: { a: Number.NaN } }]), /benchmaxxing: /);
});

test("renderHfCard: frontmatter, provenance, table, satire disclaimer", () => {
  const out = renderHfCard(bms, provenance);
  assert.equal(
    out,
    "---\n" +
      "license: mit\n" +
      "library_name: benchmaxxing\n" +
      "tags:\n" +
      "- benchmark\n" +
      "- dataviz\n" +
      "---\n" +
      "\n" +
      "# Benchmark results\n" +
      "\n" +
      "| benchmark | meridian-dawn | rival | note |\n" +
      "| --- | --- | --- | --- |\n" +
      "| hellaswag | 78.5 | 72.0 |  |\n" +
      "| arc_challenge | 91.2 | 80.0 | 0-shot |\n" +
      "\n" +
      `Provenance: ${provenance}\n` +
      "\n" +
      "SATIRE — synthetic scores, not real model evaluations.\n",
  );
});

test("renderHfCard: deterministic, rejects empty input/provenance", () => {
  assert.equal(renderHfCard(bms, provenance), renderHfCard(structuredClone(bms), provenance));
  assert.throws(() => renderHfCard([], provenance), /benchmaxxing: /);
  assert.throws(() => renderHfCard(bms, ""), /benchmaxxing: /);
});

test("renderPost: winners, links, satire line", () => {
  const out = renderPost(bms, { github: "https://github.com/example/repo", demo: "https://example.com/demo" });
  assert.equal(
    out,
    "New benchmark results: hellaswag, arc_challenge.\n" +
      "\n" +
      "- hellaswag: meridian-dawn 78.5\n" +
      "- arc_challenge: meridian-dawn 91.2\n" +
      "\n" +
      "GitHub: https://github.com/example/repo\n" +
      "Demo: https://example.com/demo\n" +
      "\n" +
      "SATIRE — synthetic scores, not real model evaluations.\n",
  );
});

test("renderPost: omits missing links, deterministic tie-break, rejects empty", () => {
  const tied = [{ name: "x", scores: { b: 90, a: 90 } }];
  const out = renderPost(tied, {});
  assert.equal(out, "New benchmark results: x.\n\n- x: a 90.0\n\nSATIRE — synthetic scores, not real model evaluations.\n");
  assert.equal(renderPost(bms, {}), renderPost(structuredClone(bms), {}));
  assert.throws(() => renderPost([], {}), /benchmaxxing: /);
});
