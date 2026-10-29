import test from "node:test";
import assert from "node:assert/strict";
import { checkElectronRelease, parseVersion } from "../.github/scripts/check-electron-release.mjs";

// Shaped like https://releases.electronjs.org/releases.json (newest first).
const feed = [
  "46.0.0-alpha.2", "45.1.0", "45.0.0", "45.0.0-beta.7", "44.10.0", "44.9.3",
  "44.0.0", "43.8.4", "43.0.0", "42.11.18", "42.0.0",
].map((version) => ({ version, date: "2026-10-27", chrome: "152.0.7977.169" }));

test("exact pins only", () => {
  assert.deepEqual(parseVersion("44.10.0"), [44, 10, 0]);
  for (const value of ["^44.10.0", "44.10", "45.0.0-beta.7", "", undefined]) {
    assert.equal(parseVersion(value), null, String(value));
    assert.equal(checkElectronRelease(value, feed).errors.length, 1, String(value));
  }
});

test("newest patch of a supported major passes", () => {
  const result = checkElectronRelease("44.10.0", feed);
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.warnings, []);
  assert.match(result.notes.join("\n"), /Electron 44\.10\.0 is the newest 44\.x release \(2026-10-27, Chromium 152\.0\.7977\.169\)\./);
  assert.match(result.notes.join("\n"), /majors: 45, 44, 43\./);
});

test("a newer release of the same major fails and lists it", () => {
  const { errors } = checkElectronRelease("44.9.3", feed);
  assert.match(errors[0], /Electron 44\.10\.0 is out; Altus \+ pins 44\.9\.3/);
  assert.equal(errors.length, 2);
  assert.match(errors[1], /44\.10\.0 \(2026-10-27, Chromium 152\.0\.7977\.169\).*releases\/tag\/v44\.10\.0/);
});

test("pre-releases and newer majors do not count as updates", () => {
  const { errors } = checkElectronRelease("45.1.0", feed);
  assert.deepEqual(errors, []);
});

test("oldest supported major only warns", () => {
  const result = checkElectronRelease("43.8.4", feed);
  assert.deepEqual(result.errors, []);
  assert.equal(result.warnings.length, 1);
  assert.match(result.warnings[0], /Electron 43 is the oldest supported major.*Electron 46 is released/);
});

test("unsupported major fails", () => {
  const { errors } = checkElectronRelease("42.11.18", feed);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /Electron 42 is no longer supported \(supported: 45, 44, 43\)/);
});

test("a version missing from the feed fails instead of passing", () => {
  const { errors } = checkElectronRelease("44.11.0", feed);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /not in the release feed/);
});
