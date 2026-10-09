import assert from "node:assert/strict";
import test from "node:test";
import { createContractValidator, loadApiContract } from "./api-contract.mjs";

const document = await loadApiContract();
const validate = createContractValidator(document);
const summary = {
  success: false,
  message: "Invalid constraints",
  drifsPlaced: 0,
  totalPowerUsed: 0,
  executionTimeSeconds: 0,
  warnings: [],
  itemsByDrifBonus: {},
  goalResults: [],
  nextVariants: [],
};
const response = {
  optimizedSetup: { slots: {} },
  summary,
  calculationResult: null,
  advisorReport: null,
};

test("legacy optimizer requests may omit the defaulted mode", () => {
  validate("OptimizationRequest", { originalSlots: { helmet: { itemId: 1 } } });
  assert.throws(() =>
    validate("OptimizationRequest", { originalSlots: {}, mode: "UNKNOWN" }),
  );
  assert.throws(() => validate("SimpleOptions", { damageDrifs: 13 }));
});

test("a business failure is a valid response, but malformed DTOs are rejected", () => {
  validate("OptimizationResponse", response);
  assert.throws(() =>
    validate("OptimizationResponse", {
      ...response,
      summary: { ...summary, success: "false" },
    }),
  );
  const missing = structuredClone(response);
  delete missing.summary.drifsPlaced;
  assert.throws(() => validate("OptimizationResponse", missing));
  assert.throws(() =>
    validate("OptimizationResponse", {
      ...response,
      calculationResult: {
        stats: { HP: 100 },
        drifCategories: {},
        orbBonusTypes: [],
      },
    }),
  );
});

test("nested variant and advisor structures cannot be arbitrary objects", () => {
  assert.throws(() =>
    validate("OptimizationResponse", {
      ...response,
      summary: { ...summary, nextVariants: [{ bonusName: "CRITICAL_CHANCE" }] },
    }),
  );
  assert.throws(() =>
    validate("OptimizationResponse", {
      ...response,
      advisorReport: { status: "GUARANTEED" },
    }),
  );
  assert.throws(() =>
    validate("InitialData", {
      items: [{ id: "1" }],
      orbs: [],
      drifs: [],
      gameRules: {},
      dictionaries: {},
    }),
  );
});

test("endpoint responses use the DTO schemas and declared project license", () => {
  assert.equal(document.info.license.name, "AGPL-3.0-only");
  assert.equal(
    document.paths["/api/optimizer/drifs"].post.responses["200"].content[
      "application/json"
    ].schema.$ref,
    "#/components/schemas/OptimizationResponse",
  );
});
