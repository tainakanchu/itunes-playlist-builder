import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { zodToJsonSchema } from "zod-to-json-schema";
import { rulesFileSchema } from "../src/ruleSchema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const jsonSchema = zodToJsonSchema(rulesFileSchema, {
  name: "RulesFile",
  $refStrategy: "root", // use $ref for recursive condition schemas
});

const outPath = resolve(__dirname, "..", "rules.schema.json");
writeFileSync(outPath, JSON.stringify(jsonSchema, null, 2) + "\n");
console.log(`Generated: ${outPath}`);
