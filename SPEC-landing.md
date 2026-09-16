# Landing reskin spec — two directions, staged at /v2a and /v2b

Goal: make benchmaxxing.lol look designed. Current docs/index.html is
scaffold-grade (default tokens, flat gray). Two agents each build ONE
direction. Saurabh picks a winner; winner gets promoted to /v2 (later index).

## Shared constraints (both directions, non-negotiable)

- Staging paths: Agent A writes ONLY docs/v2a/index.html. Agent B writes ONLY
  docs/v2b/index.html. Single self-contained file each (inline `<style>`).
- Reuse, don't duplicate: chart via `../preview.svg` static embed AND live
  demo via `../demo.js` + `../lib/` (ES modules, already deployed). To reuse
  demo.js unmodified, the page MUST contain elements with ids `chart`, `svg`,
  `png`, `bias` (same semantics as current index.html: click bias cycles
  honest/startup/series-b and re-renders).
- og-image: `../og-image.png`. favicon: `../favicon.svg`.
- Zero external assets: no webfonts, no CDN, no analytics. System font stacks
  only. Page must render identically offline.
- Disclosure stays prominent: satire/synthetic-scores note visible without
  scrolling past the chart (above or directly under it, not footer-buried).
- `<meta name="robots" content="noindex">` — staging paths must not be indexed.
- Responsive: single column ≤ 800px, no horizontal scroll on a 390px viewport.
- Same content blocks, any order/layout: eyebrow, H1, sub, export buttons,
  chart, disclosure, install (`npm i @benchmaxxing/charts`), API, CLI,
  "chart crimes" list, footer.
- No emojis. No gradients (flat color only — house rule for this project).

## Direction A (/v2a) — "The Launch"

A page that could pass for a real frontier-model announcement for three
seconds. Light, warm, restrained. Warm paper background (#fafaf9 family),
ink text (#1c1917), ONE blue accent (#2563eb, the chart hero color).
Hairline rules instead of cards where possible; where cards exist, 20px+
radius, no shadows (flat). Big tight headline (clamp, letter-spacing negative),
tabular numerals anywhere numbers appear. Generous whitespace: the chart gets
room to breathe. Think Anthropic launch page with a joke living inside it.

## Direction B (/v2b) — "The Terminal"

Engineer-native dark page. Near-black zinc background (#09090b family),
light text, JetBrains Mono/ui-monospace accents for labels, eyebrows and
buttons; sans for body. Blue accent same #2563eb. Borders instead of shadows
(1px #27272a). Chart panel stays WHITE (the export asset is light — don't
restyle the chart, frame it: white panel on dark page is the contrast moment).
Code blocks near-black with blue prompt details. Dense, precise, a little
severe. Think the machine room the charts get printed in.

## Acceptance (each agent)

1. `python3 -m http.server` docs, screenshot your page at 1280 + 390 widths,
   LOOK at both, fix what's broken. Iterate until clean.
2. Click all three buttons (export SVG/PNG download, bias cycles + re-renders).
3. No console errors (favicon 404 doesn't count — it exists).
4. Report: what you chose and why (5 lines max), screenshot paths, remaining
   nits you can see but didn't fix.
