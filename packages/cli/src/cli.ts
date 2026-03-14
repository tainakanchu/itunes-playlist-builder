#!/usr/bin/env node

import { Command } from "commander";
import {
  buildLibrary,
  previewLibrary,
  renderPreview,
  renderPreviewJson,
} from "@itunes-playlist-builder/core";

const program = new Command();

program
  .name("itunes-playlist-builder")
  .description(
    "Build declarative playlists from iTunes Library.xml and rules YAML"
  )
  .version("0.1.0");

program
  .command("build")
  .description("Build playlists and write output XML")
  .requiredOption("-i, --input <path>", "Path to iTunes Library.xml")
  .requiredOption("-r, --rules <path>", "Path to rules YAML file")
  .requiredOption("-o, --output <path>", "Path for output XML file")
  .option("--dry-run", "Evaluate and preview without writing")
  .action(async (opts) => {
    try {
      if (opts.dryRun) {
        const result = await previewLibrary({
          inputXmlPath: opts.input,
          rulesPath: opts.rules,
        });
        console.log(renderPreview(result));
        console.log("\n(dry-run: no file written)");
        return;
      }

      const result = await buildLibrary({
        inputXmlPath: opts.input,
        rulesPath: opts.rules,
        outputXmlPath: opts.output,
      });

      console.log(`Build complete.`);
      console.log(`  Generated playlists: ${result.generatedPlaylistCount}`);
      console.log(`  Generated folders: ${result.generatedFolderCount}`);
      console.log(`  Output: ${result.outputXmlPath}`);
    } catch (e) {
      console.error(
        `Error: ${e instanceof Error ? e.message : String(e)}`
      );
      process.exit(1);
    }
  });

program
  .command("preview")
  .description("Preview generated playlist structure")
  .requiredOption("-i, --input <path>", "Path to iTunes Library.xml")
  .requiredOption("-r, --rules <path>", "Path to rules YAML file")
  .option("--json", "Output as JSON")
  .option("--verbose", "Print resolved rule summary")
  .action(async (opts) => {
    try {
      const result = await previewLibrary({
        inputXmlPath: opts.input,
        rulesPath: opts.rules,
      });

      if (opts.json) {
        console.log(renderPreviewJson(result));
      } else {
        console.log(renderPreview(result));
      }
    } catch (e) {
      console.error(
        `Error: ${e instanceof Error ? e.message : String(e)}`
      );
      process.exit(1);
    }
  });

program.parse();
