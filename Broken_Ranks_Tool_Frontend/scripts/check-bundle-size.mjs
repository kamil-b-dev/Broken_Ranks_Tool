import { readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = path.join(projectRoot, "dist", "assets");
const maximumAssetBytes = 1_000_000;
const maximumBundleBytes = 12_000_000;

const entries = await readdir(assetsRoot, { withFileTypes: true });
const files = await Promise.all(
    entries
        .filter((entry) => entry.isFile())
        .map(async (entry) => {
            const filePath = path.join(assetsRoot, entry.name);
            return { name: entry.name, size: (await stat(filePath)).size };
        })
);

const oversizedAssets = files.filter(({ size }) => size > maximumAssetBytes);
const bundleSize = files.reduce((total, { size }) => total + size, 0);

if (oversizedAssets.length > 0 || bundleSize > maximumBundleBytes) {
    const details = oversizedAssets
        .map(({ name, size }) => `${name}: ${(size / 1_000_000).toFixed(2)} MB`)
        .join("\n");
    throw new Error(
        [
            `Frontend assets exceed the size budget (${(bundleSize / 1_000_000).toFixed(2)} MB total).`,
            details,
        ]
            .filter(Boolean)
            .join("\n")
    );
}

console.log(`Bundle size is within budget: ${(bundleSize / 1_000_000).toFixed(2)} MB.`);
