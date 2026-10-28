/** Per-account notification helpers shared by the app UI and the preload. */

export const HOUR_MS = 60 * 60 * 1000;
// Stored instead of Infinity, which does not survive JSON persistence.
export const MUTED_UNTIL_TURNED_ON = Number.MAX_SAFE_INTEGER;

export function isMuteActive(mutedUntil: unknown, now: number): boolean {
  return typeof mutedUntil === "number" && mutedUntil > now;
}

/** Prefix the account name so notifications from different tabs differ. */
export function labelNotificationTitle(account: string, title: string): string {
  const name = account.trim();
  if (!name || title.startsWith(`${name} · `)) return title;
  return title ? `${name} · ${title}` : name;
}
