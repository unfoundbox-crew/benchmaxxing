export function meridianDawnPreset() {
    const models = [
        { id: "meridian", label: "Meridian Dawn Preview", mark: "M△" },
        { id: "deepdiver", label: "DeepDiver V4", mark: "DV" },
        { id: "kite", label: "KITE K3", mark: "K³" },
        { id: "quanta", label: "Quanta 3.8 Max", mark: "Q" },
        { id: "glyph", label: "GLYPH 5.3", mark: "G" },
        { id: "aperture", label: "Aperture 5.6 Sol", mark: "A" },
        { id: "sonneteer", label: "Sonneteer Opus 5", mark: "S" }
    ];
    return {
        title: "Meridian Dawn Preview",
        subtitle: "From raw numbers to verifiable results.",
        models,
        highlight: "meridian",
        visualBias: "startup",
        footer: "Scores are synthetic. Higher is better unless lower looked better.",
        satireLabel: "SATIRE · SYNTHETIC SCORES · NOT MODEL EVALUATIONS",
        benchmarks: [
            {
                name: "BulshitBench",
                scores: { meridian: 96.4, deepdiver: 72.8, kite: 79.1, quanta: 83.3, glyph: 84.5, aperture: 88.2, sonneteer: 91.0 },
                max: 106.0,
                note: "persuasion"
            },
            {
                name: "ChartArena",
                scores: { meridian: 91.2, deepdiver: 80.3, kite: 82.1, quanta: 81.8, glyph: 83.6, aperture: 85.4, sonneteer: 86.1 },
                max: 98.5,
                note: "methodology"
            },
            {
                name: "CherryPick-Hard",
                scores: { meridian: 99.1, deepdiver: 78.2, kite: 86.4, quanta: 88.0, glyph: 87.2, aperture: 92.7, sonneteer: 94.8 },
                max: 105.0,
                note: "best-of-N"
            },
            {
                name: "VibeBench",
                scores: { meridian: 94.6, deepdiver: 71.4, kite: 83.6, quanta: 82.8, glyph: 86.9, aperture: 89.1, sonneteer: 90.5 },
                max: 106.0,
                note: "aura"
            },
            {
                name: "InferencePlot",
                scores: { meridian: 105.0, deepdiver: 89.2, kite: 91.4, quanta: 94.0, glyph: 95.7, aperture: 97.2, sonneteer: 99.4 },
                max: 112.4,
                note: "+12 aura"
            },
            {
                name: "CopiumEval II",
                scores: { meridian: 97.8, deepdiver: 69.0, kite: 74.7, quanta: 81.2, glyph: 84.6, aperture: 87.0, sonneteer: 92.2 },
                max: 110.5,
                note: "positioning"
            },
            {
                name: "SOTA Leakage",
                scores: { meridian: 94.5, deepdiver: 67.8, kite: 73.5, quanta: 77.4, glyph: 80.3, aperture: 85.7, sonneteer: 89.9 },
                max: 103.0,
                note: "adjacent prestige"
            },
            {
                name: "BenchMaxxing.lol",
                scores: { meridian: 100.0, deepdiver: 75.2, kite: 79.8, quanta: 84.4, glyph: 86.2, aperture: 90.6, sonneteer: 93.1 },
                max: 111.0,
                note: "composite"
            }
        ]
    };
}
//# sourceMappingURL=presets.js.map