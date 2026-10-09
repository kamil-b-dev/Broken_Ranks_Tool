import { readFile } from "node:fs/promises";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import YAML from "yaml";

export async function loadApiContract() {
  return YAML.parse(
    await readFile(new URL("../docs/openapi.yaml", import.meta.url), "utf8"),
  );
}

export function createContractValidator(document) {
  const ajv = new Ajv({
    strict: false,
    allErrors: true,
    allowUnionTypes: true,
  });
  addFormats(ajv);
  const validators = new Map();
  for (const name of Object.keys(document.components.schemas)) {
    validators.set(
      name,
      ajv.compile({
        components: document.components,
        $ref: `#/components/schemas/${name}`,
      }),
    );
  }
  return (name, value) => {
    const validate = validators.get(name);
    if (!validate) throw new Error(`Unknown API schema: ${name}`);
    if (!validate(value)) {
      throw new Error(
        `${name}: ${ajv.errorsText(validate.errors, { separator: "\n" })}`,
      );
    }
  };
}
