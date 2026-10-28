import test from "node:test";
import assert from "node:assert/strict";
import {
  planRecovery,
  RECOVERY_DELAYS_MS,
  RECOVERY_STABLE_AFTER_MS,
} from "../src/utils/recovery.ts";

test("backs off and gives up after the last delay", () => {
  let state;
  const delays = [];
  for (let i = 0; i < RECOVERY_DELAYS_MS.length + 2; i++) {
    const plan = planRecovery(state, 1000 + i);
    delays.push(plan.delayMs);
    state = plan.state;
  }
  assert.deepEqual(delays, [...RECOVERY_DELAYS_MS, null, null]);
});

test("starts over after a stable period", () => {
  let { state } = planRecovery(undefined, 0);
  ({ state } = planRecovery(state, 1));
  const plan = planRecovery(state, 1 + RECOVERY_STABLE_AFTER_MS);
  assert.equal(plan.delayMs, RECOVERY_DELAYS_MS[0]);
});
