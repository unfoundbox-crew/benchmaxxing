import { escapeXml } from "./escape.js";
import { renderOg } from "./og.js";
import { finiteScore, fmt, resolveTheme } from "./shared.js";
const defaults = {
    width: 1200,
    columns: 4
};
function ensureValid(options) {
    if (!options.models.length)
        throw new Error("At least one model is required.");
    if (!options.benchmarks.length)
        throw new Error("At least one benchmark is required.");
    if (!options.models.some((m) => m.id === options.highlight)) {
        throw new Error(`Highlight model ${options.highlight} was not found.`);
    }
    const ids = new Set(options.models.map((m) => m.id));
    for (const benchmark of options.benchmarks) {
        for (const id of Object.keys(benchmark.scores)) {
            if (!ids.has(id))
                throw new Error(`Benchmark ${benchmark.name} references unknown model ${id}.`);
        }
        for (const model of options.models) {
            const score = benchmark.scores[model.id];
            if (score === undefined)
                throw new Error(`Benchmark ${benchmark.name} is missing score for ${model.id}.`);
            finiteScore(score, benchmark);
        }
    }
}
function panelSvg(benchmark, options, x, y, width, height) {
    const padX = 18;
    const axisW = 30;
    const titleY = 28;
    const chartTop = 60;
    const chartBottom = height - 24;
    const chartHeight = chartBottom - chartTop;
    const gap = 8;
    const usableWidth = width - padX * 2 - axisW;
    const baseBarWidth = (usableWidth - gap * (options.models.length - 1)) / options.models.length;
    const values = options.models.map((m) => finiteScore(benchmark.scores[m.id], benchmark));
    const observedMax = Math.max(...values, 0.000001);
    const max = benchmark.max && benchmark.max > 0 ? benchmark.max : observedMax * 1.12;
    const parts = [];
    parts.push(`<g transform="translate(${x} ${y})">`);
    parts.push(`<rect x="0" y="0" width="${width}" height="${height}" rx="16" fill="${options.theme.panelColor}"/>`);
    parts.push(`<text x="${padX}" y="${titleY}" font-size="17" font-weight="700" fill="${options.theme.foreground}">${escapeXml(benchmark.name)}</text>`);
    if (benchmark.note) {
        parts.push(`<text x="${width - padX}" y="${titleY}" text-anchor="end" font-size="10" fill="${options.theme.foreground}" opacity="0.45">${escapeXml(benchmark.note)}</text>`);
    }
    for (const tick of [0, max / 2, max]) {
        const ty = chartBottom - chartHeight * (tick / max);
        parts.push(`<line x1="${padX + axisW}" y1="${ty.toFixed(2)}" x2="${width - padX}" y2="${ty.toFixed(2)}" stroke="${options.theme.foreground}" stroke-width="${options.theme.hairlineWidth}" opacity="${options.theme.gridOpacity}"/>`);
        parts.push(`<text x="${padX + axisW - 5}" y="${(ty + 3).toFixed(2)}" text-anchor="end" font-size="9.5" fill="${options.theme.foreground}" opacity="0.5">${escapeXml(fmt(tick))}</text>`);
    }
    options.models.forEach((model, i) => {
        const score = values[i];
        const ratio = Math.max(0, Math.min(1, score / max));
        const h = Math.max(2, chartHeight * ratio);
        const isHighlight = model.id === options.highlight;
        const widthBoost = isHighlight ? (options.visualBias === "series-b" ? 1.14 : options.visualBias === "startup" ? 1.07 : 1) : 1;
        const barW = Math.min(baseBarWidth * widthBoost, baseBarWidth + gap * 0.7);
        const slotX = padX + axisW + i * (baseBarWidth + gap);
        const barX = slotX + (baseBarWidth - barW) / 2;
        const barY = chartBottom - h;
        const fill = isHighlight ? options.theme.highlightColor : options.theme.mutedColor;
        const label = model.mark ?? model.shortLabel ?? model.label.slice(0, 2).toUpperCase();
        const nameWeight = isHighlight ? 800 : 650;
        parts.push(`<rect x="${barX.toFixed(2)}" y="${barY.toFixed(2)}" width="${barW.toFixed(2)}" height="${h.toFixed(2)}" rx="5" fill="${fill}"/>`);
        const labelX = (slotX + baseBarWidth / 2).toFixed(2);
        if (barY - 7 >= chartTop + 30) {
            parts.push(`<text x="${labelX}" y="${Math.max(chartTop + 15, barY - 22).toFixed(2)}" text-anchor="middle" font-size="13" font-weight="${nameWeight}" fill="${isHighlight ? options.theme.highlightColor : options.theme.foreground}">${escapeXml(label)}</text>`);
            parts.push(`<text x="${labelX}" y="${Math.max(chartTop + 30, barY - 7).toFixed(2)}" text-anchor="middle" font-size="11" font-weight="${isHighlight ? 800 : 600}" fill="${isHighlight ? options.theme.highlightColor : options.theme.foreground}" opacity="${isHighlight ? 1 : 0.62}">${escapeXml(fmt(score) + (benchmark.suffix ?? ""))}</text>`);
        }
        else {
            // Tall bar: labels would collide with the axis ticks, so set them inside
            // the bar top the way real launch charts do.
            const innerFill = isHighlight ? options.theme.onHighlight : options.theme.foreground;
            parts.push(`<text x="${labelX}" y="${(barY + 17).toFixed(2)}" text-anchor="middle" font-size="13" font-weight="${nameWeight}" fill="${innerFill}">${escapeXml(label)}</text>`);
            parts.push(`<text x="${labelX}" y="${(barY + 32).toFixed(2)}" text-anchor="middle" font-size="11" font-weight="${isHighlight ? 800 : 600}" fill="${innerFill}" opacity="${isHighlight ? 1 : 0.8}">${escapeXml(fmt(score) + (benchmark.suffix ?? ""))}</text>`);
        }
    });
    parts.push(`</g>`);
    return parts.join("");
}
export function benchmaxx(options) {
    if (options.layout === "og")
        return renderOg(options);
    ensureValid(options);
    const width = options.width ?? defaults.width;
    const columns = Math.max(1, Math.min(options.columns ?? defaults.columns, options.benchmarks.length));
    const visualBias = options.visualBias ?? "startup";
    const theme = resolveTheme(options);
    const outerPad = 34;
    const headerH = options.title || options.subtitle ? 112 : 24;
    const legendH = 72;
    const footerH = options.footer || options.satireLabel ? 54 : 24;
    const gap = 14;
    const panelH = 260;
    const rows = Math.ceil(options.benchmarks.length / columns);
    const panelW = (width - outerPad * 2 - gap * (columns - 1)) / columns;
    const height = headerH + rows * panelH + (rows - 1) * gap + legendH + footerH + outerPad;
    const parts = [];
    parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(options.title ?? "Benchmark chart")}">`);
    parts.push(`<rect width="100%" height="100%" fill="${theme.background}"/>`);
    parts.push(`<g font-family="Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" style="font-variant-numeric:tabular-nums">`);
    if (options.title) {
        parts.push(`<text x="${outerPad}" y="48" font-size="30" font-weight="820" letter-spacing="-0.5" fill="${theme.foreground}">${escapeXml(options.title)}</text>`);
    }
    if (options.subtitle) {
        parts.push(`<text x="${outerPad}" y="78" font-size="15" fill="${theme.foreground}" opacity="0.58">${escapeXml(options.subtitle)}</text>`);
    }
    const panelStartY = headerH;
    options.benchmarks.forEach((benchmark, i) => {
        const col = i % columns;
        const row = Math.floor(i / columns);
        const x = outerPad + col * (panelW + gap);
        const y = panelStartY + row * (panelH + gap);
        parts.push(panelSvg(benchmark, {
            models: options.models,
            highlight: options.highlight,
            visualBias,
            theme
        }, x, y, panelW, panelH));
    });
    const legendY = panelStartY + rows * panelH + (rows - 1) * gap + 34;
    const legendGap = 18;
    let cursorX = outerPad;
    for (const model of options.models) {
        const isHighlight = model.id === options.highlight;
        const mark = model.mark ?? model.shortLabel ?? model.label.slice(0, 2).toUpperCase();
        const label = `${mark}  ${model.label}`;
        const approxW = 15 + label.length * 7.1;
        if (cursorX + approxW > width - outerPad) {
            cursorX = outerPad;
        }
        parts.push(`<text x="${cursorX}" y="${legendY}" font-size="12" font-weight="${isHighlight ? 800 : 600}" fill="${isHighlight ? theme.highlightColor : theme.foreground}" opacity="${isHighlight ? 1 : 0.62}">${escapeXml(label)}</text>`);
        cursorX += approxW + legendGap;
    }
    const footerY = height - 28;
    if (options.footer) {
        parts.push(`<text x="${outerPad}" y="${footerY}" font-size="11" fill="${theme.foreground}" opacity="0.45">${escapeXml(options.footer)}</text>`);
    }
    if (options.satireLabel) {
        parts.push(`<text x="${width - outerPad}" y="${footerY}" text-anchor="end" font-size="10" font-weight="750" letter-spacing="0.6" fill="${theme.foreground}" opacity="0.55">${escapeXml(options.satireLabel)}</text>`);
    }
    parts.push(`</g></svg>`);
    return parts.join("");
}
//# sourceMappingURL=render.js.map