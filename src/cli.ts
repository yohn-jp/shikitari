import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const packageMetadata = require("../package.json") as { name: string; version: string };
type NamingDiscoveryModule = typeof import("./naming/index.js");

export const helpText = `Usage: ${packageMetadata.name} [options]

Options:
  -h, --help       Show this help message
  -v, --version    Show the package version

Commands:
  discover naming [path]
                   Emit deterministic TypeScript naming evidence as JSON`;

export interface CliOutput {
  write(chunk: string): void;
}

export function runCli(
  argv: readonly string[],
  output: CliOutput = process.stdout,
  errorOutput: CliOutput = process.stderr,
): number {
  const [command, subcommand, ...rest] = argv;

  if (command === undefined || command === "--help" || command === "-h") {
    output.write(`${helpText}\n`);
    return 0;
  }

  if (command === "--version" || command === "-v") {
    output.write(`${packageMetadata.version}\n`);
    return 0;
  }

  if (command === "discover") {
    if (subcommand !== "naming") {
      errorOutput.write(`Unknown discover command: ${subcommand ?? ""}\n`);
      return 1;
    }
    if (rest.length > 1) {
      errorOutput.write("discover naming accepts at most one path\n");
      return 1;
    }
    try {
      const { discoverAndSerializeNamingEvidence } = require("./naming/index.js") as NamingDiscoveryModule;
      output.write(discoverAndSerializeNamingEvidence(rest[0] ?? "."));
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errorOutput.write(`Discovery failed: ${message}\n`);
      return 1;
    }
  }

  errorOutput.write(`Unknown option: ${command}\n`);
  return 1;
}
