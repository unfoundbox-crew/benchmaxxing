import type { Benchmark, BenchmaxxOptions, ChartTheme, VisualBias } from "./types.js";

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

// First-class chart themes. Theme supplies the defaults; explicit color
// overrides on the options always win. visualBias stays orthogonal: it only
// ever touches emphasis/width, never color.
export interface ThemeTokens {
  background: string;
  foreground: string;
  highlightColor: string;
  mutedColor: string;
  panelColor: string;
  /** Interior label color on top of a highlight bar. */
  onHighlight: string;
  /** Gridline/hairline stroke opacity. */
  gridOpacity: number;
  /** Gridline/hairline stroke width in px. */
  hairlineWidth: number;
}

const THEMES: Record<ChartTheme, ThemeTokens> = {
  launch: {
    background: "#ffffff",
    foreground: "#1c1917",
    highlightColor: "#2563eb",
    mutedColor: "#e7e5e4",
    panelColor: "#fafaf9",
    onHighlight: "#ffffff",
    gridOpacity: 0.12,
    hairlineWidth: 1
  },
  paper: {
    background: "#ffffff",
    foreground: "#111111",
    highlightColor: "#111111",
    mutedColor: "#ececec",
    panelColor: "#ffffff",
    onHighlight: "#ffffff",
    gridOpacity: 0.22,
    hairlineWidth: 0.5
  },
  terminal: {
    background: "#09090b",
    foreground: "#f4f4f5",
    highlightColor: "#10b981",
    mutedColor: "#27272a",
    panelColor: "#101013",
    onHighlight: "#ffffff",
    gridOpacity: 0.18,
    hairlineWidth: 1
  }
};

export function resolveTheme(
  options: Pick<
    BenchmaxxOptions,
    "theme" | "background" | "foreground" | "highlightColor" | "mutedColor" | "panelColor"
  >
): ThemeTokens {
  const name = options.theme ?? "launch";
  const base = THEMES[name];
  if (!base) {
    throw new Error(`benchmaxxing: unknown theme ${JSON.stringify(name)} (known: launch, paper, terminal)`);
  }
  return {
    background: options.background ?? base.background,
    foreground: options.foreground ?? base.foreground,
    highlightColor: options.highlightColor ?? base.highlightColor,
    mutedColor: options.mutedColor ?? base.mutedColor,
    panelColor: options.panelColor ?? base.panelColor,
    onHighlight: base.onHighlight,
    gridOpacity: base.gridOpacity,
    hairlineWidth: base.hairlineWidth
  };
}
