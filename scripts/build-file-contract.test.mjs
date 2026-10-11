import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import {
  BUILD_FILE_FORMAT,
  BUILD_FILE_VERSION,
  createBuildPayload,
  createVersionOneBuildPayload,
} from "../Broken_Ranks_Tool_Frontend/src/features/builds/buildPayload.js";

const readJson = async (relative) =>
  JSON.parse(await readFile(new URL(relative, import.meta.url), "utf8"));
const fixtures = "../Broken_Ranks_Tool_Frontend/src/test/fixtures/builds/";
const schema = await readJson("../docs/build-file-v1.schema.json");
const ajv = new Ajv({ allErrors: true, allowUnionTypes: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const golden = await readJson(`${fixtures}compatibility/v1-complete.json`);

// Input is intentionally independent of the golden output and of application defaults.
const editorState = () => ({
  requestData: {
    slots: {
      helmet: {
        itemId: "1",
        itemStars: 7,
        orbIds: ["50"],
        orbLevels: [1],
        drifIds: [60, null],
        drifLevels: { 0: 6 },
        transient: "not persisted",
      },
      armor: {
        itemId: 2,
        itemStars: 1,
        orbIds: [],
        orbLevels: [],
        drifIds: [],
        drifLevels: {},
      },
      weapon: {
        itemId: null,
        itemStars: 1,
        orbIds: [],
        orbLevels: [],
        drifIds: [],
        drifLevels: {},
      },
    },
    characterStats: {
      Siła: 14,
      Zręczność: 13,
      Moc: 12,
      Wiedza: 11,
      PŻ: 200,
      Mana: 200,
      Kondycja: 200,
      Obrażenia: 0,
    },
    pendingCalculation: true,
  },
  characterConfig: {
    level: 20,
    spentPoints: {
      Siła: 4,
      Zręczność: 3,
      Moc: 2,
      Wiedza: 1,
      PŻ: 0,
      Mana: 0,
      Kondycja: 0,
    },
    panelOpen: true,
  },
  lockedSlots: ["helmet"],
  lockedDrifs: { helmet: [0] },
  stats: { obsolete: 123 },
});

for (const file of [
  "compatibility/v1-complete.json",
  "compatibility/v1-minimal.json",
  "compatibility/v1-legacy-containers.json",
  "compatibility/v1-empty-orb-padding.json",
  "legacy-epic-build.json",
  "archer-endgame-build.json",
]) {
  test(`frozen v1 schema accepts saved fixture ${file}`, async () => {
    assert.equal(
      validate(await readJson(`${fixtures}${file}`)),
      true,
      ajv.errorsText(validate.errors),
    );
  });
}

test("frozen v1 exporter preserves the complete v1 document independently of editor state fields", () => {
  const payload = createVersionOneBuildPayload(editorState());
  assert.equal(BUILD_FILE_FORMAT, "broken-ranks-tool-build");
  assert.equal(payload.version, 1);
  assert.equal(validate(payload), true, ajv.errorsText(validate.errors));
  assert.deepEqual({ ...payload, exportedAt: golden.exportedAt }, golden);
});

test("a captured JSON save cannot be changed by subsequent editor updates", () => {
  const state = editorState();
  const payload = createVersionOneBuildPayload(state);
  state.requestData.slots.helmet.drifIds[0] = 999;
  state.requestData.characterStats.Siła = 999;
  state.characterConfig.spentPoints.Siła = 999;
  state.lockedSlots.push("armor");
  state.lockedDrifs.helmet.push(1);
  assert.deepEqual({ ...payload, exportedAt: golden.exportedAt }, golden);
});

test("v1 structural contract rejects accidental renames or removal of required document fields", () => {
  for (const field of ["format", "version", "build"]) {
    const changed = structuredClone(golden);
    changed[`renamed_${field}`] = changed[field];
    delete changed[field];
    assert.equal(validate(changed), false, field);
  }
  const changed = structuredClone(golden);
  changed.build.requestData.equipment = changed.build.requestData.slots;
  delete changed.build.requestData.slots;
  assert.equal(validate(changed), false);
});

test("v2 exports the backpack separately while retaining every frozen v1 equipment field", async () => {
  const fixture = await readJson(`${fixtures}compatibility/v2-backpack.json`);
  const validateV2 = ajv.compile(
    await readJson("../docs/build-file-v2.schema.json"),
  );
  assert.equal(validateV2(fixture), true, ajv.errorsText(validateV2.errors));
  const state = structuredClone(fixture.build);
  state.backpack[0].temporaryEditorState = true;
  const saved = createBuildPayload(state);
  assert.equal(BUILD_FILE_VERSION, 2);
  assert.deepEqual({ ...saved, exportedAt: fixture.exportedAt }, fixture);
  state.backpack[0].equipment.drifLevels[0] = 1;
  assert.equal(saved.build.backpack[0].equipment.drifLevels[0], 6);
  const empty = createBuildPayload(editorState());
  assert.deepEqual(empty.build, { ...golden.build, backpack: [] });
  assert.equal(validateV2(empty), true, ajv.errorsText(validateV2.errors));
  const renamed = structuredClone(fixture);
  renamed.build.inventory = renamed.build.backpack;
  delete renamed.build.backpack;
  assert.equal(validateV2(renamed), false);
});
