import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("the installer copies the original Altus into the profile the app opens", () => {
  const app = read("src/utils/isolation.ts").match(
    /LEGACY_TEST_BUILD_NAME = "([^"]+)"/
  )?.[1];
  const installer = read("makers/nsis/replaceAltus.nsh").match(
    /!define ALTUS_PLUS_PROFILE "([^"]+)"/
  )?.[1];
  assert.ok(app);
  assert.equal(installer, app);
});

test("NSIS scripts with accented text are saved with a UTF-8 BOM", () => {
  for (const file of ["updateBanner.nsh", "replaceAltus.nsh"]) {
    const bytes = fs.readFileSync(path.join(root, "makers/nsis", file));
    assert.deepEqual([...bytes.subarray(0, 3)], [0xef, 0xbb, 0xbf], file);
  }
});
