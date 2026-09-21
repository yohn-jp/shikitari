#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workflowDirectory = path.join(repoRoot, ".github", "workflows");
const externalAction = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*@[0-9a-f]{40}$/u;
const organizationWorkflow = /^yohn-jp\/.github\/\.github\/workflows\/[^@]+@main$/u;
const errors = [];

for (const fileName of fs
  .readdirSync(workflowDirectory)
  .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))) {
  const filePath = path.join(workflowDirectory, fileName);
  const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/u);
  lines.forEach((line, index) => {
    const match = line.match(/^\s*(?:-\s+)?uses:\s*(\S+)/u);
    if (match === null) return;
    const reference = match[1].replace(/#.*$/u, "");
    if (reference.startsWith("./") || organizationWorkflow.test(reference)) return;
    if (!externalAction.test(reference)) errors.push(`${filePath}:${index + 1}: invalid action reference ${reference}`);
  });
}

if (errors.length > 0) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log("GitHub Action reference validation passed.");
}
