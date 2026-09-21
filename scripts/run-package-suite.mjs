#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { cwd: repoRoot, encoding: "utf8", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} exited with ${result.status}`);
  return result;
}

function parsePackInfo(stdout, packageName) {
  const parsed = JSON.parse(stdout);
  return Array.isArray(parsed) ? parsed[0] : parsed[packageName];
}

const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
if (!fs.existsSync(path.join(repoRoot, "dist", "index.js"))) {
  throw new Error("dist is missing; run pnpm run build before the package suite");
}

const packInfo = parsePackInfo(
  run("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"]).stdout,
  packageJson.name,
);
const packedFiles = packInfo.files.map((entry) => entry.path);
for (const binPath of Object.values(packageJson.bin ?? {})) {
  if (!packedFiles.includes(binPath)) throw new Error(`bin entry is not included in the packed tarball: ${binPath}`);
  if ((fs.statSync(path.join(repoRoot, binPath)).mode & 0o100) === 0) {
    throw new Error(`bin entry is not executable: ${binPath}`);
  }
}

console.log(`package contents verified: ${packedFiles.length} file(s).`);
run(process.execPath, ["scripts/smoke-test.mjs"], { stdio: "inherit" });
