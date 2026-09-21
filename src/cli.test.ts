import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { helpText, runCli, type CliOutput } from "./cli.js";

function outputBuffer(): { output: CliOutput; read: () => string } {
  let value = "";
  return {
    output: { write: (chunk) => (value += chunk) },
    read: () => value,
  };
}

test("--help prints the Shikitari usage text", () => {
  const buffer = outputBuffer();

  assert.equal(runCli(["--help"], buffer.output, buffer.output), 0);
  assert.equal(buffer.read(), `${helpText}\n`);
});

test("unknown options fail without implementing product behavior", () => {
  const buffer = outputBuffer();

  assert.equal(runCli(["future-command"], buffer.output, buffer.output), 1);
  assert.equal(buffer.read(), "Unknown option: future-command\n");
});

test("discover naming emits machine-readable naming evidence", () => {
  const root = mkdtempSync(join(tmpdir(), "shikitari-cli-"));
  writeFileSync(join(root, "sample.ts"), "export function getUser(userId: string): string { return userId; }\n");
  const buffer = outputBuffer();

  assert.equal(runCli(["discover", "naming", root], buffer.output, buffer.output), 0);
  const result = JSON.parse(buffer.read()) as { version: number; observations: Array<{ identifier: string }> };
  assert.equal(result.version, 1);
  assert.deepEqual(
    result.observations.map((observation) => observation.identifier),
    ["getUser", "userId"],
  );
});

test("discover naming reports invalid paths on the error output", () => {
  const buffer = outputBuffer();

  assert.equal(runCli(["discover", "naming", "/tmp/shikitari-cli-missing-path"], buffer.output, buffer.output), 1);
  assert.equal(buffer.read().startsWith("Discovery failed: Cannot access"), true);
});
