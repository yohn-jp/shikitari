import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { verifyReleaseCertification } from "./verify-release-certification.mjs";

function fixture() {
  const repositoryRoot = mkdtempSync(path.join(tmpdir(), "shikitari-release-cert-"));
  spawnSync("git", ["init", "--quiet"], { cwd: repositoryRoot });
  spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: repositoryRoot });
  spawnSync("git", ["config", "user.name", "test"], { cwd: repositoryRoot });
  writeFileSync(path.join(repositoryRoot, "package.json"), JSON.stringify({ name: "shikitari", version: "0.1.0" }));
  spawnSync("git", ["add", "."], { cwd: repositoryRoot });
  spawnSync("git", ["commit", "--quiet", "-m", "init"], { cwd: repositoryRoot });
  const sourceSha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: repositoryRoot, encoding: "utf8" }).stdout.trim();
  const artifactPath = path.join(repositoryRoot, "artifact.tgz");
  writeFileSync(artifactPath, "tarball-bytes");
  const artifactSha256 = createHash("sha256").update("tarball-bytes").digest("hex");
  return { repositoryRoot, sourceSha, artifactPath, artifactSha256 };
}

function environment(data, overrides = {}) {
  return {
    GITHUB_REPOSITORY: "yohn-jp/shikitari",
    RELEASE_SOURCE_SHA: data.sourceSha,
    RELEASE_TAG: "v0.1.0",
    RELEASE_ARTIFACT_PATH: data.artifactPath,
    RELEASE_ARTIFACT_SHA256: data.artifactSha256,
    ...overrides,
  };
}

test("release certification accepts matching source and artifact", () => {
  const data = fixture();
  try {
    assert.equal(
      verifyReleaseCertification({ environment: environment(data), repositoryRoot: data.repositoryRoot }).passed,
      true,
    );
  } finally {
    rmSync(data.repositoryRoot, { recursive: true, force: true });
  }
});

test("release certification rejects a mismatched repository", () => {
  const data = fixture();
  try {
    assert.throws(
      () =>
        verifyReleaseCertification({
          environment: environment(data, { GITHUB_REPOSITORY: "someone-else/fork" }),
          repositoryRoot: data.repositoryRoot,
        }),
      /GITHUB_REPOSITORY must be/,
    );
  } finally {
    rmSync(data.repositoryRoot, { recursive: true, force: true });
  }
});
