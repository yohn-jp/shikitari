import assert from "node:assert/strict";
import { test } from "node:test";
import {
  aggregateNamingEvidence,
  createNamingObservation,
  serializeNamingEvidence,
  type NamingObservation,
} from "./evidence.js";

function observation(
  path: string,
  line: number,
  kind: NamingObservation["kind"],
  identifier: string,
): NamingObservation {
  return createNamingObservation({
    source: { path, start: { line, column: 0 } },
    kind,
    identifier,
  });
}

test("normalizes representative declaration naming facts without a policy judgment", () => {
  const getHttpUsers = observation("src/users.ts", 4, "function", "getHTTPUsers");
  const isReady = observation("src/users.ts", 8, "property", "isReady");
  const userId = observation("src/user.ts", 3, "class", "UserId");

  assert.equal(getHttpUsers.analysis.form.status, "known");
  assert.equal(getHttpUsers.analysis.form.value, "camel");
  assert.deepEqual(getHttpUsers.analysis.tokens, {
    status: "known",
    value: [
      { text: "get", term: "get", acronym: false },
      { text: "HTTP", term: "http", acronym: true },
      { text: "Users", term: "users", acronym: false },
    ],
  });
  assert.deepEqual(getHttpUsers.analysis.leadingVerb, { status: "known", value: "get" });
  assert.deepEqual(getHttpUsers.analysis.acronym, { detected: true, tokens: ["HTTP"] });
  assert.deepEqual(getHttpUsers.analysis.pluralization, { status: "known", value: "plural" });
  assert.deepEqual(isReady.analysis.booleanPrefix, { status: "known", value: "is" });
  assert.deepEqual(userId.analysis.suffix, { status: "known", value: "Id" });
});

test("keeps unknown or unsupported names explicit", () => {
  const unsupported = observation("src/names.ts", 1, "variable", "$generated");
  const empty = observation("src/names.ts", 2, "variable", "");

  assert.deepEqual(unsupported.analysis.form, { status: "unknown", reason: "unsupported-characters" });
  assert.deepEqual(unsupported.analysis.tokens, { status: "unknown", reason: "unsupported-characters" });
  assert.deepEqual(empty.analysis.form, { status: "unknown", reason: "empty-identifier" });
  assert.deepEqual(empty.analysis.pluralization, { status: "unknown", reason: "empty-identifier" });
});

test("aggregates declaration observations by symbol kind and lexical term with provenance", () => {
  const first = observation("src/z.ts", 3, "variable", "userIds");
  const second = observation("src/a.ts", 2, "function", "getUser");
  const evidence = aggregateNamingEvidence([first, second]);

  assert.deepEqual(
    evidence.observations.map(({ source }) => source.path),
    ["src/a.ts", "src/z.ts"],
  );
  assert.deepEqual(evidence.aggregates.bySymbolKind, [
    { kind: "function", occurrences: 1, observationIds: [second.id] },
    { kind: "variable", occurrences: 1, observationIds: [first.id] },
  ]);
  assert.deepEqual(
    evidence.aggregates.byTerm.map(({ term, occurrences }) => ({ term, occurrences })),
    [
      { term: "get", occurrences: 1 },
      { term: "ids", occurrences: 1 },
      { term: "user", occurrences: 2 },
    ],
  );
  assert.deepEqual(
    evidence.aggregates.byTerm.find(({ term }) => term === "user")?.observationIds,
    [first.id, second.id].sort(),
  );
});

test("serialization is byte-stable regardless of input observation order", () => {
  const first = observation("src/a.ts", 2, "function", "getUser");
  const second = observation("src/z.ts", 3, "variable", "userIds");
  const left = serializeNamingEvidence(aggregateNamingEvidence([first, second]));
  const right = serializeNamingEvidence(aggregateNamingEvidence([second, first]));

  assert.equal(left, right);
  assert.equal(left.endsWith("\n"), true);
  assert.equal(JSON.parse(left).version, 1);
});
