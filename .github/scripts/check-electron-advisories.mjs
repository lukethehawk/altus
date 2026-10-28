// Fails when `yarn npm audit --json` (read from stdin) reports any advisory
// for the electron package. Electron is a devDependency but it is the app's
// runtime, so every advisory against it matters, whatever its severity.
import { text } from "node:stream/consumers";

const lines = (await text(process.stdin)).split(/\r?\n/);
const findings = [];
for (const line of lines) {
  if (!line.trim().startsWith("{")) continue;
  let entry;
  try {
    entry = JSON.parse(line);
  } catch {
    continue;
  }
  if (entry.value !== "electron") continue;
  const details = entry.children ?? {};
  findings.push(
    `${details.Severity}: ${details.Issue} (${details.URL}) affects ${details["Vulnerable Versions"]}, installed ${(details["Tree Versions"] ?? []).join(", ")}`
  );
}

if (findings.length) {
  console.log(`Electron has ${findings.length} advisory(ies):`);
  for (const finding of findings) console.log(`- ${finding}`);
  process.exit(1);
}
console.log("No advisories for electron.");
