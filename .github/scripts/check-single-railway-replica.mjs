import { readFileSync } from "node:fs";

const source = readFileSync(".railway/railway.ts", "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/.*$/gm, "");
const declarations = [...source.matchAll(/\breplicas\s*:\s*\{([^{}]*)\}/g)];

if (declarations.length !== 1) {
    throw new Error(`Expected exactly one replicas declaration, found ${declarations.length}.`);
}

const body = declarations[0][1];
const entryPattern = /(?:"[^"]+"|'[^']+'|[A-Za-z_$][\w$-]*)\s*:\s*(\d+)/g;
const entries = [...body.matchAll(entryPattern)];
const residue = body.replace(new RegExp(`${entryPattern.source}\\s*,?`, "g"), "").trim();

if (entries.length !== 1 || entries[0][1] !== "1" || residue) {
    throw new Error("The Railway service must declare exactly one region with one replica.");
}
