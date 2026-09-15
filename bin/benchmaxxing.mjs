#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { benchmaxx, meridianDawnPreset } from "../dist/index.js";

const args = process.argv.slice(2);
function valueAfter(flag) {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`benchmaxxing\n\nUsage:\n  benchmaxxing --preset meridian-dawn --out launch.svg\n  benchmaxxing --input chart.json --out chart.svg\n\nOptions:\n  --input <file>    JSON config\n  --preset <name>   meridian-dawn\n  --out <file>      Output SVG path (default: benchmaxxing.svg)\n`);
  process.exit(0);
}

const input = valueAfter("--input");
const preset = valueAfter("--preset");
const out = valueAfter("--out") ?? "benchmaxxing.svg";
let config;

if (input) {
  config = JSON.parse(fs.readFileSync(path.resolve(input), "utf8"));
} else if (!preset || preset === "meridian-dawn") {
  config = meridianDawnPreset();
} else {
  throw new Error(`Unknown preset: ${preset}`);
}

fs.writeFileSync(path.resolve(out), benchmaxx(config));
console.log(`wrote ${out}`);
