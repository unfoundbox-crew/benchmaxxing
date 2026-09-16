// @ts-ignore - no @types/node in this repo (zero-dep rule); bin + node runtime provide it
import { readFileSync } from "node:fs";
import type { Benchmark, BenchmaxxOptions } from "./types.js";

// SPEC.md §4: benchmaxx.config.json (all fields optional) + CLI flags win.
// Structural task type is local: Agent A owns src/types.ts and has not
// landed the §1 contracts there yet.

export interface BrandingConfig extends Partial<BenchmaxxOptions> {
  metric?: string;
  scale?: string;
  tasks?: string[];
  theme?: string;
}

export interface TaskScore {
  name: string;
  score: number;
  stderr?: number;
}

/** Read benchmaxx.config.json from cwd. Missing file → {}. A present but
 *  unreadable or malformed file throws benchmaxxing: — never silently ignored. */
export function loadConfig(cwd: string): BrandingConfig {
  const file = `${cwd.replace(/\/$/, "")}/benchmaxx.config.json`;
  let text: string;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    return {};
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch (err) {
    throw new Error(`benchmaxxing: invalid benchmaxx.config.json: ${(err as Error).message}`);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("benchmaxxing: invalid benchmaxx.config.json: expected a JSON object");
  }
  return parsed as BrandingConfig;
}

/** Honest default: model id with the highest mean score. Ties break by
 *  lexicographic id so repeat runs are byte-identical. */
export function defaultHighlight(benchmarks: Benchmark[]): string {
  if (!benchmarks.length) throw new Error("benchmaxxing: no benchmarks to pick a highlight from");
  const totals = new Map<string, { sum: number; n: number }>();
  for (const bm of benchmarks) {
    for (const [id, score] of Object.entries(bm.scores)) {
      const cur = totals.get(id) ?? { sum: 0, n: 0 };
      cur.sum += score;
      cur.n += 1;
      totals.set(id, cur);
    }
  }
  if (!totals.size) throw new Error("benchmaxxing: no benchmarks to pick a highlight from");
  let best = "";
  let bestMean = -Infinity;
  const ids = [...totals.keys()].sort();
  for (const id of ids) {
    const cur = totals.get(id) ?? { sum: 0, n: 0 };
    const mean = cur.sum / Math.max(1, cur.n);
    if (mean > bestMean) {
      bestMean = mean;
      best = id;
    }
  }
  return best;
}

const THEMES: Record<string, { background: string; foreground: string; panelColor: string }> = {
  light: { background: "#ffffff", foreground: "#111111", panelColor: "#f7f7f7" },
  dark: { background: "#111418", foreground: "#f2f4f8", panelColor: "#1e242c" },
};

export function themeColors(theme: string): { background: string; foreground: string; panelColor: string } {
  const t = THEMES[theme];
  if (!t) throw new Error(`benchmaxxing: --theme must be light or dark, got ${JSON.stringify(theme)}`);
  return { ...t };
}

/** Scale rule (SPEC.md §1): fractions ≤ 1.5 are ×100. "1" forces ×100,
 *  "100" passes through, "auto" (default) applies the rule per value. */
export function normalizeScores(scores: Record<string, number>, scale: string | undefined): Record<string, number> {
  const s = scale ?? "auto";
  if (s === "100") return { ...scores };
  if (s === "1") return Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, v * 100]));
  if (s === "auto") {
    return Object.fromEntries(
      Object.entries(scores).map(([k, v]) => [k, v <= 1.5 ? v * 100 : v]),
    );
  }
  throw new Error(`benchmaxxing: --scale must be 100, 1 or auto, got ${JSON.stringify(scale)}`);
}

export function normalizeTaskScores<T extends TaskScore>(tasks: T[], scale: string | undefined): T[] {
  return tasks.map((t) => {
    const mapped = normalizeScores({ s: t.score }, scale);
    const score = mapped["s"] ?? t.score;
    if (t.stderr !== undefined) {
      const se = normalizeScores({ s: t.stderr }, scale);
      const stderr = se["s"];
      if (stderr === undefined) return { ...t, score };
      return { ...t, score, stderr };
    }
    return { ...t, score };
  });
}

export function filterByTasks<T extends { name: string }>(items: T[], tasks: string[] | undefined): T[] {
  if (!tasks || !tasks.length) return items;
  const wanted = new Set(tasks);
  const out = items.filter((item) => wanted.has(item.name));
  if (!out.length) throw new Error(`benchmaxxing: --tasks matched no benchmarks (asked: ${tasks.join(", ")})`);
  return out;
}

/** Precedence: CLI flag wins over config file wins over fallback. */
export function resolveValue<T>(flag: T | undefined, config: T | undefined, fallback?: T): T | undefined {
  return flag ?? config ?? fallback;
}

export interface Detectable {
  id: string;
  detect(input: unknown): boolean;
}

/** Auto mode: first candidate whose detect() accepts the parsed input.
 *  Candidate order is the caller's contract (lm-eval, inspect, csv). */
export function detectAdapterId(candidates: Detectable[], parsed: unknown): string {
  for (const candidate of candidates) {
    let ok = false;
    try {
      ok = candidate.detect(parsed);
    } catch {
      ok = false;
    }
    if (ok) return candidate.id;
  }
  const tried = candidates.map((c) => c.id).join(", ") || "none available";
  throw new Error(`benchmaxxing: no adapter recognized this input (tried: ${tried})`);
}

export const KNOWN_ADAPTER_IDS = ["lm-eval", "inspect", "csv"] as const;

export function validateFrom(from: string | undefined): string | undefined {
  if (from === undefined || from === "auto") return from;
  if ((KNOWN_ADAPTER_IDS as readonly string[]).includes(from)) return from;
  throw new Error(`benchmaxxing: --from must be one of auto|lm-eval|inspect|csv, got ${JSON.stringify(from)}`);
}
