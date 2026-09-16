import type { Benchmark, VisualBias } from "./types.js";

// Shared with render.ts panels layout and og.ts OG layout.
// Extracted verbatim so both layouts stay byte-identical to v0.1 behaviour.

export function fmt(value: number): string {
  if (Number.isInteger(value)) return String(value);
  if (Math.abs(value) >= 1000) return value.toFixed(0);
  return value.toFixed(1);
}

export function finiteScore(value: number, benchmark: Benchmark): number {
  if (!Number.isFinite(value)) {
    throw new Error(`Benchmark ${benchmark.name} contains a non-finite score.`);
  }
  return value;
}

export function resolveMax(benchmark: Benchmark, values: number[]): number {
  const observedMax = Math.max(...values, 0.000001);
  return benchmark.max && benchmark.max > 0 ? benchmark.max : observedMax * 1.12;
}

// Highlight bar emphasis by visualBias, same convention as panels.
export function highlightScale(visualBias: VisualBias): number {
  return visualBias === "series-b" ? 1.14 : visualBias === "startup" ? 1.07 : 1;
}
