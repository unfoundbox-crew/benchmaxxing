---
license: mit
library_name: benchmaxxing
pipeline_tag: feature-extraction
tags:
- satire
- dataviz
- benchmark
---

# Meridian Dawn Preview

> **SATIRE / NOT AN AI MODEL.** This repository is the launch gag for `benchmaxxing`, an actual open-source charting library. All benchmark scores shown here are synthetic.

## Model description

Meridian Dawn Preview converts structured numerical tensors into high-fidelity visual representations using a deterministic, zero-hallucination SVG architecture.

| Property | Value |
|---|---|
| Architecture | SVG Transformer |
| Parameters | 0 |
| Active parameters | 0 |
| Context window | viewport-dependent |
| Quantization | lossless-ish |
| Inference | client-side / Node |
| Training compute | none |
| Intelligence | none detected |

## Benchmarks

Meridian reports strong synthetic performance on BullshitBench, DipshitBench, CherryPick-Hard, VibeBench, LogoBench Pro, CopiumEval II, SOTA Leakage, and BenchMaxxing.lol.

None of those scores are real model evaluations. That is the joke.

## Actually useful thing

`benchmaxxing` is a zero-runtime-dependency TypeScript library that generates deterministic multi-panel benchmark SVGs and exports them to SVG/PNG in the browser.

```ts
import { benchmaxx } from "@benchmaxxing/charts";

const svg = benchmaxx({ models, benchmarks, highlight: "ours" });
```

## Limitations

- Cannot reason.
- Cannot write poetry.
- Cannot call tools.
- Extremely good at rectangles.
