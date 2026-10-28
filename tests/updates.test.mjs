import test from "node:test";
import assert from "node:assert/strict";
import { compareVersions, parseLatestRelease } from "../src/utils/updates.ts";

test("orders fork versions like semver", () => {
  const sign = (a, b) => Math.sign(compareVersions(a, b));
  assert.equal(sign("5.8.1-plus.2", "5.8.1-plus.1"), 1);
  assert.equal(sign("5.8.1-plus.10", "5.8.1-plus.9"), 1);
  assert.equal(sign("v5.8.1-plus.1", "5.8.1-plus.1"), 0);
  assert.equal(sign("5.9.0-plus.1", "5.8.1-plus.7"), 1);
  assert.equal(sign("5.8.1", "5.8.1-plus.1"), 1);
  assert.equal(sign("5.8.1-plus.1", "5.8.1-electron44.3"), 1);
  assert.equal(compareVersions("latest", "5.8.1"), null);
});

test("accepts only published releases of this repository", () => {
  const release = {
    tag_name: "v5.8.1-plus.2",
    html_url: "https://github.com/lukethehawk/altus/releases/tag/v5.8.1-plus.2",
    draft: false,
    prerelease: false,
  };
  assert.deepEqual(parseLatestRelease(release), {
    version: "5.8.1-plus.2",
    url: release.html_url,
  });
  for (const bad of [
    { ...release, html_url: "https://evil.example/releases/tag/v9.9.9" },
    { ...release, html_url: "https://github.com/lukethehawk/altus-evil/releases/x" },
    { ...release, tag_name: "nightly" },
    { ...release, draft: true },
    { ...release, prerelease: true },
    null,
    "v5.8.1",
  ]) {
    assert.equal(parseLatestRelease(bad), null, JSON.stringify(bad));
  }
});
