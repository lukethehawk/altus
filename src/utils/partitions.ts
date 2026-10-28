/**
 * Decide which Chromium partition folders belong to closed tabs and can be
 * removed. Errs on the side of keeping data: deleting a folder logs that
 * WhatsApp account out for good.
 */
export function getPartitionsToPrune(
  partitionDirectoryNames: string[],
  keptTabIds: string[]
): string[] {
  // An empty tab list is more likely a reset or unreadable store than a user
  // who closed every account; never wipe all sessions because of it.
  if (keptTabIds.length === 0) return [];

  // Chromium lower-cases persist: partition names for the folder name.
  const kept = new Set(keptTabIds.map((id) => id.toLowerCase()));

  return partitionDirectoryNames.filter(
    (name) =>
      // Only touch folders that look like Altus tab partitions.
      /^[a-z0-9_-]{1,64}$/.test(name) && !kept.has(name)
  );
}
