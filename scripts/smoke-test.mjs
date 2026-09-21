#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: "utf8", ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed:\n${result.stdout}\n${result.stderr}`);
  return result;
}

function parsePackInfo(stdout) {
  const parsed = JSON.parse(stdout);
  return Array.isArray(parsed) ? parsed[0] : parsed[packageJson.name];
}

const packInfo = parsePackInfo(run("npm", ["pack", "--json", "--ignore-scripts"], { cwd: repoRoot }).stdout);
const tarballPath = path.join(repoRoot, packInfo.filename);
const installDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "shikitari-smoke-"));

try {
  fs.writeFileSync(
    path.join(installDirectory, "package.json"),
    JSON.stringify({ name: "smoke-consumer", version: "0.0.0" }),
  );
  run("npm", ["install", "--no-save", "--ignore-scripts", tarballPath], { cwd: installDirectory });

  const launcher = path.join(installDirectory, "node_modules", ".bin", "shikitari");
  if (!fs.existsSync(launcher)) throw new Error(`installed launcher is missing: ${launcher}`);

  const help = run(launcher, ["--help"], { cwd: installDirectory });
  if (!help.stdout.includes("Usage: shikitari")) throw new Error("installed --help output is incorrect");

  const version = run(launcher, ["--version"], { cwd: installDirectory });
  if (version.stdout.trim() !== packageJson.version) throw new Error("installed --version output is incorrect");

  console.log("installed package smoke test passed.");
} finally {
  fs.rmSync(tarballPath, { force: true });
  fs.rmSync(installDirectory, { recursive: true, force: true });
}
