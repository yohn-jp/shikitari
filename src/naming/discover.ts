import { readFileSync, readdirSync, statSync, type Dirent } from "node:fs";
import { relative, resolve, sep } from "node:path";
import * as ts from "typescript";
import {
  aggregateNamingEvidence,
  createNamingObservation,
  serializeNamingEvidence,
  type NamingEvidence,
  type NamingObservation,
  type NamingSymbolKind,
  type NamingPosition,
} from "./evidence.js";

/** Directories that are not project source by default. */
export const DEFAULT_IGNORED_DIRECTORIES: readonly string[] = [
  ".git",
  ".hg",
  ".next",
  ".nuxt",
  ".svn",
  ".turbo",
  "__generated__",
  "build",
  "coverage",
  "dist",
  "generated",
  "node_modules",
  "out",
  "vendor",
];

/** Conventional generated TypeScript filenames that are not project evidence. */
export const DEFAULT_IGNORED_FILE_PATTERNS: readonly string[] = [
  "*.generated.cts",
  "*.generated.mts",
  "*.generated.ts",
  "*.generated.tsx",
  "*.gen.cts",
  "*.gen.mts",
  "*.gen.ts",
  "*.gen.tsx",
];

const TYPESCRIPT_EXTENSIONS = new Set([".cts", ".mts", ".ts", ".tsx"]);

export interface NamingDiscoveryOptions {
  /** Override the repository root used to relativize source paths and read ignore files. */
  readonly repositoryRoot?: string;
  /** Disable `.gitignore` rules when a caller needs only the explicit defaults. */
  readonly useGitignore?: boolean;
  /** Add directory names to the explicit default exclusion set. */
  readonly ignoredDirectories?: readonly string[];
  /** Add filename globs to the explicit default exclusion set. */
  readonly ignoredFilePatterns?: readonly string[];
}

export class NamingDiscoveryError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "NamingDiscoveryError";
  }
}

interface IgnoreRule {
  readonly pattern: string;
  readonly negated: boolean;
  readonly directoryOnly: boolean;
  readonly anchored: boolean;
}

interface DiscoveryContext {
  readonly root: string;
  readonly ignoredDirectories: ReadonlySet<string>;
  readonly ignoredFilePatterns: readonly string[];
  readonly ignoreRules: readonly IgnoreRule[];
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function pathForDisplay(path: string): string {
  return path.split(sep).join("/");
}

function isTypeScriptPath(path: string): boolean {
  const extension = path.slice(path.lastIndexOf(".")).toLowerCase();
  return TYPESCRIPT_EXTENSIONS.has(extension);
}

function relativeSourcePath(root: string, filePath: string): string {
  const value = pathForDisplay(relative(root, filePath));
  if (value === "" || value === ".." || value.startsWith("../")) {
    throw new NamingDiscoveryError(`Source is outside the repository root: ${filePath}`);
  }
  return value;
}

function readIgnoreRules(root: string, enabled: boolean): IgnoreRule[] {
  if (!enabled) return [];
  const ignorePath = resolve(root, ".gitignore");
  let content: string;
  try {
    content = readFileSync(ignorePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw new NamingDiscoveryError(`Cannot read repository ignore file ${ignorePath}: ${String(error)}`);
  }

  const rules: IgnoreRule[] = [];
  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const negated = line.startsWith("!") && !line.startsWith("\\!");
    const unescaped = (negated ? line.slice(1) : line).replaceAll("\\#", "#").replaceAll("\\!", "!");
    if (unescaped === "") continue;
    const directoryOnly = unescaped.endsWith("/");
    const withoutTrailingSlash = directoryOnly ? unescaped.slice(0, -1) : unescaped;
    const anchored = withoutTrailingSlash.startsWith("/");
    const pattern = anchored ? withoutTrailingSlash.slice(1) : withoutTrailingSlash;
    if (pattern !== "") rules.push({ pattern, negated, directoryOnly, anchored });
  }
  return rules;
}

function globPartToRegExp(part: string): string {
  let value = "";
  for (let index = 0; index < part.length; index += 1) {
    const character = part[index];
    if (character === "*") {
      if (part[index + 1] === "*") {
        value += ".*";
        index += 1;
      } else {
        value += "[^/]*";
      }
    } else if (character === "?") {
      value += "[^/]";
    } else if (character === "[") {
      const closing = part.indexOf("]", index + 1);
      if (closing > index + 1) {
        const contents = part
          .slice(index + 1, closing)
          .replaceAll("\\", "\\\\")
          .replaceAll("]", "\\]");
        value += `[${contents}]`;
        index = closing;
      } else {
        value += "\\[";
      }
    } else {
      value += character.replace(/[\\^$+{}.()|]/gu, "\\$&");
    }
  }
  return value;
}

function ignoreRuleMatches(rule: IgnoreRule, path: string, isDirectory: boolean): boolean {
  const pattern = globPartToRegExp(rule.pattern);
  if (!rule.anchored && !rule.pattern.includes("/")) {
    return new RegExp(`(?:^|/)${pattern}(?:$|/)`, "u").test(path);
  }
  const suffix = rule.directoryOnly || isDirectory ? "(?:/.*)?" : "";
  return new RegExp(`^${pattern}${suffix}$`, "u").test(path);
}

function isIgnoredByGitignore(rules: readonly IgnoreRule[], path: string, isDirectory: boolean): boolean {
  let ignored = false;
  for (const rule of rules) {
    if (ignoreRuleMatches(rule, path, isDirectory)) ignored = !rule.negated;
  }
  return ignored;
}

function matchesFilePattern(fileName: string, pattern: string): boolean {
  const normalized = pattern.replace(/^\//u, "");
  const expression = globPartToRegExp(normalized);
  return normalized.includes("/")
    ? new RegExp(`^${expression}$`, "u").test(fileName)
    : new RegExp(`^${expression}$`, "u").test(fileName.split("/").at(-1) ?? fileName);
}

function validateRequestedPath(path: string): string {
  try {
    return resolve(path);
  } catch (error) {
    throw new NamingDiscoveryError(`Invalid discovery path ${path}: ${String(error)}`);
  }
}

function createContext(root: string, options: NamingDiscoveryOptions): DiscoveryContext {
  return {
    root,
    ignoredDirectories: new Set([...DEFAULT_IGNORED_DIRECTORIES, ...(options.ignoredDirectories ?? [])]),
    ignoredFilePatterns: [...DEFAULT_IGNORED_FILE_PATTERNS, ...(options.ignoredFilePatterns ?? [])],
    ignoreRules: readIgnoreRules(root, options.useGitignore !== false),
  };
}

function sourcePosition(sourceFile: ts.SourceFile, position: number): NamingPosition {
  const location = sourceFile.getLineAndCharacterOfPosition(position);
  return { line: location.line + 1, column: location.character };
}

function nameText(name: ts.PropertyName | ts.BindingName | undefined): string | undefined {
  if (!name) return undefined;
  if (
    ts.isIdentifier(name) ||
    ts.isPrivateIdentifier(name) ||
    ts.isStringLiteral(name) ||
    ts.isNumericLiteral(name) ||
    ts.isNoSubstitutionTemplateLiteral(name)
  ) {
    return name.text;
  }
  return undefined;
}

function bindingNames(name: ts.BindingName): ts.Node[] {
  if (ts.isIdentifier(name)) return [name];
  const names: ts.Node[] = [];
  for (const element of name.elements) {
    if (ts.isOmittedExpression(element)) continue;
    if (ts.isBindingElement(element)) names.push(...bindingNames(element.name));
  }
  return names;
}

function moduleSymbolKind(node: ts.ModuleDeclaration): NamingSymbolKind {
  return node.flags & ts.NodeFlags.Namespace ? "namespace" : "module";
}

function addObservation(
  observations: NamingObservation[],
  sourceFile: ts.SourceFile,
  path: string,
  name: ts.Node | undefined,
  kind: NamingSymbolKind,
): void {
  if (!name) return;
  const identifier = nameText(name as ts.PropertyName | ts.BindingName | undefined);
  if (identifier === undefined) return;
  observations.push(
    createNamingObservation({
      source: {
        path,
        start: sourcePosition(sourceFile, name.getStart(sourceFile)),
        end: sourcePosition(sourceFile, name.getEnd()),
      },
      kind,
      identifier,
    }),
  );
}

function collectSourceObservations(sourceFile: ts.SourceFile, path: string): NamingObservation[] {
  const observations: NamingObservation[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isFunctionDeclaration(node)) {
      addObservation(observations, sourceFile, path, node.name, "function");
    } else if (ts.isMethodDeclaration(node) || ts.isMethodSignature(node)) {
      addObservation(observations, sourceFile, path, node.name, "method");
    } else if (ts.isVariableDeclaration(node)) {
      for (const name of bindingNames(node.name)) addObservation(observations, sourceFile, path, name, "variable");
    } else if (ts.isParameter(node)) {
      for (const name of bindingNames(node.name)) addObservation(observations, sourceFile, path, name, "parameter");
    } else if (ts.isPropertyDeclaration(node) || ts.isPropertySignature(node)) {
      addObservation(observations, sourceFile, path, node.name, "property");
    } else if (ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node)) {
      addObservation(observations, sourceFile, path, node.name, "property");
    } else if (ts.isClassDeclaration(node)) {
      addObservation(observations, sourceFile, path, node.name, "class");
    } else if (ts.isInterfaceDeclaration(node)) {
      addObservation(observations, sourceFile, path, node.name, "interface");
    } else if (ts.isTypeAliasDeclaration(node)) {
      addObservation(observations, sourceFile, path, node.name, "type");
    } else if (ts.isEnumDeclaration(node)) {
      addObservation(observations, sourceFile, path, node.name, "enum");
    } else if (ts.isEnumMember(node)) {
      addObservation(observations, sourceFile, path, node.name, "enum-member");
    } else if (ts.isModuleDeclaration(node)) {
      addObservation(observations, sourceFile, path, node.name, moduleSymbolKind(node));
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return observations;
}

function parseSourceFile(filePath: string, sourcePath: string): NamingObservation[] {
  let sourceText: string;
  try {
    sourceText = readFileSync(filePath, "utf8");
  } catch (error) {
    throw new NamingDiscoveryError(`Cannot read TypeScript source ${filePath}: ${String(error)}`);
  }
  const sourceFile = ts.createSourceFile(
    sourcePath,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    sourcePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const program = ts.createProgram({
    rootNames: [filePath],
    options: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      noEmit: true,
      skipLibCheck: true,
    },
  });
  const programSourceFile = program.getSourceFile(filePath);
  const diagnostics = programSourceFile === undefined ? [] : program.getSyntacticDiagnostics(programSourceFile);
  if (diagnostics.length > 0) {
    const diagnostic = diagnostics[0];
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, " ");
    const location =
      diagnostic.start === undefined ? "" : ` at ${sourcePath}:${sourcePosition(sourceFile, diagnostic.start).line}`;
    throw new NamingDiscoveryError(`Invalid TypeScript source${location}: ${message}`);
  }
  return collectSourceObservations(sourceFile, sourcePath);
}

function walkDirectory(context: DiscoveryContext, directory: string, observations: NamingObservation[]): void {
  let entries: Dirent<string>[];
  try {
    entries = readdirSync(directory, { withFileTypes: true, encoding: "utf8" });
  } catch (error) {
    throw new NamingDiscoveryError(`Cannot read discovery directory ${directory}: ${String(error)}`);
  }
  const orderedEntries = [...entries].sort((left, right) => compareText(left.name, right.name));
  for (const entry of orderedEntries) {
    if (entry.isSymbolicLink()) continue;
    const absolutePath = resolve(directory, entry.name);
    const relativePath = relativeSourcePath(context.root, absolutePath);
    if (entry.isDirectory()) {
      if (context.ignoredDirectories.has(entry.name) || isIgnoredByGitignore(context.ignoreRules, relativePath, true))
        continue;
      walkDirectory(context, absolutePath, observations);
      continue;
    }
    if (!entry.isFile() || !isTypeScriptPath(entry.name)) continue;
    if (context.ignoredFilePatterns.some((pattern) => matchesFilePattern(relativePath, pattern))) continue;
    if (isIgnoredByGitignore(context.ignoreRules, relativePath, false)) continue;
    observations.push(...parseSourceFile(absolutePath, relativePath));
  }
}

function checkRoot(root: string): void {
  try {
    if (!statSync(root).isDirectory()) throw new NamingDiscoveryError(`Discovery root is not a directory: ${root}`);
  } catch (error) {
    if (error instanceof NamingDiscoveryError) throw error;
    throw new NamingDiscoveryError(`Cannot access discovery root ${root}: ${String(error)}`);
  }
}

/** Discover declaration-only TypeScript naming evidence below a repository root. */
export function discoverNamingEvidence(requestedPath = ".", options: NamingDiscoveryOptions = {}): NamingEvidence {
  const requested = validateRequestedPath(requestedPath);
  let root = validateRequestedPath(options.repositoryRoot ?? requested);
  let sourceFile: string | undefined;
  let requestedStat: ReturnType<typeof statSync>;
  try {
    requestedStat = statSync(requested);
  } catch (error) {
    throw new NamingDiscoveryError(`Cannot access requested discovery path ${requested}: ${String(error)}`);
  }
  if (requestedStat.isFile()) {
    if (!isTypeScriptPath(requested)) {
      throw new NamingDiscoveryError(`Requested discovery file is not TypeScript: ${requested}`);
    }
    sourceFile = requested;
    if (options.repositoryRoot === undefined) root = resolve(requested, "..");
  } else if (!requestedStat.isDirectory()) {
    throw new NamingDiscoveryError(`Requested discovery path is not a file or directory: ${requested}`);
  }
  checkRoot(root);
  const context = createContext(root, options);
  const observations: NamingObservation[] = [];
  if (sourceFile) {
    const sourcePath = relativeSourcePath(root, sourceFile);
    if (
      !context.ignoredFilePatterns.some((pattern) => matchesFilePattern(sourcePath, pattern)) &&
      !isIgnoredByGitignore(context.ignoreRules, sourcePath, false)
    ) {
      observations.push(...parseSourceFile(sourceFile, sourcePath));
    }
  } else {
    walkDirectory(context, requested, observations);
  }
  return aggregateNamingEvidence(observations);
}

/** Stable machine-readable serialization for discovery output. */
export function discoverAndSerializeNamingEvidence(requestedPath = ".", options: NamingDiscoveryOptions = {}): string {
  return serializeNamingEvidence(discoverNamingEvidence(requestedPath, options));
}
