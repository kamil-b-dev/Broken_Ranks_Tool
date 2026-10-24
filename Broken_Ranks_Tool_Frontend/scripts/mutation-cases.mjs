export const mutationCases = [
    {
        id: "owned-occurrence",
        file: "src/features/builder/backpack/backpackReorganizationTransfer.js",
        before: "usedEquipped.has(sourceKey) ||",
        after: "false ||",
        test: "src/features/builder/backpack/backpackReorganizationTransfer.test.js",
    },
    {
        id: "move-limit",
        file: "src/features/builder/backpack/backpackReorganizationTransfer.js",
        before: "operational && moveCount > maxMoves",
        after: "operational && false",
        test: "src/features/builder/backpack/backpackReorganizationTransfer.test.js",
    },
    {
        id: "natural-cap",
        file: "src/features/optimizer/reorganization/reorganizationPreflight.js",
        before: "cap == null ? Infinity : Math.abs(Number(cap))",
        after: "Infinity",
        test: "src/features/optimizer/reorganization/reorganizationPreflight.test.js",
    },
    {
        id: "negative-reduction",
        file: "src/features/optimizer/reorganization/reorganizationPreflight.js",
        before: "direction * Math.max(0, useful - parsedLoss)",
        after: "Math.max(0, useful - parsedLoss)",
        test: "src/features/optimizer/reorganization/reorganizationPreflight.test.js",
    },
];

export const mutationPlugin = (id) => {
    const mutation = mutationCases.find((entry) => entry.id === id);
    if (!mutation) throw new Error(`Unknown test mutation: ${id}`);
    return {
        name: "bounded-test-mutation",
        enforce: "pre",
        transform(code, source) {
            if (!source.replaceAll("\\", "/").endsWith(`/${mutation.file}`)) return;
            if (code.split(mutation.before).length !== 2)
                throw new Error(`Mutation anchor changed: ${id}`);
            return { code: code.replace(mutation.before, mutation.after), map: null };
        },
    };
};
