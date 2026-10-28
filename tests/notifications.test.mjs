import test from "node:test";
import assert from "node:assert/strict";
import {
  isMuteActive,
  labelNotificationTitle,
  MUTED_UNTIL_TURNED_ON,
} from "../src/utils/notifications.ts";

test("mute is active only until its expiry", () => {
  assert.equal(isMuteActive(2000, 1000), true);
  assert.equal(isMuteActive(1000, 1000), false);
  assert.equal(isMuteActive(MUTED_UNTIL_TURNED_ON, Date.now()), true);
  for (const value of [undefined, null, 0, "2000"]) {
    assert.equal(isMuteActive(value, 1000), false, String(value));
  }
});

test("labels notification titles with the account name", () => {
  assert.equal(labelNotificationTitle("Lavoro", "Mario Rossi"), "Lavoro · Mario Rossi");
  assert.equal(labelNotificationTitle(" Lavoro ", "Mario"), "Lavoro · Mario");
  assert.equal(labelNotificationTitle("", "Mario"), "Mario");
  assert.equal(labelNotificationTitle("Lavoro", ""), "Lavoro");
  assert.equal(labelNotificationTitle("Lavoro", "Lavoro · Mario"), "Lavoro · Mario");
});
