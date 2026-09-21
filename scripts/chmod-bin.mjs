#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));

for (const relativeTarget of Object.values(packageJson.bin ?? {})) {
  const target = path.join(repoRoot, relativeTarget);
  const stat = fs.statSync(target);
  fs.chmodSync(target, stat.mode | 0o111);
  console.log(`chmod +x ${relativeTarget}`);
}
