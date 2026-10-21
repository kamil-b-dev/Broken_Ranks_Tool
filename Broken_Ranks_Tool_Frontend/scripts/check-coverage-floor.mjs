import { readFile } from "node:fs/promises";
import { checkCoverageFloors } from "./coverage-floor.mjs";

const report = JSON.parse(
    await readFile(new URL("../coverage/coverage-summary.json", import.meta.url), "utf8")
);
const failures = checkCoverageFloors(report);

if (failures.length) {
    console.error(`Coverage floor failed:\n${failures.join("\n")}`);
    process.exitCode = 1;
} else {
    console.log("Per-file coverage floors passed.");
}
