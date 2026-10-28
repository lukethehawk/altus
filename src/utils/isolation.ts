import { app } from "electron";
import fs from "fs";
import path from "path";

// Deliberately unique application identity to avoid reading or modifying
// official Altus's saved WhatsApp sessions, window state, or settings.
export const APP_NAME = "Altus +";
export const APP_ID = "com.lukethehawk.altusplus";
// Name used by the earlier "Altus Electron 44 Test" builds. Their profile
// folder is kept so accounts paired there stay logged in after the rename,
// and their autostart entry is removed so only one entry starts the app.
export const LEGACY_TEST_BUILD_NAME = "Altus Electron 44 Test";
const PROFILE_FOLDER_NAME = LEGACY_TEST_BUILD_NAME;

let configured = false;

export function hasExplicitProfileDirectory(): boolean {
  return app.commandLine.getSwitchValue("user-data-dir") !== "";
}

export function ensureIsolatedProfile(): void {
  if (configured) return;
  // An explicit --user-data-dir (used for smoke tests) wins, so a test run
  // never opens the profile holding the real WhatsApp sessions.
  const explicitDirectory = app.commandLine.getSwitchValue("user-data-dir");
  const directory = explicitDirectory
    ? path.resolve(explicitDirectory)
    : path.join(app.getPath("appData"), PROFILE_FOLDER_NAME);
  fs.mkdirSync(directory, { recursive: true });
  app.setName(APP_NAME);
  app.setPath("userData", directory);
  configured = true;
}
