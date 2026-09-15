import { benchmaxx } from "../dist/index.js";
import fs from "node:fs";

const svg = benchmaxx({
  title: "My Extremely Serious Benchmark",
  models: [
    { id: "mine", label: "Mine", mark: "ME" },
    { id: "other", label: "Other", mark: "OT" }
  ],
  highlight: "mine",
  satireLabel: "EXAMPLE DATA",
  benchmarks: [
    { name: "VibeBench", scores: { mine: 91.2, other: 88.1 } },
    { name: "ShipBench", scores: { mine: 93.4, other: 72.7 } }
  ]
});

fs.writeFileSync("example.svg", svg);
