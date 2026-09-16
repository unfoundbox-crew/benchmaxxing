export function slugModelId(model) {
    const slug = model
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    return slug === "" ? "model" : slug;
}
function tasksByName(eval_) {
    const map = new Map();
    for (const task of eval_.tasks)
        map.set(task.name, task);
    return map;
}
function uniformShots(lists) {
    let shots;
    for (const task of lists) {
        if (task?.shots === undefined)
            return undefined;
        if (shots === undefined)
            shots = task.shots;
        else if (task.shots !== shots)
            return undefined;
    }
    return shots;
}
export function mergeEvals(evals) {
    const first = evals[0];
    if (first === undefined)
        throw new Error("benchmaxxing: no common tasks");
    const rest = evals.slice(1).map(tasksByName);
    const firstByName = tasksByName(first);
    const out = [];
    for (const task of first.tasks) {
        if (!firstByName.delete(task.name))
            continue; // de-dupe repeat names
        const peers = rest.map((map) => map.get(task.name));
        if (peers.some((peer) => peer === undefined))
            continue; // inner join
        const present = [task, ...peers.filter((p) => p !== undefined)];
        const scores = {};
        evals.forEach((eval_, i) => {
            const entry = i === 0 ? task : peers[i - 1];
            if (entry !== undefined)
                scores[slugModelId(eval_.model)] = entry.score;
        });
        const shots = uniformShots(present);
        out.push({
            name: task.name,
            scores,
            ...(shots !== undefined ? { note: `${shots}-shot` } : {}),
        });
    }
    if (out.length === 0)
        throw new Error("benchmaxxing: no common tasks");
    return out;
}
export function formatProvenance(evals) {
    const seen = new Map();
    const allShots = [];
    for (const eval_ of evals) {
        for (const task of eval_.tasks) {
            if (!seen.has(task.name)) {
                seen.set(task.name, undefined);
            }
            if (task.version !== undefined && seen.get(task.name) === undefined) {
                seen.set(task.name, task.version);
            }
            allShots.push(task.shots);
        }
    }
    const parts = [...seen].map(([name, version]) => version === undefined ? name : `${name} v${version}`);
    const shots = allShots.length > 0 && allShots.every((s) => s !== undefined && s === allShots[0])
        ? allShots[0]
        : undefined;
    if (shots !== undefined)
        parts.push(`${shots}-shot`);
    return parts.join(" · ");
}
//# sourceMappingURL=merge.js.map