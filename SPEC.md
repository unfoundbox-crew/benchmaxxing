# benchmaxxing v0.2.0 spec — from harness output to launch bundle

Goal: `npx benchmaxxing <evals...> --out ./launch/` turns real eval output into
post-ready branded charts. Same honesty guarantees as v0.1 (geometry faithful,
satire disclosed); new job is ingesting the formats eval authors already have.

Non-goals (v2+): error whiskers from `_stderr`, W&B import, framework-specific
deep features, PNG without an explicit opt-in (see §6).

## 1. Shared contracts (src/types.ts — Agent A owns this file)

```ts
interface NormalizedTask {
  name: string;          // "hellaswag"
  version?: string;      // "1"
  shots?: number;        // 0
  score: number;         // 0–100 scale, ALWAYS percent by the time it leaves an adapter
  stderr?: number;       // same scale (stored, not yet rendered)
}
interface NormalizedEval {
  model: string;         // "Meridian Dawn" (overrideable; else harness-provided)
  tasks: NormalizedTask[];
}
interface Adapter {
  id: "lm-eval" | "inspect" | "csv" | "benchmaxx";
  detect(input: unknown): boolean;   // no throw, best-effort sniff
  parse(text: string, modelOverride?: string): NormalizedEval; // throws Error("benchmaxxing: ...") on garbage
}
```

Scale rule (adapters apply it, merge assumes it): fractions ≤ 1.5 are ×100.
Percent-scale values pass through. One `--scale 100|1|auto` flag (default auto).

## 2. Merge (src/merge.ts — Agent A)

`mergeEvals(evals: NormalizedEval[]): Benchmark[]` — inner join on task name.
`scores` keyed by model id (slugged from `NormalizedEval.model`).
`note`: `"0-shot"` when shots uniform across the task, else omitted.
`formatProvenance(evals): string` → `"hellaswag v1 · arc_challenge v2 · 0-shot"`.
Empty intersection → throw `benchmaxxing: no common tasks`.

## 3. Adapters (one owner per file, fixtures live next to tests)

- **lm-eval** (src/adapters/lm_eval.ts — Agent B): input is harness results JSON
  (`{results: {task: {metric: v, metric_stderr}}, versions, config{model}}`).
  Metric pick: `--metric` flag, default `acc_norm` when present else first
  non-`_stderr` metric. Model name from override else `config.model`.
- **inspect** (src/adapters/inspect.ts — Agent C): input is `inspect log dump`
  JSON (header only is enough). Model from `eval.model`, task from
  `eval.task_name`, score = headline metric value (`results.scores[0]`
  first metric), stderr when present.
- **csv** (src/adapters/csv.ts — Agent A): header must contain
  `model,benchmark,score` (extra columns ignored: `version,shots,stderr`
  honoured when present). One row per model×benchmark.
- **benchmaxx** (existing generic JSON): unchanged, still accepted.

`--from auto|lm-eval|inspect|csv` (default auto tries detect() in that order).

## 4. Branding + CLI (src/branding.ts, bin/benchmaxxing.mjs — Agent D)

`benchmaxx.config.json` (all fields optional) + CLI flags win over config:
`--title --subtitle --highlight --theme light|dark --metric --scale --tasks a,b,c`.
`--highlight` default: model with highest mean score (honest default).
`--input` repeatable (positionals are also inputs). `--names a,b,c` maps
positionally onto inputs for display names. `--out` dir receives the bundle.
Config load failure → throw, never silently ignore a config file.

## 5. OG layout (src/og.ts + hook in render.ts — Agent E, ONLY agent touching render.ts)

`layout: "panels" (default) | "og"`. OG = 1200×630, horizontal bar groups, one
per benchmark, all models, max 6 benchmarks (throw suggesting `--tasks` when
over). Title top-left, satireLabel stays. Everything else (ticks, interior
labels, visualBias) reuses existing helpers — extract, don't duplicate.

## 6. Snippets + wrapper (src/snippets.ts, wrapper/ — Agent F)

Pure functions: `renderMarkdownTable(bms): string`,
`renderHfCard(bms, provenance): string`, `renderPost(bms, links): string`.
Bundle writer emits: `chart.svg`, `table.md`, `hf-card.md`, `post.txt`.
PNG: `--png` uses optional peer `@resvg/resvg-js`; missing → error telling the
user the one install command. Core stays zero-dependency.
`wrapper/` = publishable `benchmaxxing` package (bin passthrough to
`@benchmaxxing/charts`). DO NOT publish — leave a `PUBLISH.md` checklist.

## 7. Rules for every agent

TDD: failing test with a committed fixture first, then implementation.
Files ≤ ~200 lines. No new runtime dependencies (dev: none either, node:test
only). Deterministic output (repeat runs byte-identical). Errors start with
`benchmaxxing: `. `dist/` is shared scratch — rebuild immediately before every
test run. Finish with full `npm test` green from your worktree state.
