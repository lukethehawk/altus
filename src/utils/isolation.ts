import { app } from "electron";
import fs from "fs";
import path from "path";

// Deliberately unique application identity to avoid reading or modifying
// official Altus's saved WhatsApp sessions, window state, or settings.
export const EXPERIMENT_NAME = "Altus Electron 44 Test";
export const EXPERIMENT_APP_ID = "com.lukethehawk.altus.electron44test";

let configured = false;

export function ensureIsolatedProfile(): void {
  if (configured) return;
  // An explicit --user-data-dir (used for smoke tests) wins, so a test run
  // never opens the profile holding the real WhatsApp sessions.
  const explicitDirectory = app.commandLine.getSwitchValue("user-data-dir");
  const directory = explicitDirectory
    ? path.resolve(explicitDirectory)
    : path.join(app.getPath("appData"), EXPERIMENT_NAME);
  fs.mkdirSync(directory, { recursive: true });
  app.setName(EXPERIMENT_NAME);
  app.setPath("userData", directory);
  configured = true;
}
