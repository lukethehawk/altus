import Store from "electron-store";
import { ensureIsolatedProfile } from "../../utils/isolation";
import { type Settings, getDefaultSettings } from "./common";

// Configure Electron's data directory before electron-store initializes.
ensureIsolatedProfile();

export const electronSettingsStore = new Store<Settings>({
  name: "settings",
  defaults: getDefaultSettings(),
});

electronSettingsStore.onDidChange("customTitlebar", (newValue) => {
  console.log("customTitlebar changed to", newValue);
});
