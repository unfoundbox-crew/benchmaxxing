// Inspect adapter (SPEC.md §3): `inspect log dump` JSON -> NormalizedEval.
import type { NormalizedEval, NormalizedTask } from "../types.js";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Best-effort coercion for detect(): parsed object passes through, text is
 *  JSON-parsed, anything else is rejected. Never throws. */
function toRecord(input: unknown): Record<string, unknown> | null {
  if (typeof input === "string") {
    try {
      const parsed: unknown = JSON.parse(input);
      return isRecord(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return isRecord(input) ? input : null;
}

function header(doc: Record<string, unknown>): { model: string; task: string } | null {
  const ev = doc["eval"];
  if (!isRecord(ev)) return null;
  const model = ev["model"];
  const task = ev["task_name"];
  if (typeof model !== "string" || model.length === 0) return null;
  if (typeof task !== "string" || task.length === 0) return null;
  return { model, task };
}

function headline(doc: Record<string, unknown>): { value: number; stderr?: number } | null {
  const results = doc["results"];
  if (!isRecord(results)) return null;
  const scores = results["scores"];
  if (!Array.isArray(scores) || scores.length === 0) return null;
  const first: unknown = scores[0];
  if (!isRecord(first)) return null;
  const metrics = first["metrics"];
  if (!isRecord(metrics)) return null;
  const key = Object.keys(metrics)[0];
  if (key === undefined) return null;
  const entry: unknown = metrics[key];
  if (typeof entry === "number") {
    return Number.isFinite(entry) ? { value: entry } : null;
  }
  if (!isRecord(entry)) return null;
  const value = entry["value"];
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const out: { value: number; stderr?: number } = { value };
  const stderr = entry["stderr"];
  if (typeof stderr === "number" && Number.isFinite(stderr)) out.stderr = stderr;
  return out;
}

/** Fractions ≤ 1.5 are ×100; percent-scale values pass through. */
function scale(n: number): number {
  return n <= 1.5 ? n * 100 : n;
}

/** Best-effort sniff for an Inspect eval log. Never throws. */
export function detect(input: unknown): boolean {
  try {
    const doc = toRecord(input);
    if (doc === null) return false;
    if (header(doc) === null) return false;
    return headline(doc) !== null;
  } catch {
    return false;
  }
}

/** Parse an `inspect log dump` JSON document (header is sufficient). */
export function parse(text: string, modelOverride?: string): NormalizedEval {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new Error("benchmaxxing: invalid JSON for inspect log");
  }
  if (!isRecord(doc)) throw new Error("benchmaxxing: inspect log must be a JSON object");
  const head = header(doc);
  if (head === null) {
    throw new Error("benchmaxxing: inspect log missing eval.model or eval.task_name");
  }
  const first = headline(doc);
  if (first === null) {
    throw new Error("benchmaxxing: inspect log missing results.scores[0] headline metric");
  }
  const task: NormalizedTask = { name: head.task, score: scale(first.value) };
  if (first.stderr !== undefined) task.stderr = scale(first.stderr);
  return { model: modelOverride ? modelOverride : head.model, tasks: [task] };
}
