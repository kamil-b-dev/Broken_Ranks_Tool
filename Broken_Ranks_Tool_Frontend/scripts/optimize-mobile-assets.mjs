import path from "node:path";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const assetsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src/assets");
const outputRoot = path.join(assetsRoot, "mobile");
await mkdir(outputRoot, { recursive: true });

// Three physical pixels per CSS pixel for the mobile crest, navigation and slot icons.
const variants = [
    ["broken-ranks-crest.webp", "broken-ranks-crest.webp", 120],
    ["equipment-slot-icons.webp", "equipment-slot-icons.webp", 576],
    ["builder-page-backdrop-texture.webp", "builder-page-backdrop-texture.webp", 768],
    ...[
        "brushed-bronze-texture",
        "panel-blackened-steel-texture",
        "panel-aged-leather-texture",
        "crimson-lacquer-texture",
        "smoked-parchment-texture",
    ].map((name) => [`${name}.webp`, `${name}.webp`, 512]),
    ...["home", "equipment-builder", "drif-optimizer", "local-builds"].map((name) => [
        `navigation-icons/${name}.png`,
        `${name}.webp`,
        72,
    ]),
];

for (const [source, target, width] of variants) {
    await sharp(path.join(assetsRoot, source))
        .resize({ width, withoutEnlargement: true })
        .webp({ effort: 6, quality: 86, alphaQuality: 95 })
        .toFile(path.join(outputRoot, target));
}
console.log(`Generated ${variants.length} mobile assets.`);
