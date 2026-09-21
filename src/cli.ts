import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packageMetadata = require("../package.json") as { name: string; version: string };

export const helpText = `Usage: ${packageMetadata.name} [options]

Options:
  -h, --help       Show this help message
  -v, --version    Show the package version`;

export interface CliOutput {
  write(chunk: string): void;
}

export function runCli(
  argv: readonly string[],
  output: CliOutput = process.stdout,
  errorOutput: CliOutput = process.stderr,
): number {
  const [command] = argv;

  if (command === undefined || command === "--help" || command === "-h") {
    output.write(`${helpText}\n`);
    return 0;
  }

  if (command === "--version" || command === "-v") {
    output.write(`${packageMetadata.version}\n`);
    return 0;
  }

  errorOutput.write(`Unknown option: ${command}\n`);
  return 1;
}
