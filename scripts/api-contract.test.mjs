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

test("calculator and optimizer accept localized intelligence with the usual value bounds", () => {
  for (const characterStats of [
    null,
    {},
    { Inteligencja: 10 },
    { INTELIGENCJA: 35 },
  ]) {
    validate("EquipmentRequest", { slots: {}, characterStats });
    validate("OptimizationRequest", {
      originalSlots: { helmet: { itemId: 1 } },
      characterStats,
    });
  }
  for (const characterStats of [
    { Inteligencja: -1 },
    { Inteligencja: 50001 },
    { Inteligencja: 10.5 },
    { intelligence: 10 },
  ]) {
    assert.throws(() =>
      validate("EquipmentRequest", { slots: {}, characterStats }),
    );
    assert.throws(() =>
      validate("OptimizationRequest", {
        originalSlots: { helmet: { itemId: 1 } },
        characterStats,
      }),
    );
  }
});

test("legacy optimizer requests may omit the defaulted mode", () => {
  validate("OptimizationRequest", { originalSlots: { helmet: { itemId: 1 } } });
  assert.throws(() =>
    validate("OptimizationRequest", { originalSlots: {}, mode: "UNKNOWN" }),
  );
  assert.throws(() => validate("SimpleOptions", { damageDrifs: 13 }));
});

test("API request DTOs reject unexpected fields at every fixed object boundary", () => {
  assert.throws(() =>
    validate("EquipmentRequest", { slots: {}, unexpected: true }),
  );
  assert.throws(() =>
    validate("EquipmentRequest", {
      slots: { helmet: { itemId: 1, unexpected: true } },
    }),
  );
  assert.throws(() =>
    validate("OptimizationRequest", {
      originalSlots: { helmet: { itemId: 1 } },
      unexpected: true,
    }),
  );
  assert.throws(() =>
    validate("AdvisorOptions", {
      goal: "CRITICAL_CHANCE",
      allowedChanges: { unexpected: true },
    }),
  );
  assert.throws(() =>
    validate("AdvisorOptions", {
      goal: "CRITICAL_CHANCE",
      protectedModifiers: { DAMAGE_PHYSICAL: { unexpected: true } },
    }),
  );
});

test("advisor cancellation declares full UUID credentials and only a null JSON body", () => {
  const endpoint = document.paths["/api/optimizer/advisor/{runId}/cancel"].post;
  assert.equal(endpoint.requestBody.required, false);
  assert.deepEqual(endpoint.requestBody.content["application/json"].schema, {
    type: "null",
  });
  for (const parameter of endpoint.parameters) {
    const pattern = new RegExp(parameter.schema.pattern);
    assert.equal(pattern.test("1-1-1-1-1"), false);
    assert.equal(pattern.test("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"), true);
  }
});

test("advisor purchase scope and benefit limit are typed and optional for legacy requests", () => {
  validate("AdvisorOptions", { goal: "CRITICAL_CHANCE" });
  for (const purchaseScope of ["GOAL_ONLY", "GOAL_AND_PROTECTED", "ANY"]) {
    validate("AdvisorOptions", {
      goal: "CRITICAL_CHANCE",
      purchaseScope,
      limitBenefitToTarget: true,
    });
  }
  assert.throws(() =>
    validate("AdvisorOptions", {
      goal: "CRITICAL_CHANCE",
      purchaseScope: "UNLIMITED",
    }),
  );
  assert.throws(() =>
    validate("AdvisorOptions", {
      goal: "CRITICAL_CHANCE",
      limitBenefitToTarget: "yes",
    }),
  );
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

test("optimizer outcomes and search measurements extend legacy responses with typed metadata", () => {
  for (const outcome of [
    "INVALID_INPUT",
    "NO_BUILD_FOUND",
    "VALID_BUILD_SOFT_TARGETS_UNMET",
    "VALID_BUILD",
  ])
    validate("OptimizationResponse", {
      ...response,
      summary: {
        ...summary,
        outcome,
        searchReport: {
          stopReason: "OPERATION_LIMIT",
          proofComplete: false,
          budgets: {
            beam: { initial: 10, consumed: 10, remaining: 0, exhausted: true },
          },
          generatedNeighborhoodStates: 0,
          evaluatedStates: 1,
          verifiedStates: 1,
          evaluationCacheHits: 0,
          calculatorCacheHits: 0,
          peakEvaluationCacheEntries: 1,
          peakCalculatorCacheEntries: 1,
          peakDrifCacheEntries: 1,
          stageSeconds: { construction: 0.01 },
        },
      },
    });
  assert.throws(() =>
    validate("OptimizationSummary", { ...summary, outcome: "OPTIMAL" }),
  );
  assert.throws(() =>
    validate("OptimizationSearchReport", { stopReason: "TIMEOUT" }),
  );
  assert.throws(() =>
    validate("OptimizationSearchReport", { evaluatedStates: -1 }),
  );
});

test("advisor structured actions distinguish drif occurrences and preserve display labels", () => {
  const action = {
    type: "UPGRADE_DRIF",
    slotKey: "boots",
    fromItemId: null,
    toItemId: null,
    fromStars: null,
    toStars: null,
    drifs: [
      {
        identity: "initial:helmet:0",
        drifId: 10,
        from: { slotKey: "boots", socketIndex: 0 },
        to: { slotKey: "boots", socketIndex: 0 },
        fromLevel: 1,
        toLevel: 16,
      },
    ],
  };
  validate("AdvisorAction", action);
  validate("AdvisorPlan", {
    kind: "ONE_UPGRADE",
    actions: ["Ulepsz drif"],
    upgrades: 1,
    targetReached: true,
    drifCounts: { CRITICAL_CHANCE: 1 },
    actionDetails: [action],
  });
  assert.throws(() => validate("AdvisorAction", { ...action, type: "DELETE" }));
  assert.throws(() =>
    validate("AdvisorAction", {
      ...action,
      drifs: [
        { ...action.drifs[0], to: { slotKey: "boots", socketIndex: -1 } },
      ],
    }),
  );
});
