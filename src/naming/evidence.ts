/**
 * The version of the serializable naming-evidence contract.
 *
 * An evidence version describes the shape of observations, not a naming
 * policy.  In particular, an observation is never a recommendation.
 */
export const NAMING_EVIDENCE_VERSION = 1 as const;

export type NamingSymbolKind =
  | "function"
  | "method"
  | "variable"
  | "parameter"
  | "property"
  | "class"
  | "interface"
  | "type"
  | "enum"
  | "enum-member"
  | "namespace"
  | "module";

export type NamingForm = "camel" | "pascal" | "snake" | "screaming-snake" | "kebab" | "dot" | "flat" | "mixed";

export type Pluralization = "singular" | "plural";

export type UnknownReason = "empty-identifier" | "unsupported-characters" | "ambiguous" | "not-detected";

/** A value that could not be derived is explicit in machine-readable output. */
export interface UnknownEvidence {
  readonly status: "unknown";
  readonly reason: UnknownReason;
}

export interface KnownEvidence<T> {
  readonly status: "known";
  readonly value: T;
}

export type EvidenceValue<T> = KnownEvidence<T> | UnknownEvidence;

export interface NamingPosition {
  /** One-based source line. */
  readonly line: number;
  /** Zero-based source column. */
  readonly column: number;
}

/** Repository-relative declaration identity; source text is deliberately absent. */
export interface NamingSource {
  readonly path: string;
  readonly start: NamingPosition;
  readonly end: NamingPosition;
  /** Stable declaration identity supplied by a producer or derived by this model. */
  readonly identity: string;
}

export interface NamingObservationInput {
  readonly source: {
    readonly path: string;
    readonly start: NamingPosition;
    readonly end?: NamingPosition;
    readonly identity?: string;
  };
  readonly kind: NamingSymbolKind;
  readonly identifier: string;
}

export interface LexicalToken {
  /** The exact token spelling from the declared identifier. */
  readonly text: string;
  /** Mechanical, case-folded spelling used only for aggregate grouping. */
  readonly term: string;
  readonly acronym: boolean;
}

export interface AcronymObservation {
  readonly detected: boolean;
  /** Exact token spellings that were mechanically recognized as acronyms. */
  readonly tokens: readonly string[];
}

export interface NamingAnalysis {
  readonly form: EvidenceValue<NamingForm>;
  readonly tokens: EvidenceValue<readonly LexicalToken[]>;
  readonly leadingVerb: EvidenceValue<string>;
  readonly booleanPrefix: EvidenceValue<string>;
  readonly suffix: EvidenceValue<string>;
  readonly acronym: AcronymObservation;
  readonly pluralization: EvidenceValue<Pluralization>;
}

/** One declaration observation. It does not include source text or reference uses. */
export interface NamingObservation {
  readonly id: string;
  readonly source: NamingSource;
  readonly kind: NamingSymbolKind;
  readonly identifier: string;
  readonly analysis: NamingAnalysis;
}

export interface SymbolKindAggregate {
  readonly kind: NamingSymbolKind;
  readonly occurrences: number;
  /** Declaration observation IDs provide aggregate provenance. */
  readonly observationIds: readonly string[];
}

export interface TermKindCount {
  readonly kind: NamingSymbolKind;
  readonly occurrences: number;
}

export interface TermAggregate {
  /** Case-folded lexical spelling; this is not a canonical vocabulary term. */
  readonly term: string;
  readonly occurrences: number;
  readonly bySymbolKind: readonly TermKindCount[];
  readonly observationIds: readonly string[];
}

export interface NamingAggregates {
  readonly bySymbolKind: readonly SymbolKindAggregate[];
  readonly byTerm: readonly TermAggregate[];
}

/** Deterministic, serializable evidence produced from declaration observations. */
export interface NamingEvidence {
  readonly version: typeof NAMING_EVIDENCE_VERSION;
  readonly observations: readonly NamingObservation[];
  readonly aggregates: NamingAggregates;
}

const SYMBOL_KINDS: readonly NamingSymbolKind[] = [
  "class",
  "enum",
  "enum-member",
  "function",
  "interface",
  "method",
  "module",
  "namespace",
  "parameter",
  "property",
  "type",
  "variable",
];

const LEADING_VERBS = new Set([
  "add",
  "build",
  "clear",
  "compute",
  "convert",
  "create",
  "delete",
  "deserialize",
  "disable",
  "enable",
  "ensure",
  "find",
  "format",
  "get",
  "handle",
  "load",
  "make",
  "parse",
  "remove",
  "render",
  "resolve",
  "save",
  "serialize",
  "set",
  "update",
  "validate",
]);

const BOOLEAN_PREFIXES = new Set([
  "allowed",
  "can",
  "could",
  "does",
  "has",
  "is",
  "may",
  "should",
  "was",
  "were",
  "will",
]);

// These are lexical shape markers only. They are not assertions about the
// meaning of a declaration and must not be promoted to Canon vocabulary.
const STRUCTURAL_SUFFIXES = new Set([
  "array",
  "config",
  "count",
  "dto",
  "error",
  "id",
  "key",
  "list",
  "map",
  "name",
  "options",
  "request",
  "response",
  "result",
  "set",
  "state",
  "value",
]);

const RESERVED_PLURAL_EXCEPTIONS = new Set(["analysis", "basis", "class", "gas", "status"]);

function known<T>(value: T): KnownEvidence<T> {
  return { status: "known", value };
}

function unknown<T>(reason: UnknownReason): EvidenceValue<T> {
  return { status: "unknown", reason };
}

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function comparePosition(left: NamingPosition, right: NamingPosition): number {
  return left.line - right.line || left.column - right.column;
}

function normalizePath(path: string): string {
  const normalized = path.replaceAll("\\", "/");
  if (normalized.startsWith("/") || normalized.split("/").includes("..")) {
    throw new RangeError(`Naming evidence paths must be repository-relative: ${path}`);
  }
  return normalized.startsWith("./") ? normalized.slice(2) : normalized;
}

function validatePosition(position: NamingPosition): void {
  if (!Number.isInteger(position.line) || position.line < 1) {
    throw new RangeError("Naming evidence line must be a positive integer");
  }
  if (!Number.isInteger(position.column) || position.column < 0) {
    throw new RangeError("Naming evidence column must be a non-negative integer");
  }
}

function compareObservation(left: NamingObservation, right: NamingObservation): number {
  return (
    compareText(left.source.path, right.source.path) ||
    comparePosition(left.source.start, right.source.start) ||
    comparePosition(left.source.end, right.source.end) ||
    compareText(left.kind, right.kind) ||
    compareText(left.identifier, right.identifier) ||
    compareText(left.id, right.id)
  );
}

function isUpper(character: string | undefined): boolean {
  return character !== undefined && character.toUpperCase() === character && character.toLowerCase() !== character;
}

function isLower(character: string | undefined): boolean {
  return character !== undefined && character.toLowerCase() === character && character.toUpperCase() !== character;
}

function isDigit(character: string): boolean {
  return character >= "0" && character <= "9";
}

function isSeparator(character: string): boolean {
  return character === "_" || character === "-" || character === ".";
}

interface TokenPart {
  readonly text: string;
  readonly separatorBefore: string | null;
}

function splitIdentifier(identifier: string): EvidenceValue<readonly TokenPart[]> {
  if (identifier.length === 0) return unknown("empty-identifier");

  const characters = Array.from(identifier);
  const parts: TokenPart[] = [];
  let current = "";
  let separatorBefore: string | null = null;

  const flush = (): void => {
    if (current.length > 0) {
      parts.push({ text: current, separatorBefore });
      current = "";
      separatorBefore = null;
    }
  };

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    if (isSeparator(character)) {
      flush();
      separatorBefore = character;
      continue;
    }

    if (character === "$" || character === "#" || character === "\\" || character === "/") {
      return unknown("unsupported-characters");
    }

    const previous = characters[index - 1];
    const next = characters[index + 1];
    const boundary =
      current.length > 0 &&
      ((isLower(previous) && isUpper(character)) ||
        isDigit(previous) !== isDigit(character) ||
        (isUpper(previous) && isUpper(character) && isLower(next)));
    if (boundary) flush();
    current += character;
  }
  flush();
  return parts.length === 0 ? unknown("unsupported-characters") : known(parts);
}

function classifyForm(identifier: string, parts: readonly TokenPart[]): EvidenceValue<NamingForm> {
  if (parts.length === 0) return unknown("empty-identifier");
  const hasUnsupportedEdge = identifier.startsWith("_") || identifier.startsWith("-") || identifier.startsWith(".");
  if (hasUnsupportedEdge) return unknown("ambiguous");

  const hasUnderscore = identifier.includes("_");
  const hasHyphen = identifier.includes("-");
  const hasDot = identifier.includes(".");
  const allLower = identifier === identifier.toLowerCase();
  const allUpper = identifier === identifier.toUpperCase();
  if (hasUnderscore && allLower) return known("snake");
  if (hasUnderscore && allUpper) return known("screaming-snake");
  if (hasHyphen && allLower) return known("kebab");
  if (hasDot && allLower) return known("dot");
  if (parts.length === 1 && allLower) return known("flat");
  if (parts.length > 1 && allLower) return known("flat");

  const first = Array.from(identifier)[0];
  if (isLower(first) && parts.length > 1) return known("camel");
  if (isUpper(first) && parts.length > 1) return known("pascal");
  if (allUpper) return known("screaming-snake");
  return known("mixed");
}

function identifyPluralization(lastTerm: string): EvidenceValue<Pluralization> {
  if (RESERVED_PLURAL_EXCEPTIONS.has(lastTerm)) return unknown("ambiguous");
  if (lastTerm.length < 3) return unknown("ambiguous");
  if (lastTerm.endsWith("ies") || lastTerm.endsWith("ses") || lastTerm.endsWith("xes") || lastTerm.endsWith("zes")) {
    return known("plural");
  }
  if (lastTerm.endsWith("s") && !lastTerm.endsWith("ss") && !lastTerm.endsWith("us")) return known("plural");
  if (!lastTerm.endsWith("s")) return known("singular");
  return unknown("ambiguous");
}

function makeAnalysis(identifier: string): NamingAnalysis {
  const split = splitIdentifier(identifier);
  if (split.status === "unknown") {
    return {
      form: unknown(split.reason),
      tokens: unknown(split.reason),
      leadingVerb: unknown(split.reason),
      booleanPrefix: unknown(split.reason),
      suffix: unknown(split.reason),
      acronym: { detected: false, tokens: [] },
      pluralization: unknown(split.reason),
    };
  }

  const tokenValues = split.value.map(({ text }) => ({
    text,
    term: text.toLowerCase(),
    acronym: text.length > 1 && Array.from(text).every((character) => isUpper(character) || isDigit(character)),
  }));
  const firstTerm = tokenValues[0].term;
  const lastTerm = tokenValues[tokenValues.length - 1].term;
  const acronymTokens = tokenValues.filter((token) => token.acronym).map((token) => token.text);
  return {
    form: classifyForm(identifier, split.value),
    tokens: known(tokenValues),
    leadingVerb: LEADING_VERBS.has(firstTerm) ? known(tokenValues[0].text) : unknown("not-detected"),
    booleanPrefix: BOOLEAN_PREFIXES.has(firstTerm) ? known(tokenValues[0].text) : unknown("not-detected"),
    suffix:
      tokenValues.length > 1 && STRUCTURAL_SUFFIXES.has(lastTerm)
        ? known(tokenValues[tokenValues.length - 1].text)
        : unknown("not-detected"),
    acronym: { detected: acronymTokens.length > 0, tokens: acronymTokens },
    pluralization: identifyPluralization(lastTerm),
  };
}

function observationIdentity(input: NamingObservationInput, path: string, end: NamingPosition): string {
  return (
    input.source.identity ??
    `${path}:${input.source.start.line}:${input.source.start.column}-${end.line}:${end.column}:${input.kind}:${input.identifier}`
  );
}

/** Normalize one declaration into the deterministic evidence representation. */
export function normalizeNamingObservation(input: NamingObservationInput): NamingObservation {
  const path = normalizePath(input.source.path);
  validatePosition(input.source.start);
  const end = input.source.end ?? input.source.start;
  validatePosition(end);
  if (comparePosition(end, input.source.start) < 0) {
    throw new RangeError("Naming evidence end position cannot precede start position");
  }
  const sourceIdentity = observationIdentity(input, path, end);
  return {
    id: sourceIdentity,
    source: { path, start: input.source.start, end, identity: sourceIdentity },
    kind: input.kind,
    identifier: input.identifier,
    analysis: makeAnalysis(input.identifier),
  };
}

/** Alias emphasizing that the input is a declaration observation, not a reference use. */
export const createNamingObservation = normalizeNamingObservation;

function sortedObservations(observations: readonly NamingObservation[]): NamingObservation[] {
  return [...observations].sort(compareObservation);
}

function aggregateSymbolKinds(observations: readonly NamingObservation[]): SymbolKindAggregate[] {
  return SYMBOL_KINDS.map((kind) => {
    const matching = observations.filter((observation) => observation.kind === kind);
    return {
      kind,
      occurrences: matching.length,
      observationIds: matching.map((observation) => observation.id).sort(compareText),
    };
  }).filter((aggregate) => aggregate.occurrences > 0);
}

function aggregateTerms(observations: readonly NamingObservation[]): TermAggregate[] {
  const terms = new Map<string, { occurrences: number; byKind: Map<NamingSymbolKind, number>; ids: Set<string> }>();
  for (const observation of observations) {
    const tokens = observation.analysis.tokens;
    if (tokens.status === "unknown") continue;
    for (const token of tokens.value) {
      const existing = terms.get(token.term) ?? { occurrences: 0, byKind: new Map(), ids: new Set() };
      existing.occurrences += 1;
      existing.byKind.set(observation.kind, (existing.byKind.get(observation.kind) ?? 0) + 1);
      existing.ids.add(observation.id);
      terms.set(token.term, existing);
    }
  }
  return [...terms.entries()]
    .sort(([left], [right]) => compareText(left, right))
    .map(([term, aggregate]) => ({
      term,
      occurrences: aggregate.occurrences,
      bySymbolKind: [...aggregate.byKind.entries()]
        .sort(([left], [right]) => SYMBOL_KINDS.indexOf(left) - SYMBOL_KINDS.indexOf(right))
        .map(([kind, occurrences]) => ({ kind, occurrences })),
      observationIds: [...aggregate.ids].sort(compareText),
    }));
}

/** Build aggregate evidence without changing or mutating the supplied observations. */
export function aggregateNamingEvidence(observations: readonly NamingObservation[]): NamingEvidence {
  const ordered = sortedObservations(observations);
  return {
    version: NAMING_EVIDENCE_VERSION,
    observations: ordered,
    aggregates: {
      bySymbolKind: aggregateSymbolKinds(ordered),
      byTerm: aggregateTerms(ordered),
    },
  };
}

/** Serialize evidence with stable observation and aggregate ordering. */
export function serializeNamingEvidence(evidence: NamingEvidence): string {
  const normalized = aggregateNamingEvidence(evidence.observations);
  return `${JSON.stringify(normalized, null, 2)}\n`;
}
