export { helpText, runCli, type CliOutput } from "./cli.js";
export {
  DEFAULT_IGNORED_DIRECTORIES,
  DEFAULT_IGNORED_FILE_PATTERNS,
  NamingDiscoveryError,
  discoverAndSerializeNamingEvidence,
  discoverNamingEvidence,
  type NamingDiscoveryOptions,
} from "./naming/index.js";
