import { spawnSync } from "node:child_process";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { mutationCases } from "./mutation-cases.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const cli = fileURLToPath(new URL("../node_modules/vitest/vitest.mjs", import.meta.url));
const run = (tests, mutation) =>
    spawnSync(
        process.execPath,
        [cli, "run", "--project=domain", "--maxWorkers=1", "--reporter=dot", ...tests],
        {
            cwd: root,
            encoding: "utf8",
            timeout: 60000,
            env: { ...process.env, BRT_TEST_MUTATION: mutation || "" },
        }
    );
const baseline = run([...new Set(mutationCases.map(({ test }) => test))]);
if (baseline.status !== 0) {
    console.error(baseline.stdout, baseline.stderr);
    throw new Error("Mutation audit baseline failed; no mutation results are valid.");
}
let failures = 0;
for (const mutation of mutationCases) {
    const result = run([mutation.test], mutation.id);
    // A transform/import error is not evidence that an assertion caught the defect.
    const caught =
        result.status === 1 &&
        /AssertionError|expected .* to|expected .*throw/i.test(result.stdout + result.stderr) &&
        !/Failed to load|Mutation anchor changed|Unknown test mutation/.test(
            result.stdout + result.stderr
        );
    console.log(`${caught ? "CAUGHT" : "FAILED"}: ${mutation.id}`);
    if (!caught) {
        failures++;
        console.error(result.stdout, result.stderr, result.error || "");
    }
}
process.exitCode = failures ? 1 : 0;
