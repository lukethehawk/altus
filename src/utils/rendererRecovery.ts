import type { WebContents } from "electron";
import { planRecovery, type RecoveryState } from "./recovery";

// WhatsApp can stall briefly while syncing history; only act on long hangs.
const UNRESPONSIVE_GRACE_MS = 60_000;

/**
 * Reload this renderer after a crash, or after it has been hung for a long
 * time, with bounded backoff. Reloading keeps the WebContents, its session
 * partition and its audio-muted state, so logins are not affected.
 */
export function recoverRendererOnFailure(
  webContents: WebContents,
  label: string
) {
  let state: RecoveryState | undefined;
  let reloadTimer: ReturnType<typeof setTimeout> | undefined;
  let unresponsiveTimer: ReturnType<typeof setTimeout> | undefined;

  const scheduleReload = (why: string) => {
    if (reloadTimer || webContents.isDestroyed()) return;
    const plan = planRecovery(state, Date.now());
    state = plan.state;
    if (plan.delayMs === null) {
      console.error(`${label}: ${why}; automatic recovery stopped after repeated failures`);
      return;
    }
    console.warn(`${label}: ${why}; reloading in ${plan.delayMs} ms`);
    reloadTimer = setTimeout(() => {
      reloadTimer = undefined;
      if (!webContents.isDestroyed()) webContents.reload();
    }, plan.delayMs);
  };

  webContents.on("render-process-gone", (_event, details) => {
    // clean-exit is a normal shutdown, e.g. the tab was closed.
    if (details.reason === "clean-exit") return;
    scheduleReload(`renderer gone (${details.reason})`);
  });

  webContents.on("unresponsive", () => {
    if (unresponsiveTimer) return;
    unresponsiveTimer = setTimeout(() => {
      unresponsiveTimer = undefined;
      if (webContents.isDestroyed()) return;
      // A hung renderer cannot reload itself; end it and let
      // render-process-gone schedule the reload.
      console.warn(`${label}: unresponsive for ${UNRESPONSIVE_GRACE_MS} ms`);
      webContents.forcefullyCrashRenderer();
    }, UNRESPONSIVE_GRACE_MS);
  });

  webContents.on("responsive", () => {
    clearTimeout(unresponsiveTimer);
    unresponsiveTimer = undefined;
  });

  webContents.once("destroyed", () => {
    clearTimeout(reloadTimer);
    clearTimeout(unresponsiveTimer);
  });
}
