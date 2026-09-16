// SPEC.md §3 lm-eval adapter: EleutherAI lm-evaluation-harness results JSON
// → NormalizedEval. Zero deps, deterministic, errors prefixed "benchmaxxing: ".
//
import type { NormalizedEval, NormalizedTask } from "../types.js";

export interface LmEvalParseOptions {
  /** Metric key (or key prefix before the ",filter" suffix) to use instead
   *  of the default pick. */
  metric?: string;
}

// ---------------------------------------------------------------------------
// Helpers.
// ---------------------------------------------------------------------------
function fail(message: string): never {
  throw new Error(`benchmaxxing: ${message}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** Fractions ≤ 1.5 become percents; percent-scale values pass through.
 *  Rounded to 2 decimals so fraction inputs land on clean percent values. */
function toPercent(value: number): number {
  const scaled = value <= 1.5 ? value * 100 : value;
  return Math.round(scaled * 100) / 100;
}

/** Harness metric keys carry a ",filter" suffix ("acc_norm,none").
 *  Match `wanted` with or without that suffix. */
function findMetricKey(keys: string[], wanted: string): string | undefined {
  return keys.find((k) => k === wanted || k.startsWith(`${wanted},`));
}

/** Companian stderr key for a metric key: "acc,none" → "acc_stderr,none". */
function stderrKeyFor(metricKey: string): string {
  const comma = metricKey.indexOf(",");
  if (comma === -1) return `${metricKey}_stderr`;
  return `${metricKey.slice(0, comma)}_stderr${metricKey.slice(comma)}`;
}

function pickMetricKey(
  taskName: string,
  entry: Record<string, unknown>,
  options?: LmEvalParseOptions,
): string {
  const keys = Object.keys(entry);
  if (options?.metric !== undefined) {
    const key = findMetricKey(keys, options.metric);
    if (key === undefined || !isFiniteNumber(entry[key])) {
      fail(`metric "${options.metric}" not found for task "${taskName}"`);
    }
    return key;
  }
  const preferred = findMetricKey(keys, "acc_norm");
  if (preferred !== undefined && isFiniteNumber(entry[preferred])) {
    return preferred;
  }
  const fallback = keys.find(
    (k) => !k.includes("_stderr") && isFiniteNumber(entry[k]),
  );
  if (fallback === undefined) {
    fail(`no numeric metric for task "${taskName}"`);
  }
  return fallback;
}

// ---------------------------------------------------------------------------
// Adapter.
// ---------------------------------------------------------------------------
/** Best-effort sniff for harness results JSON. Never throws. */
export function detect(input: unknown): boolean {
  try {
    let doc = input;
    if (typeof doc === "string") {
      doc = JSON.parse(doc) as unknown;
    }
    if (!isRecord(doc) || !isRecord(doc["results"])) return false;
    // A harness task maps metric names to numbers. Anything else — e.g. an
    // Inspect log's results block, whose entries are arrays and scalars —
    // is not lm-eval output and must not match here.
    return Object.values(doc["results"]).some(
      (entry) =>
        isRecord(entry) &&
        Object.values(entry).some(
          (v) => typeof v === "number" && Number.isFinite(v),
        ),
    );
  } catch {
    return false;
  }
}

/** Parse harness results JSON text into a NormalizedEval. */
export function parse(
  text: string,
  modelOverride?: string,
  options?: LmEvalParseOptions,
): NormalizedEval {
  let doc: unknown;
  try {
    doc = JSON.parse(text) as unknown;
  } catch {
    fail("invalid JSON for lm-eval results");
  }
  if (!isRecord(doc) || !isRecord(doc["results"])) {
    fail("expected lm-eval results JSON with a \"results\" object");
  }
  const results = doc["results"];
  const names = Object.keys(results);
  if (names.length === 0) fail("lm-eval results contain no tasks");

  const config = isRecord(doc["config"]) ? doc["config"] : {};
  const versions = isRecord(doc["versions"]) ? doc["versions"] : {};

  let model = "unknown";
  if (modelOverride !== undefined && modelOverride !== "") {
    model = modelOverride;
  } else if (typeof config["model"] === "string" && config["model"] !== "") {
    model = config["model"];
  }
  const shots =
    typeof config["num_fewshot"] === "number" ? config["num_fewshot"] : undefined;

  const tasks: NormalizedTask[] = names.map((name) => {
    const entry = results[name];
    if (!isRecord(entry)) fail(`task "${name}" is not an object`);
    const metricKey = pickMetricKey(name, entry, options);
    const raw = entry[metricKey];
    if (!isFiniteNumber(raw)) fail(`non-numeric metric for task "${name}"`);
    const task: NormalizedTask = { name, score: toPercent(raw) };

    const version = versions[name];
    if (typeof version === "string" || typeof version === "number") {
      task.version = String(version);
    }
    if (shots !== undefined) task.shots = shots;

    const stderrRaw = entry[stderrKeyFor(metricKey)];
    if (isFiniteNumber(stderrRaw)) task.stderr = toPercent(stderrRaw);
    return task;
  });

  return { model, tasks };
}
