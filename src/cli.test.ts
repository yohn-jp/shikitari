import assert from "node:assert/strict";
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
