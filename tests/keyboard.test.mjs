import test from "node:test";
import assert from "node:assert/strict";
import { EnterKeys } from "../src/utils/keyboard.ts";

const key = (type, keyName, extra = {}) => ({
  type, key: keyName, shift: false, control: false, alt: false, meta: false, location: 0, ...extra,
});
const rightShiftDown = key("keyDown", "Shift", { shift: true, location: 2 });
const rightShiftUp = key("keyUp", "Shift", { location: 2 });
const leftShiftDown = key("keyDown", "Shift", { shift: true, location: 1 });
const enter = (extra) => key("keyDown", "Enter", extra);
const settings = (preventEnter, sendWithRightShiftEnter) => () => ({ preventEnter, sendWithRightShiftEnter });

test("Enter: sends by default, new line with preventEnter", () => {
  assert.equal(new EnterKeys().handle(enter(), settings(false, true), 0), "pass");
  assert.equal(new EnterKeys().handle(enter(), settings(true, true), 0), "newline");
});

test("Right Shift + Enter sends when the option is on, in both modes", () => {
  for (const preventEnter of [false, true]) {
    const keys = new EnterKeys();
    keys.handle(rightShiftDown, settings(preventEnter, true), 0);
    assert.equal(keys.handle(enter({ shift: true }), settings(preventEnter, true), 0), "send");
  }
  const off = new EnterKeys();
  off.handle(rightShiftDown, settings(true, false), 0);
  assert.equal(off.handle(enter({ shift: true }), settings(true, false), 0), "pass");
});

test("Left Shift + Enter stays a new line", () => {
  const keys = new EnterKeys();
  keys.handle(leftShiftDown, settings(true, true), 0);
  assert.equal(keys.handle(enter({ shift: true }), settings(true, true), 0), "pass");
});

test("Ctrl+Enter sends only with preventEnter", () => {
  assert.equal(new EnterKeys().handle(enter({ control: true }), settings(true, false), 0), "send");
  assert.equal(new EnterKeys().handle(enter({ control: true }), settings(false, false), 0), "pass");
});

test("Right Shift released, or a key without Shift, clears it", () => {
  const released = new EnterKeys();
  released.handle(rightShiftDown, settings(true, true), 0);
  released.handle(rightShiftUp, settings(true, true), 0);
  assert.equal(released.handle(enter({ shift: true }), settings(true, true), 0), "pass");

  // Right Shift released in another window: the next key without Shift resets it.
  const stale = new EnterKeys();
  stale.handle(rightShiftDown, settings(true, true), 0);
  stale.handle(key("keyDown", "a"), settings(true, true), 0);
  stale.handle(leftShiftDown, settings(true, true), 0);
  assert.equal(stale.handle(enter({ shift: true }), settings(true, true), 0), "pass");

  const blurred = new EnterKeys();
  blurred.handle(rightShiftDown, settings(true, true), 0);
  blurred.reset();
  assert.equal(blurred.handle(enter({ shift: true }), settings(true, true), 0), "pass");
});

test("our own Enter goes through once, and only right away", () => {
  const keys = new EnterKeys();
  keys.handle(rightShiftDown, settings(true, true), 0);
  assert.equal(keys.handle(enter({ shift: true }), settings(true, true), 1000), "send");
  // The plain Enter we sent comes back: WhatsApp must get it (not a new line).
  assert.equal(keys.handle(enter(), settings(true, true), 1010), "pass");
  // The next real Enter is handled again.
  assert.equal(keys.handle(enter(), settings(true, true), 1020), "newline");

  // Right Shift still held: our Enter (without Shift) must not clear it.
  const held = new EnterKeys();
  held.handle(rightShiftDown, settings(true, true), 0);
  assert.equal(held.handle(enter({ shift: true }), settings(true, true), 0), "send");
  assert.equal(held.handle(enter(), settings(true, true), 10), "pass");
  assert.equal(held.handle(enter({ shift: true }), settings(true, true), 20), "send");

  const late = new EnterKeys();
  late.handle(enter({ control: true }), settings(true, false), 1000);
  assert.equal(late.handle(enter(), settings(true, false), 2000), "newline");
});

test("composition and other modifiers are left alone", () => {
  assert.equal(new EnterKeys().handle(enter({ isComposing: true }), settings(true, true), 0), "pass");
  assert.equal(new EnterKeys().handle(enter({ alt: true }), settings(true, true), 0), "pass");
  assert.equal(new EnterKeys().handle(key("keyUp", "Enter"), settings(true, true), 0), "pass");
});

test("settings are only read for Enter", () => {
  let reads = 0;
  const keys = new EnterKeys();
  const counting = () => (reads++, { preventEnter: true, sendWithRightShiftEnter: true });
  keys.handle(key("keyDown", "a"), counting, 0);
  keys.handle(rightShiftDown, counting, 0);
  assert.equal(reads, 0);
  keys.handle(enter({ shift: true }), counting, 0);
  assert.equal(reads, 1);
});
