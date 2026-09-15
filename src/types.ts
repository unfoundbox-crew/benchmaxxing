export type VisualBias = "honest" | "startup" | "series-b";

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
  subtitle?: string;
  models: BenchModel[];
  benchmarks: Benchmark[];
  highlight: string;
  width?: number;
  columns?: number;
  visualBias?: VisualBias;
  footer?: string;
  satireLabel?: string;
  background?: string;
  foreground?: string;
  highlightColor?: string;
  mutedColor?: string;
  panelColor?: string;
}
