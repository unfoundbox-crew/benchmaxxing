// @ts-ignore - no @types/node in this repo (zero-dep rule); bin + node runtime provide it
import { readFileSync } from "node:fs";
/** Read benchmaxx.config.json from cwd. Missing file → {}. A present but
 *  unreadable or malformed file throws benchmaxxing: — never silently ignored. */
export function loadConfig(cwd) {
    const file = `${cwd.replace(/\/$/, "")}/benchmaxx.config.json`;
    let text;
    try {
        text = readFileSync(file, "utf8");
    }
    catch {
        return {};
    }
    let parsed;
    try {
        parsed = JSON.parse(text);
    }
    catch (err) {
        throw new Error(`benchmaxxing: invalid benchmaxx.config.json: ${err.message}`);
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("benchmaxxing: invalid benchmaxx.config.json: expected a JSON object");
    }
    return parsed;
}
/** Honest default: model id with the highest mean score. Ties break by
 *  lexicographic id so repeat runs are byte-identical. */
export function defaultHighlight(benchmarks) {
    if (!benchmarks.length)
        throw new Error("benchmaxxing: no benchmarks to pick a highlight from");
    const totals = new Map();
    for (const bm of benchmarks) {
        for (const [id, score] of Object.entries(bm.scores)) {
            const cur = totals.get(id) ?? { sum: 0, n: 0 };
            cur.sum += score;
            cur.n += 1;
            totals.set(id, cur);
        }
    }
    if (!totals.size)
        throw new Error("benchmaxxing: no benchmarks to pick a highlight from");
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
const THEMES = {
    light: { background: "#ffffff", foreground: "#111111", panelColor: "#f7f7f7" },
    dark: { background: "#111418", foreground: "#f2f4f8", panelColor: "#1e242c" },
};
export function themeColors(theme) {
    const t = THEMES[theme];
    if (!t)
        throw new Error(`benchmaxxing: --theme must be light, dark, launch, paper or terminal, got ${JSON.stringify(theme)}`);
    return { ...t };
}
/** Scale rule (SPEC.md §1): fractions ≤ 1.5 are ×100. "1" forces ×100,
 *  "100" passes through, "auto" (default) applies the rule per value. */
export function normalizeScores(scores, scale) {
    const s = scale ?? "auto";
    if (s === "100")
        return { ...scores };
    if (s === "1")
        return Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, v * 100]));
    if (s === "auto") {
        return Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, v <= 1.5 ? v * 100 : v]));
    }
    throw new Error(`benchmaxxing: --scale must be 100, 1 or auto, got ${JSON.stringify(scale)}`);
}
export function normalizeTaskScores(tasks, scale) {
    return tasks.map((t) => {
        const mapped = normalizeScores({ s: t.score }, scale);
        const score = mapped["s"] ?? t.score;
        if (t.stderr !== undefined) {
            const se = normalizeScores({ s: t.stderr }, scale);
            const stderr = se["s"];
            if (stderr === undefined)
                return { ...t, score };
            return { ...t, score, stderr };
        }
        return { ...t, score };
    });
}
export function filterByTasks(items, tasks) {
    if (!tasks || !tasks.length)
        return items;
    const wanted = new Set(tasks);
    const out = items.filter((item) => wanted.has(item.name));
    if (!out.length)
        throw new Error(`benchmaxxing: --tasks matched no benchmarks (asked: ${tasks.join(", ")})`);
    return out;
}
/** Precedence: CLI flag wins over config file wins over fallback. */
export function resolveValue(flag, config, fallback) {
    return flag ?? config ?? fallback;
}
/** Auto mode: first candidate whose detect() accepts the parsed input.
 *  Candidate order is the caller's contract (lm-eval, inspect, csv). */
export function detectAdapterId(candidates, parsed) {
    for (const candidate of candidates) {
        let ok = false;
        try {
            ok = candidate.detect(parsed);
        }
        catch {
            ok = false;
        }
        if (ok)
            return candidate.id;
    }
    const tried = candidates.map((c) => c.id).join(", ") || "none available";
    throw new Error(`benchmaxxing: no adapter recognized this input (tried: ${tried})`);
}
export const KNOWN_ADAPTER_IDS = ["lm-eval", "inspect", "csv"];
export function validateFrom(from) {
    if (from === undefined || from === "auto")
        return from;
    if (KNOWN_ADAPTER_IDS.includes(from))
        return from;
    throw new Error(`benchmaxxing: --from must be one of auto|lm-eval|inspect|csv, got ${JSON.stringify(from)}`);
}
//# sourceMappingURL=branding.js.map