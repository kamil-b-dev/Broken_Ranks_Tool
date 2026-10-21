const floors = [
    {
        name: "all source files",
        matches: () => true,
        minimums: { statements: 70, branches: 50, functions: 30, lines: 70 },
    },
    {
        name: "application and optimizer files",
        matches: (path) => /(?:^|\/)src\/(?:app|features\/optimizer)\//u.test(path),
        minimums: { statements: 75, branches: 50, functions: 50, lines: 75 },
    },
];

export function checkCoverageFloors(report) {
    const failures = [];
    let measuredFiles = 0;
    for (const [file, coverage] of Object.entries(report)) {
        if (file === "total") continue;
        const normalizedFile = file.replaceAll("\\", "/");
        if (coverage.lines?.total > 0) measuredFiles++;
        const minimums = {};
        for (const floor of floors.filter(({ matches }) => matches(normalizedFile))) {
            for (const [metric, minimum] of Object.entries(floor.minimums)) {
                minimums[metric] = Math.max(minimums[metric] || 0, minimum);
            }
        }
        for (const [metric, minimum] of Object.entries(minimums)) {
            const value = coverage[metric];
            // V8 can report imported data modules with no executable counters and pct=0.
            // There is nothing to exercise for a metric whose denominator is zero.
            if (value?.total === 0) continue;
            if (!Number.isFinite(value?.total) || value.total < 0 || !Number.isFinite(value.pct)) {
                failures.push(`${normalizedFile}: invalid ${metric} coverage`);
            } else if (value.pct < minimum) {
                failures.push(`${normalizedFile}: ${metric} ${value.pct}% < ${minimum}%`);
            }
        }
    }
    if (!measuredFiles) failures.push("No source files with executable lines in coverage report.");
    return failures;
}
