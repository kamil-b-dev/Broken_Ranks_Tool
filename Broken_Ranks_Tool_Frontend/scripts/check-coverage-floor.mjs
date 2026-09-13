import { readFile } from "node:fs/promises";

const report = JSON.parse(
    await readFile(new URL("../coverage/coverage-summary.json", import.meta.url), "utf8")
);
const floors = [
    {
        name: "all source files",
        matches: () => true,
        minimums: { statements: 70, branches: 50, functions: 30, lines: 70 },
    },
    {
        name: "application and optimizer files",
        matches: (path) => /\/src\/(?:app|features\/optimizer)\//u.test(path),
        minimums: { statements: 75, branches: 50, functions: 50, lines: 75 },
    },
];
const failures = [];

for (const [file, coverage] of Object.entries(report)) {
    if (file === "total") continue;
    const normalizedFile = file.replaceAll("\\", "/");
    for (const floor of floors.filter(({ matches }) => matches(normalizedFile))) {
        for (const [metric, minimum] of Object.entries(floor.minimums)) {
            const actual = coverage[metric].pct;
            if (actual < minimum) {
                failures.push(
                    `${normalizedFile}: ${metric} ${actual}% < ${minimum}% (${floor.name})`
                );
            }
        }
    }
}

if (failures.length) {
    console.error(`Coverage floor failed:\n${failures.join("\n")}`);
    process.exitCode = 1;
} else {
    console.log("Per-file coverage floors passed.");
}
