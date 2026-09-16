import fs from "node:fs";
import path from "node:path";
import { benchmaxx, meridianDawnPreset } from "../dist/index.js";

const themes = ["launch", "paper", "terminal"];
fs.mkdirSync(path.resolve("assets"), { recursive: true });
for (const theme of themes) {
  const svg = benchmaxx({ ...meridianDawnPreset(), theme });
  const file = path.resolve(`assets/gallery-${theme}.svg`);
  fs.writeFileSync(file, svg);
  console.log(`generated assets/gallery-${theme}.svg`);
}
