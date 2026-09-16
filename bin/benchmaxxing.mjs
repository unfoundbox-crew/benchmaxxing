#!/usr/bin/env node
// SPEC.md §4: legacy chart-config rendering keeps working; eval inputs go
// through adapters (dist/adapters/*) + merge (dist/merge.js) when built.
// Missing modules are skipped gracefully — lanes build them concurrently.
// Every error is prefixed "benchmaxxing: ".
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { benchmaxx, meridianDawnPreset } from "../dist/index.js";
import {
  loadConfig, defaultHighlight, themeColors, normalizeTaskScores,
  filterByTasks, resolveValue, detectAdapterId, validateFrom,
} from "../dist/branding.js";

const ADAPTER_FILES = { "lm-eval": "lm_eval.js", inspect: "inspect.js", csv: "csv.js" };
// CLI-only string flags; --input/--names/--tasks need special handling below.
const STR_FLAGS = ["--from", "--metric", "--scale", "--title", "--subtitle", "--highlight", "--theme", "--preset", "--out"];

const raw = process.argv.slice(2);
const inputs = [];
const opts = {};
if (raw.some((a) => a === "--help" || a === "-h")) {
  console.log(`benchmaxxing\n\nUsage:\n  benchmaxxing --preset meridian-dawn --out launch.svg\n  benchmaxxing --input chart.json --out chart.svg\n  benchmaxxing --input a.json --input b.csv --names A,B --out ./launch/\n\nOptions:\n  --input <file>  Repeatable. Chart config JSON or eval output (lm-eval,\n                  inspect, csv). Bare positionals are also inputs.\n  --names a,b,c   Display names mapped positionally onto inputs.\n  --from auto|lm-eval|inspect|csv   Adapter pick (default: auto detect).\n  --metric <name> Metric key for adapters that accept one (e.g. lm-eval).\n  --scale 100|1|auto  Percent, fraction, or auto-detect (default: auto).\n  --tasks a,b,c   Keep only these benchmarks (by name).\n  --title <s> --subtitle <s> --highlight <model id> --theme light|dark|launch|paper|terminal\n  --preset meridian-dawn\n  --out <path>    File for chart configs; directory bundle for eval inputs.\n`);
  process.exit(0);
}
for (let i = 0; i < raw.length; i++) {
  const a = raw[i];
  const need = () => {
    const v = raw[++i];
    if (v === undefined) throw new Error(`benchmaxxing: ${a} needs a value`);
    return v;
  };
  if (a === "--input") inputs.push(need());
  else if (a === "--names" || a === "--tasks") opts[a.slice(2)] = need().split(",").map((s) => s.trim()).filter(Boolean);
  else if (STR_FLAGS.includes(a)) opts[a.slice(2)] = need();
  else if (a.startsWith("--")) throw new Error(`benchmaxxing: unknown flag ${a}`);
  else inputs.push(a);
}

async function loadModule(rel, required) {
  try {
    return await import(rel);
  } catch (err) {
    const missing = err && (err.code === "ERR_MODULE_NOT_FOUND" || /Cannot find module/.test(err.message || ""));
    if (!missing) throw err;
    if (required) throw new Error(`benchmaxxing: ${required} is not built yet (run npm run build)`);
    return null;
  }
}

// Adapter modules ship as bare {detect, parse} or {xAdapter: {id, detect, parse}}.
function asAdapter(wantId, mod) {
  if (!mod) return null;
  if (typeof mod.detect === "function" && typeof mod.parse === "function") return { id: wantId, detect: mod.detect, parse: mod.parse };
  const found = Object.values(mod).find((v) => v && typeof v.detect === "function" && typeof v.parse === "function");
  return found ? { id: found.id ?? wantId, detect: found.detect, parse: found.parse } : null;
}

const fallbackSlug = (s) => s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "model";
const isChartConfig = (v) => !!v && typeof v === "object" && !Array.isArray(v) && Array.isArray(v.models) && Array.isArray(v.benchmarks);
const read = (f) => {
  try { return fs.readFileSync(path.resolve(f), "utf8"); }
  catch (err) { throw new Error(`benchmaxxing: cannot read ${JSON.stringify(f)}: ${err.message}`); }
};
const parseChart = (f) => {
  let parsed;
  try { parsed = JSON.parse(read(f)); }
  catch (err) { throw new Error(`benchmaxxing: invalid chart config ${JSON.stringify(f)}: ${err.message}`); }
  if (!isChartConfig(parsed)) throw new Error(`benchmaxxing: ${JSON.stringify(f)} is not a chart config (no models/benchmarks)`);
  return parsed;
};

async function main() {
  const notes = [];
  const config = loadConfig(process.cwd());
  const from = validateFrom(opts.from);
  const scale = resolveValue(opts.scale, config.scale, "auto");
  if (!["1", "100", "auto"].includes(scale)) throw new Error(`benchmaxxing: --scale must be 100, 1 or auto, got ${JSON.stringify(scale)}`);
  const metric = resolveValue(opts.metric, config.metric, undefined);
  const tasks = opts.tasks ?? config.tasks;
  const theme = resolveValue(opts.theme, config.theme, undefined);
  if (opts.preset !== undefined && opts.preset !== "meridian-dawn") {
    throw new Error(`benchmaxxing: unknown preset ${JSON.stringify(opts.preset)} (known: meridian-dawn)`);
  }
  const applyShared = (options, benchmarks) => {
    const filtered = filterByTasks(benchmarks, tasks);
    const resolved = { ...options, benchmarks: filtered };
    const title = resolveValue(opts.title, config.title, undefined);
    if (title !== undefined) resolved.title = title;
    const subtitle = resolveValue(opts.subtitle, config.subtitle, undefined);
    if (subtitle !== undefined) resolved.subtitle = subtitle;
    resolved.highlight = resolveValue(opts.highlight, config.highlight, undefined) ?? resolved.highlight ?? defaultHighlight(filtered);
    if (theme !== undefined) {
      if (["launch", "paper", "terminal"].includes(theme)) {
        resolved.theme = theme;
      } else {
        delete resolved.theme;
        Object.assign(resolved, themeColors(theme));
      }
    }
    return resolved;
  };

  // Legacy path: chart config in, SVG out. No eval machinery involved.
  if (opts.preset !== undefined || (from === undefined && inputs.length <= 1 && inputs.every((f) => {
    try { return isChartConfig(JSON.parse(read(f))); } catch { return false; }
  }))) {
    if (inputs.length > 1) throw new Error("benchmaxxing: multiple --input chart configs: render one file per run");
    const options = inputs.length === 1 ? parseChart(inputs[0]) : meridianDawnPreset();
    const dest = opts.out ?? "benchmaxxing.svg";
    const file = dest.endsWith("/") || (fs.existsSync(dest) && fs.statSync(dest).isDirectory()) ? path.join(dest, "chart.svg") : dest;
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
    fs.writeFileSync(path.resolve(file), benchmaxx(applyShared(options, options.benchmarks)));
    console.log(`wrote ${file}`);
    return;
  }

  // Eval path: every input goes through an adapter, then merge.
  if (!inputs.length) throw new Error("benchmaxxing: no inputs (pass --input files or --preset)");
  if (opts.names && opts.names.length !== inputs.length) notes.push(`--names has ${opts.names.length} entries for ${inputs.length} inputs; mapping positionally`);
  const evals = [];
  const usedAdapters = [];
  for (let i = 0; i < inputs.length; i++) {
    const text = read(inputs[i]);
    let parsed;
    try { parsed = JSON.parse(text); } catch { parsed = text; }
    let adapter;
    if (from && from !== "auto") {
      adapter = asAdapter(from, await loadModule(`../dist/adapters/${ADAPTER_FILES[from]}`, `adapter "${from}"`));
      if (!adapter) throw new Error(`benchmaxxing: adapter "${from}" is built but has no detect/parse exports`);
    } else {
      const available = [];
      for (const cid of Object.keys(ADAPTER_FILES)) {
        const found = asAdapter(cid, await loadModule(`../dist/adapters/${ADAPTER_FILES[cid]}`, null));
        if (found) available.push(found);
        else notes.push(`adapter "${cid}" is not built yet; skipped`);
      }
      if (!available.length) throw new Error("benchmaxxing: no adapters are built yet (run npm run build)");
      adapter = available.find((a) => a.id === detectAdapterId(available, parsed));
    }
    let ev;
    if (adapter.parse.length >= 3) {
      const parseOpts = {};
      if (metric !== undefined) parseOpts.metric = metric;
      if (scale !== undefined) parseOpts.scale = scale;
      ev = adapter.parse(text, opts.names ? opts.names[i] : undefined, parseOpts);
    } else {
      if (metric !== undefined) notes.push(`adapter "${adapter.id}" does not accept --metric; using its default`);
      ev = adapter.parse(text, opts.names ? opts.names[i] : undefined);
      ev.tasks = normalizeTaskScores(ev.tasks, scale);
    }
    evals.push(ev);
    usedAdapters.push(adapter.id);
  }

  const merge = await loadModule("../dist/merge.js", null);
  if (!merge || typeof merge.mergeEvals !== "function") {
    throw new Error(`benchmaxxing: cannot combine ${inputs.length} eval input(s): merge support is not built (run npm run build)`);
  }
  const benchmarks = merge.mergeEvals(evals);
  const provenance = typeof merge.formatProvenance === "function" ? merge.formatProvenance(evals) : evals.map((e) => e.model).join(" vs ");
  const slug = typeof merge.slugModelId === "function" ? merge.slugModelId : fallbackSlug;
  const labels = {};
  for (const e of evals) labels[slug(e.model)] = e.model;
  const seen = [];
  for (const bm of benchmarks) for (const id of Object.keys(bm.scores)) if (!seen.includes(id)) seen.push(id);
  const options = applyShared({
    title: resolveValue(opts.title, config.title, "Benchmark results"),
    subtitle: resolveValue(opts.subtitle, config.subtitle, undefined),
    models: seen.map((id) => ({ id, label: labels[id] ?? id })),
    benchmarks,
    footer: provenance,
  }, benchmarks);

  const dir = opts.out ?? "./launch";
  fs.mkdirSync(path.resolve(dir), { recursive: true });
  const written = ["chart.svg"];
  fs.writeFileSync(path.resolve(dir, "chart.svg"), benchmaxx(options));
  const snippets = await loadModule("../dist/snippets.js", null);
  if (snippets) {
    try {
      const jobs = [["table.md", snippets.renderMarkdownTable, [options.benchmarks]],
        ["hf-card.md", snippets.renderHfCard, [options.benchmarks, provenance]],
        ["post.txt", snippets.renderPost, [options.benchmarks]]];
      for (const [file, fn, fnArgs] of jobs) {
        if (typeof fn === "function") {
          fs.writeFileSync(path.resolve(dir, file), fn(...fnArgs));
          written.push(file);
        }
      }
    } catch (err) {
      notes.push(`snippets emit skipped: ${err.message}`);
    }
  } else {
    notes.push("snippets support is not built yet; bundle holds chart.svg only");
  }
  const report = [...inputs.map((f, i) => `input ${i + 1}: ${f} (adapter: ${usedAdapters[i]}, model: ${evals[i].model})`),
    `provenance: ${provenance}`,
    `highlight: ${options.highlight}${opts.highlight ?? config.highlight ? " (explicit)" : " (highest mean score)"}`,
    `scale: ${scale}${metric ? ` metric: ${metric}` : ""}${tasks ? ` tasks: ${tasks.join(",")}` : ""}${theme ? ` theme: ${theme}` : ""}`,
    ...notes.map((n) => `note: ${n}`), `wrote: ${written.join(", ")}`].join("\n") + "\n";
  fs.writeFileSync(path.resolve(dir, "report.txt"), report);
  console.log(report.trimEnd());
}

main().catch((err) => {
  const msg = err instanceof Error ? err.message : String(err);
  console.error(msg.startsWith("benchmaxxing:") ? msg : `benchmaxxing: ${msg}`);
  process.exit(1);
});
