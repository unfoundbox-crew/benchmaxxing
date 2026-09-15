import fs from "node:fs";
import path from "node:path";
import { benchmaxx, meridianDawnPreset } from "../dist/index.js";

const svg = benchmaxx(meridianDawnPreset());
fs.mkdirSync(path.resolve("assets"), { recursive: true });
fs.writeFileSync(path.resolve("assets/meridian-dawn-preview.svg"), svg);
fs.writeFileSync(path.resolve("docs/preview.svg"), svg);
console.log("generated assets/meridian-dawn-preview.svg and docs/preview.svg");
