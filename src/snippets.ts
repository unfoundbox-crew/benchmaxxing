import type { Benchmark } from "./types.js";

export interface SnippetLinks {
  github?: string;
  hf?: string;
  demo?: string;
}

const DISCLAIMER = "SATIRE — synthetic scores, not real model evaluations.";

function fail(what: string): never {
  throw new Error(`benchmaxxing: ${what}`);
}

function checkBms(bms: Benchmark[]): void {
  if (!Array.isArray(bms) || bms.length === 0) fail("need at least one benchmark");
  for (const b of bms) {
    if (typeof b?.name !== "string" || b.name === "") fail("every benchmark needs a name");
    if (typeof b?.scores !== "object" || b.scores === null) fail(`benchmark "${b?.name}" needs a scores object`);
    for (const v of Object.values(b.scores)) {
      if (typeof v !== "number" || !Number.isFinite(v)) fail(`benchmark "${b.name}" has a non-numeric score`);
    }
  }
}

function modelsOf(bms: Benchmark[]): string[] {
  return [...new Set(bms.flatMap((b) => Object.keys(b.scores)))].sort();
}

function cell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("\n", " ");
}

function fmt(score: number | undefined): string {
  return score === undefined ? "n/a" : score.toFixed(1);
}

export function renderMarkdownTable(bms: Benchmark[]): string {
  checkBms(bms);
  const models = modelsOf(bms);
  if (models.length === 0) fail("no model scores to render");
  const withNote = bms.some((b) => b.note !== undefined && b.note !== "");
  const head = ["benchmark", ...models, ...(withNote ? ["note"] : [])];
  const line = (cells: string[]): string => `| ${cells.join(" | ")} |\n`;
  let out = line(head) + line(head.map(() => "---"));
  for (const b of bms) {
    out += line([cell(b.name), ...models.map((m) => fmt(b.scores[m])), ...(withNote ? [cell(b.note ?? "")] : [])]);
  }
  return out;
}

export function renderHfCard(bms: Benchmark[], provenance: string): string {
  checkBms(bms);
  if (typeof provenance !== "string" || provenance.trim() === "") fail("renderHfCard needs a provenance string");
  return (
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
    renderMarkdownTable(bms) +
    "\n" +
    `Provenance: ${provenance.trim()}\n` +
    "\n" +
    `${DISCLAIMER}\n`
  );
}

export function renderPost(bms: Benchmark[], links: SnippetLinks = {}): string {
  checkBms(bms);
  const models = modelsOf(bms);
  if (models.length === 0) fail("no model scores to render");
  const first = models[0] as string;
  const names = bms.map((b) => b.name).join(", ");
  const tops = bms.map((b) => {
    let best = first;
    for (const m of models) {
      if ((b.scores[m] ?? Number.NEGATIVE_INFINITY) > (b.scores[best] ?? Number.NEGATIVE_INFINITY)) best = m;
    }
    return `- ${b.name}: ${best} ${fmt(b.scores[best])}`;
  });
  let out = `New benchmark results: ${names}.\n\n${tops.join("\n")}\n`;
  const linkLines = [
    links.github ? `GitHub: ${links.github}` : "",
    links.hf ? `Hugging Face: ${links.hf}` : "",
    links.demo ? `Demo: ${links.demo}` : "",
  ].filter((l) => l !== "");
  if (linkLines.length > 0) out += `\n${linkLines.join("\n")}\n`;
  return `${out}\n${DISCLAIMER}\n`;
}
