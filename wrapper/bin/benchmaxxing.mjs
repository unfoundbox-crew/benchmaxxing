#!/usr/bin/env node
// Passthrough shim: bare `npx benchmaxxing` resolves this package, and this
// file hands off to the real CLI shipped by @benchmaxxing/charts.
// The charts package only exports "." (not its bin subpath), so resolve the
// package root and step sideways to its bin file on disk. import.meta.resolve
// (not createRequire) is used because the charts exports map is import-only.
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

let entry;
try {
  entry = fileURLToPath(await import.meta.resolve("@benchmaxxing/charts"));
} catch {
  console.error("benchmaxxing: @benchmaxxing/charts is not installed — run `npm install` first");
  process.exit(1);
}
const bin = path.join(path.dirname(entry), "..", "bin", "benchmaxxing.mjs");
await import(pathToFileURL(bin).href);
