// Checks that the Electron runtime pinned in package.json is the newest
// release of its major line, and that the line is still supported. Electron
// ships Chromium security fixes in its patch releases, usually without an npm
// advisory, so the weekly dependency audit would not notice them.
// Exits 1 (GitHub emails the owner) when an update is due; see
// docs/RELEASING.md. Usage: check-electron-release.mjs [version]
// (defaults to the electron version in package.json).
import { appendFile, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const FEED_URL = "https://releases.electronjs.org/releases.json";
// Electron's support policy: the latest three stable major versions.
const SUPPORTED_MAJORS = 3;

/** "44.10.0" → [44, 10, 0]; null for ranges and pre-releases. */
export function parseVersion(version) {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version ?? "");
  return match ? match.slice(1).map(Number) : null;
}

function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

function details(release) {
  return `(${release.date}${release.chrome ? `, Chromium ${release.chrome}` : ""})`;
}

function describe(release) {
  return `${release.version} ${details(release)}: https://github.com/electron/electron/releases/tag/v${release.version}`;
}

/**
 * @param {string} installed exact version pinned in package.json
 * @param {{version: string, date?: string, chrome?: string}[]} releases the release feed
 * @returns {{errors: string[], warnings: string[], notes: string[]}}
 */
export function checkElectronRelease(installed, releases) {
  const errors = [];
  const warnings = [];
  const notes = [];
  const current = parseVersion(installed);
  if (!current) {
    errors.push(`package.json must pin an exact stable Electron version, found "${installed}".`);
    return { errors, warnings, notes };
  }
  const stable = releases
    .map((release) => ({ ...release, parts: parseVersion(release.version) }))
    .filter((release) => release.parts);
  const self = stable.find((release) => compareVersions(release.parts, current) === 0);
  if (!self) {
    errors.push(`Electron ${installed} is not in the release feed (${FEED_URL}); check the pinned version and the feed.`);
    return { errors, warnings, notes };
  }

  const newer = stable
    .filter((release) => release.parts[0] === current[0] && compareVersions(release.parts, current) > 0)
    .sort((a, b) => compareVersions(b.parts, a.parts));
  if (newer.length) {
    errors.push(
      `Electron ${newer[0].version} is out; Altus + pins ${installed}. Update it (docs/RELEASING.md, "Electron updates"). Newer ${current[0]}.x releases:`,
      ...newer.map((release) => `- ${describe(release)}`)
    );
  }

  const majors = [...new Set(stable.filter((release) => release.parts[1] === 0 && release.parts[2] === 0)
    .map((release) => release.parts[0]))]
    .sort((a, b) => b - a)
    .slice(0, SUPPORTED_MAJORS);
  if (!majors.includes(current[0])) {
    errors.push(`Electron ${current[0]} is no longer supported (supported: ${majors.join(", ")}). Move to Electron ${majors[0]}.`);
  } else if (current[0] === majors[majors.length - 1]) {
    warnings.push(`Electron ${current[0]} is the oldest supported major: support ends when Electron ${majors[0] + 1} is released. Plan the move to Electron ${majors[0]}.`);
  }

  if (!newer.length) notes.push(`Electron ${installed} is the newest ${current[0]}.x release ${details(self)}.`);
  notes.push(`Supported Electron majors: ${majors.join(", ")}.`);
  return { errors, warnings, notes };
}

async function fetchReleases() {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(FEED_URL, { signal: AbortSignal.timeout(30_000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const releases = await response.json();
      if (!Array.isArray(releases) || !releases.length) throw new Error("empty or malformed feed");
      return releases;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, 10_000));
    }
  }
  throw new Error(`Could not read the Electron release feed (${FEED_URL}): ${lastError?.message}. The check did not run.`);
}

async function main() {
  const packageJson = JSON.parse(await readFile(new URL("../../package.json", import.meta.url), "utf8"));
  const installed = process.argv[2] ?? packageJson.devDependencies?.electron;
  const { errors, warnings, notes } = checkElectronRelease(installed, await fetchReleases());

  const inActions = process.env.GITHUB_ACTIONS === "true";
  for (const line of notes) console.log(line);
  for (const line of warnings) console.log(inActions ? `::warning::${line}` : `Warning: ${line}`);
  if (errors.length) console.log(inActions ? `::error::${errors[0]}` : `Error: ${errors[0]}`);
  for (const line of errors.slice(1)) console.log(line);

  if (process.env.GITHUB_STEP_SUMMARY) {
    const title = errors.length ? "Electron update needed" : "Electron is up to date";
    const body = [...errors, ...warnings.map((line) => `**Warning:** ${line}`), ...notes];
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `## ${title}\n\n${body.join("\n\n")}\n`);
  }
  process.exitCode = errors.length ? 1 : 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.log(process.env.GITHUB_ACTIONS === "true" ? `::error::${error.message}` : `Error: ${error.message}`);
    process.exitCode = 1;
  });
}
