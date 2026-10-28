import test from "node:test";
import assert from "node:assert/strict";
import { getPartitionsToPrune } from "../src/utils/partitions.ts";

test("prunes only partitions of closed tabs", () => {
  assert.deepEqual(
    getPartitionsToPrune(["abc", "closed1", "restore_me"], ["ABC", "Restore_Me"]),
    ["closed1"]
  );
});

test("never prunes when no tabs are known", () => {
  assert.deepEqual(getPartitionsToPrune(["abc", "def"], []), []);
});

test("ignores folders that are not Altus tab partitions", () => {
  assert.deepEqual(
    getPartitionsToPrune(["Default", "some%20name", "x".repeat(65), "old"], ["keep"]),
    ["old"]
  );
});
