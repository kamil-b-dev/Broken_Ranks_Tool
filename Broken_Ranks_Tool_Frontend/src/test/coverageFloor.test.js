import { describe, expect, it } from "vitest";
import { checkCoverageFloors } from "../../scripts/coverage-floor.mjs";

const metrics = (pct = 100, total = 10) =>
    Object.fromEntries(
        ["statements", "branches", "functions", "lines"].map((key) => [key, { pct, total }])
    );

describe("per-file coverage policy", () => {
    it("ignores only counters without executable code, including V8 data modules", () => {
        expect(
            checkCoverageFloors({
                total: metrics(0),
                "src/domain.js": { ...metrics(), branches: { pct: 0, total: 0 } },
                "src/shared/i18n/en.json": metrics(0, 0),
            })
        ).toEqual([]);
    });
    it("still rejects untested executable lines and functions", () => {
        expect(checkCoverageFloors({ "src/domain.js": metrics(0) })).toEqual([
            "src/domain.js: statements 0% < 70%",
            "src/domain.js: branches 0% < 50%",
            "src/domain.js: functions 0% < 30%",
            "src/domain.js: lines 0% < 70%",
        ]);
    });
    it.each([
        "C:\\repo\\src\\features\\optimizer\\Report.jsx",
        "/repo/src/app/App.jsx",
        "src/features/optimizer/Report.jsx",
    ])("applies the stricter floor once to %s", (file) => {
        expect(checkCoverageFloors({ [file]: metrics(72) })).toEqual([
            `${file.replaceAll("\\", "/")}: statements 72% < 75%`,
            `${file.replaceAll("\\", "/")}: lines 72% < 75%`,
        ]);
    });
    it("does not accept an empty or malformed report as success", () => {
        expect(checkCoverageFloors({ total: metrics() })).toContain(
            "No source files with executable lines in coverage report."
        );
        expect(checkCoverageFloors({ "src/domain.js": { ...metrics(), lines: {} } })).toContain(
            "src/domain.js: invalid lines coverage"
        );
    });
});
