// Shared with render.ts panels layout and og.ts OG layout.
// Extracted verbatim so both layouts stay byte-identical to v0.1 behaviour.
export function fmt(value) {
    if (Number.isInteger(value))
        return String(value);
    if (Math.abs(value) >= 1000)
        return value.toFixed(0);
    return value.toFixed(1);
}
export function finiteScore(value, benchmark) {
    if (!Number.isFinite(value)) {
        throw new Error(`Benchmark ${benchmark.name} contains a non-finite score.`);
    }
    return value;
}
export function resolveMax(benchmark, values) {
    const observedMax = Math.max(...values, 0.000001);
    return benchmark.max && benchmark.max > 0 ? benchmark.max : observedMax * 1.12;
}
// Highlight bar emphasis by visualBias, same convention as panels.
export function highlightScale(visualBias) {
    return visualBias === "series-b" ? 1.14 : visualBias === "startup" ? 1.07 : 1;
}
const THEMES = {
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
export function resolveTheme(options) {
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
//# sourceMappingURL=shared.js.map