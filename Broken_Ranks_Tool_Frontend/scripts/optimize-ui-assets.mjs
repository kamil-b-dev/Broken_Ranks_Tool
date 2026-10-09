import path from "node:path";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/assets");
const output = path.join(root, "ui");
await mkdir(output, { recursive: true });
const variants = [
    ["broken-ranks-crest.webp", "header-crest.webp", 192],
    ["broken-ranks-crest.webp", "stats-crest.webp", 416],
    ["equipment-slot-icons.webp", "equipment-slot-icons.webp", 768],
    ["character-stat-icons.webp", "character-stat-icons.webp", 576],
    ...["home", "equipment-builder", "drif-optimizer", "local-builds"].map((name) => [
        `navigation-icons/${name}.png`,
        `${name}.webp`,
        96,
    ]),
    ...[
        "drif-defensive",
        "drif-offensive",
        "drif-utility",
        "orb-defensive",
        "orb-offensive",
        "orb-utility",
    ].map((name) => [`category-icons/${name}.webp`, `${name}.webp`, 144]),
    ...[
        "brushed-bronze-texture",
        "builder-page-backdrop-texture",
        "crimson-lacquer-texture",
        "dark-basalt-texture",
        "database-panel-backdrop-texture",
        "equipment-config-backdrop-texture",
        "equipment-workbench-texture",
        "hammered-black-iron-texture",
        "panel-aged-leather-texture",
        "panel-blackened-steel-texture",
        "panel-oxblood-texture",
        "smoked-parchment-texture",
    ].map((name) => [`${name}.webp`, `${name}.webp`, 768]),
];
for (const [source, target, width] of variants) {
    await sharp(path.join(root, source))
        .resize({ width, withoutEnlargement: true })
        .webp({ effort: 6, quality: 88, alphaQuality: 98 })
        .toFile(path.join(output, target));
}
console.log(`Generated ${variants.length} UI assets.`);
