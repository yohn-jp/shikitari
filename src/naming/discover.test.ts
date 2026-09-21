import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { discoverAndSerializeNamingEvidence, discoverNamingEvidence, NamingDiscoveryError } from "./discover.js";

function fixtureRepository(): string {
  const root = mkdtempSync(join(tmpdir(), "shikitari-naming-"));
  mkdirSync(join(root, "src"));
  mkdirSync(join(root, "dist"));
  mkdirSync(join(root, "node_modules", "dependency"), { recursive: true });
  mkdirSync(join(root, "generated"));
  writeFileSync(
    join(root, "src", "z.ts"),
    [
      "export class UserRecord {",
      "  readonly userId: string;",
      "  getName(): string { return this.userId; }",
      "}",
      "export function getUsers(userId: string): UserRecord[] {",
      "  const userCount = 1;",
      "  return [];",
      "}",
    ].join("\n"),
  );
  writeFileSync(
    join(root, "src", "a.ts"),
    [
      "export interface UserOptions { enabled: boolean; }",
      "export type UserId = string;",
      "export enum UserKind { Admin, Member }",
    ].join("\n"),
  );
  writeFileSync(join(root, "src", "declarations.d.mts"), "export const declarationValue: string;\n");
  writeFileSync(join(root, "dist", "ignored.ts"), "export class ShouldNotAppear {}\n");
  writeFileSync(join(root, "node_modules", "dependency", "ignored.ts"), "export class ShouldNotAppear {}\n");
  writeFileSync(join(root, "generated", "ignored.ts"), "export class ShouldNotAppear {}\n");
  writeFileSync(join(root, ".gitignore"), "ignored-by-gitignore/\n");
  mkdirSync(join(root, "ignored-by-gitignore"));
  writeFileSync(join(root, "ignored-by-gitignore", "ignored.ts"), "export class ShouldNotAppear {}\n");
  return root;
}

test("discovers declaration names with Compiler API and excludes default/ignore boundaries", () => {
  const root = fixtureRepository();
  const evidence = discoverNamingEvidence(root);
  const identifiers = evidence.observations.map((observation) => observation.identifier);

  assert.deepEqual(
    evidence.observations.map((observation) => observation.source.path),
    [...evidence.observations.map((observation) => observation.source.path)].sort(),
  );
  assert.deepEqual(
    [
      "UserRecord",
      "userId",
      "getName",
      "getUsers",
      "userId",
      "userCount",
      "declarationValue",
      "UserOptions",
      "enabled",
      "UserId",
      "UserKind",
      "Admin",
      "Member",
    ].every((identifier) => identifiers.includes(identifier)),
    true,
  );
  assert.equal(identifiers.includes("ShouldNotAppear"), false);
  assert.equal(
    evidence.observations.some((observation) => observation.kind === "method"),
    true,
  );
  assert.equal(
    evidence.observations.some((observation) => observation.kind === "parameter"),
    true,
  );
  assert.equal(
    evidence.observations.some((observation) => observation.kind === "enum-member"),
    true,
  );
});

test("discovery serialization is byte-stable", () => {
  const root = fixtureRepository();
  assert.equal(discoverAndSerializeNamingEvidence(root), discoverAndSerializeNamingEvidence(root));
});

test("invalid requested inputs fail clearly", () => {
  assert.throws(
    () => discoverNamingEvidence(join(tmpdir(), "shikitari-path-that-does-not-exist")),
    (error: unknown) => error instanceof NamingDiscoveryError && error.message.includes("Cannot access"),
  );
  const root = mkdtempSync(join(tmpdir(), "shikitari-naming-invalid-"));
  writeFileSync(join(root, "invalid.ts"), "export function {\n");
  assert.throws(
    () => discoverNamingEvidence(join(root, "invalid.ts")),
    (error: unknown) => error instanceof NamingDiscoveryError && error.message.includes("Invalid TypeScript source"),
  );
});
