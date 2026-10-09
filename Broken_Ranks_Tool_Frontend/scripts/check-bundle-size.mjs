import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkOutputBudget } from "./bundle-size-budget.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputRoot = path.join(projectRoot, "dist");

async function collectFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    return (
        await Promise.all(
            entries.map(async (entry) => {
                const filePath = path.join(directory, entry.name);
                if (entry.isDirectory()) return collectFiles(filePath);
                if (!entry.isFile()) throw new Error(`Unexpected non-file output: ${filePath}`);
                return [
                    {
                        name: path.relative(outputRoot, filePath).split(path.sep).join("/"),
                        size: (await stat(filePath)).size,
                    },
                ];
            })
        )
    ).flat();
}

const budget = checkOutputBudget(await collectFiles(outputRoot));
console.log(
    `Output within budget: ${(budget.total / 1_000_000).toFixed(2)} MB total; ${(budget.page / 1_000_000).toFixed(2)} MB page assets; ${(budget.social / 1_000_000).toFixed(2)} MB social cards.`
);
