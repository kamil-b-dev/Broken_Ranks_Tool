import assert from "node:assert/strict";
import { createContractValidator, loadApiContract } from "./api-contract.mjs";

const baseUrl = process.argv[2] || "http://127.0.0.1:8082";
const validate = createContractValidator(await loadApiContract());
async function json(url, schema, body) {
  const response = await fetch(
    new URL(url, baseUrl),
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : undefined,
  );
  assert.equal(response.status, 200, `${url}: HTTP ${response.status}`);
  const value = await response.json();
  validate(schema, value);
  return value;
}

const initial = await json("/api/initial-data", "InitialData");
await json("/api/rules", "PublicGameRules");
const item = initial.items.find(
  (candidate) =>
    candidate.category === "HELMET" &&
    candidate.rarity === "RARE" &&
    candidate.capacity > 0,
);
assert.ok(
  item,
  "The catalog must contain an ordinary helmet for the integration fixture",
);
const setup = {
  slots: {
    helmet: {
      itemId: item.id,
      itemStars: 1,
      drifIds: [],
      drifLevels: {},
      orbIds: [],
      orbLevels: [],
    },
  },
  characterStats: {},
};
await json("/api/calculator/calculate", "CalculationResult", setup);
const optimizer = await json("/api/optimizer/drifs", "OptimizationResponse", {
  originalSlots: setup.slots,
  priorities: { CRITICAL_CHANCE: 30 },
  targetQuantities: { CRITICAL_CHANCE: { min: 0, max: 1 } },
});
assert.equal(optimizer.summary.success, true, optimizer.summary.message);
assert.deepEqual(
  await json(
    "/api/calculator/calculate",
    "CalculationResult",
    optimizer.optimizedSetup,
  ),
  optimizer.calculationResult,
);
const advisor = await json("/api/optimizer/drifs", "OptimizationResponse", {
  mode: "ADVISOR",
  originalSlots: optimizer.optimizedSetup.slots,
  priorities: { CRITICAL_CHANCE: 30 },
  advisor: {
    goal: "CRITICAL_CHANCE",
    maxActions: 1,
    allowedChanges: {
      stars: false,
      items: false,
      drifs: false,
      drifUpgrades: false,
    },
  },
});
assert.ok(
  advisor.advisorReport,
  "Advisor mode must return its typed search report",
);
console.log(
  "Catalog, calculator, optimizer and advisor satisfy the OpenAPI DTO schemas.",
);
