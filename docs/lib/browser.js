import { benchmaxx } from "./render.js";
export function mountBenchmaxx(target, options) {
    const svg = benchmaxx(options);
    target.innerHTML = svg;
    return svg;
}
export function downloadSvg(svg, filename = "benchmaxxing.svg") {
    const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
export async function svgToPngBlob(svg, scale = 2) {
    const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    try {
        const img = new Image();
        const loaded = new Promise((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error("Failed to rasterize SVG."));
        });
        img.src = url;
        await loaded;
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx)
            throw new Error("2D canvas context is unavailable.");
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0);
        return await new Promise((resolve, reject) => {
            canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("PNG export failed.")), "image/png");
        });
    }
    finally {
        URL.revokeObjectURL(url);
    }
}
export async function downloadPng(svg, filename = "benchmaxxing.png", scale = 2) {
    const blob = await svgToPngBlob(svg, scale);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}
//# sourceMappingURL=browser.js.map