/**
 * Backoff policy for reloading a crashed or hung renderer. Bounded so a tab
 * that keeps failing cannot end up in a reload loop.
 */
export const RECOVERY_DELAYS_MS = [2_000, 10_000, 30_000];
// Failures further apart than this are treated as unrelated.
export const RECOVERY_STABLE_AFTER_MS = 5 * 60_000;

export type RecoveryState = { attempts: number; lastFailureAt: number };

export function planRecovery(
  state: RecoveryState | undefined,
  now: number
): { delayMs: number | null; state: RecoveryState } {
  const attempts =
    state && now - state.lastFailureAt < RECOVERY_STABLE_AFTER_MS
      ? state.attempts
      : 0;
  return {
    delayMs: RECOVERY_DELAYS_MS[attempts] ?? null,
    state: { attempts: attempts + 1, lastFailureAt: now },
  };
}
