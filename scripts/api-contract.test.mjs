import assert from "node:assert/strict";
import test from "node:test";
import { createContractValidator, loadApiContract } from "./api-contract.mjs";

const document = await loadApiContract();
const validate = createContractValidator(document);
test("reorganization tasks type the selected upgrade and relative modifier protections", () => {
  const options = {
    task: "UPGRADE",
    goal: "CRITICAL_CHANCE",
    allowUnequip: false,
    upgrade: { sourceSlotKey: "helmet", sourceDrifIndex: 0, targetTemplateId: 12, targetLevel: 21 },
    protectedModifiers: { MANA_REGEN: { enabled: true, loss: 1.5 } },
  };
  validate("OptimizationRequest", { mode: "REORGANIZE", originalSlots: { helmet: { itemId: 1 } }, reorganization: options });
  validate("ReorganizationOptions", { task: "UPGRADE", upgrades: [{ ...options.upgrade, maximizeLevel: true }], preferFewestMoves: true });
  validate("ReorganizationOptions", { task: "INSERT", insertEntryId: "chosen" });
  validate("ReorganizationOptions", { task: "RESERVE", reservation: { slotKey: "armor", freeSockets: 1, freeCapacity: 8 } });
  assert.throws(() => validate("ReorganizationOptions", { task: "RESERVE", reservation: { slotKey: "armor", freeSockets: 4 } }));
  assert.throws(() => validate("ReorganizationOptions", { task: "UPGRADE", upgrades: [{ ...options.upgrade, targetLevel: 22 }] }));
  for (const invalid of [
    { ...options, task: "UNKNOWN" },
    { ...options, upgrade: { ...options.upgrade, sourceSlotKey: "unknown" } },
    { ...options, upgrade: { ...options.upgrade, targetLevel: 22 } },
    { ...options, upgrade: { ...options.upgrade, sourceDrifIndex: -1 } },
    { ...options, upgrade: { ...options.upgrade, otherStone: true } },
    { ...options, protectedModifiers: { MANA_REGEN: { enabled: true, loss: -1 } } },
    { ...options, protectedModifiers: { UNKNOWN: { enabled: true, loss: 0 } } },
  ]) assert.throws(() => validate("ReorganizationOptions", invalid));
});
test("progression accepts one target, restricts res slots, and keeps search claims explicit", () => {
  const request = {
    characterClass: "ARCHER",
    targetLevel: 140,
    targetEquipment: { slots: {} },
    resSlots: ["ring1"],
  };
  validate("ProgressionPlanRequest", request);
  validate("ProgressionPlanRequest", { ...request, balanceStats: true });
  validate("ProgressionPlanRequest", { ...request, balanceStats: false });
  validate("ProgressionPlanRequest", { ...request, minItemLevelGap: 20 });
  validate("ProgressionPlanRequest", { ...request, minItemLevelGap: 0 });
  validate("ProgressionPlanRequest", { ...request, minItemLevelGap: 140 });
  for (const invalid of [
    { ...request, targetLevel: 0 },
    { ...request, balanceStats: "true" },
    { ...request, minItemLevelGap: -1 },
    { ...request, minItemLevelGap: 141 },
    { ...request, minItemLevelGap: 1.5 },
    { ...request, targetLevel: 141 },
    { ...request, stages: [] },
    { ...request, resSlots: ["weapon"] },
    { ...request, resSlots: ["ring1", "ring1"] },
    { ...request, targetEquipment: { slots: {}, unexpected: true } },
  ])
    assert.throws(() => validate("ProgressionPlanRequest", invalid));
  const result = {
    outcome: "NO_PATH_FOUND",
    stages: [],
    remainingDrifs: [],
    warnings: [],
    resSlots: [],
    searchReport: {
      stopReason: "BACKWARD_PROJECTION",
      evaluatedCandidates: 0,
      beamWidth: 6,
      elapsedMillis: 1,
      proofComplete: false,
    },
  };
  validate("ProgressionPlanResponse", result);
  validate("ProgressionPlanResponse", {
    ...result,
    searchReport: { ...result.searchReport, stopReason: "BALANCED_BACKWARD_PROJECTION" },
  });
  assert.throws(() =>
    validate("ProgressionPlanResponse", {
      ...result,
      searchReport: { ...result.searchReport, proofComplete: true },
    }),
  );
});
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

test("reorganization accepts exact equipped or backpack sources, never both", () => {
  validate("OptimizationRequest", {
    mode: "REORGANIZE",
    configurationMode: "ADVANCED",
    originalSlots: { helmet: { itemId: 1 } },
    backpackDrifs: [],
  });
  const usage = {
    entryId: null,
    sourceSlotKey: "armor",
    sourceDrifIndex: 0,
    slotKey: "helmet",
    drifIndex: 1,
  };
  for (const valid of [
    usage,
    { ...usage, entryId: "owned", sourceSlotKey: null, sourceDrifIndex: null },
  ])
    validate("OptimizationResponse", {
      ...response,
      reorganizationDrifUsages: [valid],
    });
  for (const invalid of [
    { ...usage, entryId: "owned" },
    { ...usage, sourceDrifIndex: null },
    { ...usage, slotKey: "unknown" },
    { ...usage, drifIndex: -1 },
  ])
    assert.throws(() =>
      validate("OptimizationResponse", {
        ...response,
        reorganizationDrifUsages: [invalid],
      }),
    );
});

test("backpack substitutions preserve the standard upgrade target and exact occurrence mappings", () => {
  const usage = { entryId: "owned", slotKey: "boots", drifIndex: 0 };
  validate("OptimizationResponse", {
    ...response,
    targetSetup: { slots: {} },
    backpackDrifUsages: [usage],
  });
  validate("OptimizationResponse", {
    ...response,
    targetSetup: null,
    backpackDrifUsages: null,
  });
  for (const invalid of [
    { ...usage, drifIndex: -1 },
    { ...usage, slotKey: "invalid" },
    { ...usage, entryId: "" },
    { slotKey: "boots", drifIndex: 0 },
  ])
    assert.throws(() =>
      validate("OptimizationResponse", {
        ...response,
        backpackDrifUsages: [invalid],
      }),
    );
});

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
