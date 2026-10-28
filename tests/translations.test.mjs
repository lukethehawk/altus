import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { languages } from "../src/i18n/langauges.config.ts";
import { contextMenuLabelKeys } from "../src/i18n/contextMenuLabels.ts";

const root = path.resolve(import.meta.dirname, "..");

// Keys passed to t() through a variable instead of a string literal.
const dynamicKeys = ["top", "bottom", ...Object.values(contextMenuLabelKeys)];

function keysUsedInSource() {
  const keys = new Set(dynamicKeys);
  const call = /\b(?:t|translate)\(\s*(["'`])((?:(?!\1)[^\\]|\\.)*?)\1\s*,?\s*\)/g;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.tsx?$/.test(entry.name)) {
        for (const match of fs.readFileSync(file, "utf8").matchAll(call)) {
          keys.add(match[2]);
        }
      }
    }
  };
  walk(path.join(root, "src"));
  return keys;
}

function loadTranslation(language) {
  const file = path.join(root, "public/locales", language, "translation.json");
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

test("every language has a translation for every key used by the app", () => {
  const used = keysUsedInSource();
  assert.ok(used.size > 100, `only found ${used.size} keys`);
  for (const language of languages) {
    const translation = loadTranslation(language);
    const missing = [...used].filter((key) => !translation[key]);
    assert.deepEqual(missing, [], `missing in ${language}`);
  }
});

test("all languages define the same keys", () => {
  const [first, ...rest] = languages;
  const expected = Object.keys(loadTranslation(first)).sort();
  for (const language of rest) {
    assert.deepEqual(Object.keys(loadTranslation(language)).sort(), expected, language);
  }
});

test("only the supported languages are shipped", () => {
  const shipped = fs.readdirSync(path.join(root, "public/locales")).sort();
  assert.deepEqual(shipped, [...languages].sort());
});
