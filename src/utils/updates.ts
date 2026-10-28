/** Release lookup for the in-app update check (GitHub Releases, no auto-install). */

export const REPOSITORY_URL = "https://github.com/lukethehawk/altus";
export const LATEST_RELEASE_API_URL =
  "https://api.github.com/repos/lukethehawk/altus/releases/latest";

type ParsedVersion = { core: number[]; prerelease: (number | string)[] };

function parseVersion(version: string): ParsedVersion | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+.*)?$/.exec(
    version.trim()
  );
  if (!match) return null;
  return {
    core: [Number(match[1]), Number(match[2]), Number(match[3])],
    prerelease: match[4]
      ? match[4].split(".").map((id) => (/^\d+$/.test(id) ? Number(id) : id))
      : [],
  };
}

/**
 * Semver ordering, so "5.8.1-plus.10" > "5.8.1-plus.9" > "5.8.1-plus.1".
 * Returns a negative number, 0 or a positive number; null if unparsable.
 */
export function compareVersions(a: string, b: string): number | null {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return null;
  for (let i = 0; i < 3; i++) {
    if (left.core[i] !== right.core[i]) return left.core[i] - right.core[i];
  }
  // A version without pre-release identifiers ranks above one with them.
  if (!left.prerelease.length || !right.prerelease.length) {
    return right.prerelease.length - left.prerelease.length;
  }
  const length = Math.max(left.prerelease.length, right.prerelease.length);
  for (let i = 0; i < length; i++) {
    const x = left.prerelease[i];
    const y = right.prerelease[i];
    if (x === undefined) return -1;
    if (y === undefined) return 1;
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return x - y;
    // Numeric identifiers rank below alphanumeric ones.
    if (typeof x === "number") return -1;
    if (typeof y === "number") return 1;
    return x < y ? -1 : 1;
  }
  return 0;
}

export type LatestRelease = { version: string; url: string };

/** Accept only a well-formed release of this repository. */
export function parseLatestRelease(body: unknown): LatestRelease | null {
  if (!body || typeof body !== "object") return null;
  const { tag_name, html_url, draft, prerelease } = body as Record<
    string,
    unknown
  >;
  if (draft === true || prerelease === true) return null;
  if (typeof tag_name !== "string" || typeof html_url !== "string") return null;
  if (!parseVersion(tag_name)) return null;
  if (!html_url.startsWith(`${REPOSITORY_URL}/releases/`)) return null;
  return { version: tag_name.replace(/^v/, ""), url: html_url };
}
