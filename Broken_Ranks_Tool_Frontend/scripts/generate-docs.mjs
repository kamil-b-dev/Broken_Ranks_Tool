import { existsSync, lstatSync, mkdirSync, mkdtempSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docsRoot = path.join(projectRoot, "docs");
const destination = path.join(docsRoot, "jsdoc");

const requireOwnedOutput = (directory) => {
    const resolved = path.resolve(directory);
    const name = path.basename(resolved);
    if (path.dirname(resolved) !== docsRoot || (name !== "jsdoc" && !name.startsWith(".jsdoc-"))) {
        throw new Error("Refusing to modify a directory outside the generated JSDoc output.");
    }
    if (existsSync(resolved) && lstatSync(resolved).isSymbolicLink()) {
        throw new Error("Generated documentation directories must not be symbolic links.");
    }
    return resolved;
};

mkdirSync(docsRoot, { recursive: true });
requireOwnedOutput(destination);
const staging = mkdtempSync(path.join(docsRoot, ".jsdoc-stage-"));
const previous = `${staging}-previous`;
let oldOutputMoved = false;
let published = false;

try {
    const result = spawnSync(
        process.execPath,
        [path.join(projectRoot, "node_modules/jsdoc/jsdoc.js"), "-c", "jsdoc.json", "-d", staging],
        { cwd: projectRoot, stdio: "inherit" }
    );
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`JSDoc exited with code ${result.status}.`);
    if (!existsSync(path.join(staging, "index.html")))
        throw new Error("JSDoc did not generate its index.");

    if (existsSync(destination)) {
        renameSync(requireOwnedOutput(destination), requireOwnedOutput(previous));
        oldOutputMoved = true;
    }
    try {
        renameSync(requireOwnedOutput(staging), requireOwnedOutput(destination));
        published = true;
    } catch (error) {
        if (oldOutputMoved)
            renameSync(requireOwnedOutput(previous), requireOwnedOutput(destination));
        throw error;
    }
} finally {
    rmSync(requireOwnedOutput(staging), { recursive: true, force: true });
    if (published && oldOutputMoved)
        rmSync(requireOwnedOutput(previous), { recursive: true, force: true });
}

console.log("Generated JSDoc documentation without retaining obsolete source pages.");
