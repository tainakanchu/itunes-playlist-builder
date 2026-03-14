import { readFileSync } from "node:fs";
import YAML from "yaml";
import { rulesFileSchema, type RulesFile } from "./ruleSchema.js";
import { RuleValidationError } from "./errors.js";

export function parseRulesYaml(yamlContent: string): RulesFile {
  let raw: unknown;
  try {
    raw = YAML.parse(yamlContent);
  } catch (e) {
    throw new RuleValidationError(
      `Failed to parse YAML: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  const result = rulesFileSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new RuleValidationError(`Rule validation failed:\n${issues}`);
  }

  return result.data;
}

export function parseRulesFile(filePath: string): RulesFile {
  const content = readFileSync(filePath, "utf-8");
  return parseRulesYaml(content);
}
