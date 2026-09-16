export type VisualBias = "honest" | "startup" | "series-b";

export type ChartTheme = "launch" | "paper" | "terminal";

export interface BenchModel {
  id: string;
  label: string;
  shortLabel?: string;
  mark?: string;
}

export interface Benchmark {
  name: string;
  scores: Record<string, number>;
  suffix?: string;
  higherIsBetter?: boolean;
  max?: number;
  note?: string;
}

export interface BenchmaxxOptions {
  title?: string;
  subtitle?: string;  models: BenchModel[];
  benchmarks: Benchmark[];
  highlight: string;
  layout?: "panels" | "og";
  width?: number;
  columns?: number;
  visualBias?: VisualBias;
  theme?: ChartTheme;
  footer?: string;
  satireLabel?: string;
  background?: string;
  foreground?: string;
  highlightColor?: string;
  mutedColor?: string;
  panelColor?: string;
}

export interface NormalizedTask {
  name: string; // "hellaswag"
  version?: string; // "1"
  shots?: number; // 0
  score: number; // 0–100 scale, ALWAYS percent by the time it leaves an adapter
  stderr?: number; // same scale (stored, not yet rendered)
}

export interface NormalizedEval {
  model: string; // "Meridian Dawn" (overrideable; else harness-provided)
  tasks: NormalizedTask[];
}

export interface Adapter {
  id: "lm-eval" | "inspect" | "csv" | "benchmaxx";
  detect(input: unknown): boolean; // no throw, best-effort sniff
  parse(text: string, modelOverride?: string): NormalizedEval; // throws Error("benchmaxxing: ...") on garbage
}
