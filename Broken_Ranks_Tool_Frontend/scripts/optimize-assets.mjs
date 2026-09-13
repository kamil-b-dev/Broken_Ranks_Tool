import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assetsRoot = path.join(projectRoot, "src", "assets");

const lossyAssets = [
    "broken-ranks-crest.png",
    "builder-page-backdrop-texture.png",
    "brushed-bronze-texture.png",
    "crimson-lacquer-texture.png",
    "dark-basalt-texture.png",
    "database-panel-backdrop-texture.png",
    "equipment-config-backdrop-texture.png",
    "equipment-workbench-texture.png",
    "hammered-black-iron-texture.png",
    "panel-aged-leather-texture.png",
    "panel-blackened-steel-texture.png",
    "panel-oxblood-texture.png",
    "smoked-parchment-texture.png",
    "category-icons/drif-defensive.png",
    "category-icons/drif-offensive.png",
    "category-icons/drif-utility.png",
    "category-icons/orb-defensive.png",
    "category-icons/orb-offensive.png",
    "category-icons/orb-utility.png",
];

const detailAssets = [
    "bronze-ornament-divider.png",
    "character-stat-icons.png",
    "equipment-silhouette.png",
    "equipment-slot-icons.png",
];

const targetPath = (relativePath) =>
    path.join(assetsRoot, relativePath.replace(/\.png$/u, ".webp"));

const optimize = async (relativePath, options) => {
    const source = path.join(assetsRoot, relativePath);
    try {
        await access(source);
    } catch {
        return false;
    }

    const target = targetPath(relativePath);
    await mkdir(path.dirname(target), { recursive: true });
    await sharp(source).webp(options).toFile(target);
    return true;
};

const lossyResults = await Promise.all(
    lossyAssets.map(async (relativePath) => {
        return optimize(relativePath, { effort: 6, quality: 84, alphaQuality: 92 });
    })
);

const detailResults = await Promise.all(
    detailAssets.map(async (relativePath) => {
        return optimize(relativePath, {
            effort: 6,
            quality: 92,
            alphaQuality: 100,
            smartSubsample: true,
        });
    })
);

if (lossyResults[0]) {
    await mkdir(path.join(projectRoot, "public"), { recursive: true });
    await sharp(path.join(assetsRoot, "broken-ranks-crest.png"))
        .resize(96, 96, { fit: "contain" })
        .webp({ effort: 6, quality: 90, alphaQuality: 95 })
        .toFile(path.join(projectRoot, "public", "favicon.webp"));
}

const optimizedCount = [...lossyResults, ...detailResults].filter(Boolean).length;
console.log(`Optimized ${optimizedCount} assets.`);
