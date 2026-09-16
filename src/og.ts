import { escapeXml } from "./escape.js";
import { finiteScore, fmt, highlightScale, resolveMax, resolveTheme, type ThemeTokens } from "./shared.js";
import type { Benchmark, BenchmaxxOptions } from "./types.js";

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
export const OG_MAX_BENCHMARKS = 6;

function fail(message: string): never {
  throw new Error(`benchmaxxing: ${message}`);
}

function ensureValidOg(options: BenchmaxxOptions): void {
  if (!options.models.length) fail("at least one model is required.");
  if (!options.benchmarks.length) fail("at least one benchmark is required.");
  if (options.benchmarks.length > OG_MAX_BENCHMARKS) {
    fail(
      `og layout supports at most ${OG_MAX_BENCHMARKS} benchmarks (got ${options.benchmarks.length}); use --tasks to select a subset.`
    );
  }
  if (!options.models.some((m) => m.id === options.highlight)) {
    fail(`highlight model ${options.highlight} was not found.`);
  }
  const ids = new Set(options.models.map((m) => m.id));
  for (const benchmark of options.benchmarks) {
    for (const id of Object.keys(benchmark.scores)) {
      if (!ids.has(id)) fail(`benchmark ${benchmark.name} references unknown model ${id}.`);
    }
    for (const model of options.models) {
      const score = benchmark.scores[model.id];
      if (score === undefined) fail(`benchmark ${benchmark.name} is missing score for ${model.id}.`);
      finiteScore(score, benchmark);
    }
  }
}

function rowGroup(
  benchmark: Benchmark,
  options: Required<Pick<BenchmaxxOptions, "models" | "highlight" | "visualBias">> & {
    theme: ThemeTokens;
  },
  y: number,
  height: number,
  labelX: number,
  barsX: number,
  barsW: number,
  width: number
): string {
  const titleY = 18;
  const barsTop = 30;
  const barsBottom = height - 14;
  const barsH = barsBottom - barsTop;
  const slotH = barsH / options.models.length;
  const barH = Math.max(4, slotH - 4);
  const values = options.models.map((m) => finiteScore(benchmark.scores[m.id]!, benchmark));
  const max = resolveMax(benchmark, values);
  const boost = highlightScale(options.visualBias);

  const parts: string[] = [];
  parts.push(`<g data-benchmark="${escapeXml(benchmark.name)}" transform="translate(0 ${y.toFixed(2)})">`);
  parts.push(`<text x="${labelX}" y="${titleY}" font-size="15" font-weight="700" fill="${options.theme.foreground}">${escapeXml(benchmark.name)}</text>`);
  if (benchmark.note) {
    parts.push(`<text x="${width}" y="${titleY}" text-anchor="end" font-size="10" fill="${options.theme.foreground}" opacity="0.45">${escapeXml(benchmark.note)}</text>`);
  }
  for (const tick of [0, max / 2, max]) {
    const tx = barsX + barsW * (tick / max);
    parts.push(`<line x1="${tx.toFixed(2)}" y1="${barsTop}" x2="${tx.toFixed(2)}" y2="${barsBottom}" stroke="${options.theme.foreground}" stroke-width="${options.theme.hairlineWidth}" opacity="${options.theme.gridOpacity}"/>`);
    parts.push(`<text x="${tx.toFixed(2)}" y="${(barsBottom + 11).toFixed(2)}" text-anchor="middle" font-size="9" fill="${options.theme.foreground}" opacity="0.5">${escapeXml(fmt(tick))}</text>`);
  }

  options.models.forEach((model, i) => {
    const score = values[i]!;
    const ratio = Math.max(0, Math.min(1, score / max));
    const isHighlight = model.id === options.highlight;
    const len = Math.min(barsW, Math.max(2, barsW * ratio * (isHighlight ? boost : 1)));
    const cy = barsTop + i * slotH + slotH / 2;
    const barY = cy - barH / 2;
    const fill = isHighlight ? options.theme.highlightColor : options.theme.mutedColor;
    const mark = model.mark ?? model.shortLabel ?? model.label.slice(0, 2).toUpperCase();
    const value = fmt(score) + (benchmark.suffix ?? "");

    parts.push(`<text x="${barsX - 10}" y="${(cy + 4).toFixed(2)}" text-anchor="end" font-size="12" font-weight="${isHighlight ? 800 : 600}" fill="${isHighlight ? options.theme.highlightColor : options.theme.foreground}" opacity="${isHighlight ? 1 : 0.62}">${escapeXml(mark)}</text>`);
    parts.push(`<rect x="${barsX.toFixed(2)}" y="${barY.toFixed(2)}" width="${len.toFixed(2)}" height="${barH.toFixed(2)}" rx="4" fill="${fill}"/>`);
    if (len > 52) {
      const innerFill = isHighlight ? options.theme.onHighlight : options.theme.foreground;
      parts.push(`<text x="${(barsX + len - 7).toFixed(2)}" y="${(cy + 4).toFixed(2)}" text-anchor="end" font-size="11" font-weight="${isHighlight ? 800 : 600}" fill="${innerFill}" opacity="${isHighlight ? 1 : 0.8}">${escapeXml(value)}</text>`);
    } else {
      parts.push(`<text x="${(barsX + len + 7).toFixed(2)}" y="${(cy + 4).toFixed(2)}" font-size="11" font-weight="${isHighlight ? 800 : 600}" fill="${isHighlight ? options.theme.highlightColor : options.theme.foreground}" opacity="${isHighlight ? 1 : 0.62}">${escapeXml(value)}</text>`);
    }
  });

  parts.push(`</g>`);
  return parts.join("");
}

export function renderOg(options: BenchmaxxOptions): string {
  ensureValidOg(options);
  const width = OG_WIDTH;
  const height = OG_HEIGHT;
  const visualBias = options.visualBias ?? "startup";
  const theme = resolveTheme(options);

  const outerPad = 48;
  const headerH = options.title || options.subtitle ? 118 : 28;
  const footerY = height - 24;
  const contentBottom = options.footer || options.satireLabel ? height - 52 : height - 24;
  const gap = 12;
  const n = options.benchmarks.length;
  const groupH = (contentBottom - headerH - gap * (n - 1)) / n;
  const labelW = 64;
  const labelX = outerPad;
  const barsX = outerPad + labelW;
  const barsW = width - barsX - outerPad;

  const parts: string[] = [];
  parts.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeXml(options.title ?? "Benchmark chart")}">`);
  parts.push(`<rect width="100%" height="100%" fill="${theme.background}"/>`);
  parts.push(`<g font-family="Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" style="font-variant-numeric:tabular-nums">`);

  if (options.title) {
    parts.push(`<text x="${outerPad}" y="58" font-size="34" font-weight="820" letter-spacing="-0.5" fill="${theme.foreground}">${escapeXml(options.title)}</text>`);
  }
  if (options.subtitle) {
    parts.push(`<text x="${outerPad}" y="88" font-size="15" fill="${theme.foreground}" opacity="0.58">${escapeXml(options.subtitle)}</text>`);
  }

  options.benchmarks.forEach((benchmark, i) => {
    parts.push(rowGroup(benchmark, {
      models: options.models,
      highlight: options.highlight,
      visualBias,
      theme
    }, headerH + i * (groupH + gap), groupH, labelX, barsX, barsW, width - outerPad));
  });

  if (options.footer) {
    parts.push(`<text x="${outerPad}" y="${footerY}" font-size="11" fill="${theme.foreground}" opacity="0.45">${escapeXml(options.footer)}</text>`);
  }
  if (options.satireLabel) {
    parts.push(`<text x="${width - outerPad}" y="${footerY}" text-anchor="end" font-size="10" font-weight="750" letter-spacing="0.6" fill="${theme.foreground}" opacity="0.55">${escapeXml(options.satireLabel)}</text>`);
  }

  parts.push(`</g></svg>`);
  return parts.join("");
}
