import type { Adapter, NormalizedEval, NormalizedTask } from "../types.js";

const REQUIRED = ["model", "benchmark", "score"] as const;
type RequiredCol = (typeof REQUIRED)[number];

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let cell = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      cells.push(cell);
      cell = "";
    } else {
      cell += ch;
    }
  }
  cells.push(cell);
  return cells;
}

function nonEmptyLines(text: string): string[] {
  return text.split(/\r?\n/).filter((line) => line.trim() !== "");
}

function headerIndex(header: string[], name: string): number {
  return header.findIndex((cell) => cell.trim().toLowerCase() === name);
}

function fail(row: number, why: string): never {
  throw new Error(`benchmaxxing: csv row ${row}: ${why}`);
}

interface CsvRow {
  model: string;
  name: string;
  version?: string;
  shots?: number;
  score: number;
  stderr?: number;
}

function parseRow(cells: string[], idx: Record<RequiredCol, number>, row: number): CsvRow {
  const model = (cells[idx.model] ?? "").trim();
  if (model === "") fail(row, "empty model");
  const name = (cells[idx.benchmark] ?? "").trim();
  if (name === "") fail(row, "empty benchmark");
  const scoreRaw = (cells[idx.score] ?? "").trim();
  if (scoreRaw === "") fail(row, "empty score");
  const scoreNum = Number(scoreRaw);
  if (!Number.isFinite(scoreNum)) fail(row, `invalid score "${scoreRaw}"`);
  return { model, name, score: scoreNum };
}

function parseBody(
  lines: string[],
  header: string[],
  idx: Record<RequiredCol, number>,
): CsvRow[] {
  const versionIdx = headerIndex(header, "version");
  const shotsIdx = headerIndex(header, "shots");
  const stderrIdx = headerIndex(header, "stderr");
  return lines.map((line, i): CsvRow => {
    const row = i + 2; // 1-based incl. header
    const cells = splitCsvLine(line);
    const base = parseRow(cells, idx, row);
    const version = versionIdx === -1 ? "" : (cells[versionIdx] ?? "").trim();
    let shots: number | undefined;
    if (shotsIdx !== -1) {
      const raw = (cells[shotsIdx] ?? "").trim();
      if (raw !== "") {
        if (!/^-?\d+$/.test(raw)) fail(row, `invalid shots "${raw}"`);
        shots = Number.parseInt(raw, 10);
      }
    }
    let stderr: number | undefined;
    if (stderrIdx !== -1) {
      const raw = (cells[stderrIdx] ?? "").trim();
      if (raw !== "") {
        const num = Number(raw);
        if (!Number.isFinite(num)) fail(row, `invalid stderr "${raw}"`);
        stderr = num;
      }
    }
    // Score and stderr share one scale per row: a fraction score scales both.
    const factor = base.score <= 1.5 ? 100 : 1;
    return {
      model: base.model,
      name: base.name,
      ...(version !== "" ? { version } : {}),
      ...(shots !== undefined ? { shots } : {}),
      score: base.score * factor,
      ...(stderr !== undefined ? { stderr: stderr * factor } : {}),
    };
  });
}

function selectModel(rows: CsvRow[], modelOverride?: string): CsvRow[] {
  const models = [...new Set(rows.map((r) => r.model))];
  if (modelOverride !== undefined) {
    const match = rows.filter((r) => r.model === modelOverride);
    if (match.length > 0) return match;
    if (models.length === 1) return rows; // rename path: override wins
    throw new Error(
      `benchmaxxing: csv model "${modelOverride}" not found (have: ${models.join(", ")})`,
    );
  }
  if (models.length > 1) {
    throw new Error(
      `benchmaxxing: csv contains multiple models (${models.join(", ")}); pass modelOverride to select one`,
    );
  }
  return rows;
}

export const csvAdapter: Adapter = {
  id: "csv",

  detect(input: unknown): boolean {
    try {
      if (typeof input !== "string") return false;
      const lines = nonEmptyLines(input);
      const first = lines[0];
      if (first === undefined) return false;
      const header = splitCsvLine(first);
      return REQUIRED.every((name) => headerIndex(header, name) !== -1);
    } catch {
      return false;
    }
  },

  parse(text: string, modelOverride?: string): NormalizedEval {
    if (typeof text !== "string" || text.trim() === "") {
      throw new Error("benchmaxxing: csv is empty");
    }
    const lines = nonEmptyLines(text);
    const head = lines[0];
    if (head === undefined) throw new Error("benchmaxxing: csv is empty");
    const header = splitCsvLine(head);
    const idx = {} as Record<RequiredCol, number>;
    for (const name of REQUIRED) {
      const at = headerIndex(header, name);
      if (at === -1) throw new Error(`benchmaxxing: csv missing required column "${name}"`);
      idx[name] = at;
    }
    const rows = parseBody(lines.slice(1), header, idx);
    if (rows.length === 0) throw new Error("benchmaxxing: csv has no data rows");
    const picked = selectModel(rows, modelOverride);
    const firstPicked = picked[0];
    if (firstPicked === undefined) throw new Error("benchmaxxing: csv has no data rows");
    const model = modelOverride !== undefined && picked === rows ? modelOverride : firstPicked.model;
    const tasks: NormalizedTask[] = picked.map((r) => ({
      name: r.name,
      ...(r.version !== undefined ? { version: r.version } : {}),
      ...(r.shots !== undefined ? { shots: r.shots } : {}),
      score: r.score,
      ...(r.stderr !== undefined ? { stderr: r.stderr } : {}),
    }));
    return { model, tasks };
  },
};
