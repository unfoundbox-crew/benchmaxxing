import { benchmaxx } from "./render.js";
import type { BenchmaxxOptions } from "./types.js";

export function mountBenchmaxx(target: Element, options: BenchmaxxOptions): string {
  const svg = benchmaxx(options);
  target.innerHTML = svg;
  return svg;
}

export function downloadSvg(svg: string, filename = "benchmaxxing.svg"): void {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function svgToPngBlob(svg: string, scale = 2): Promise<Blob> {
  const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  try {
    const img = new Image();
    const loaded = new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Failed to rasterize SVG."));
    });
    img.src = url;
    await loaded;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context is unavailable.");
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed.")), "image/png");
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadPng(svg: string, filename = "benchmaxxing.png", scale = 2): Promise<void> {
  const blob = await svgToPngBlob(svg, scale);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
