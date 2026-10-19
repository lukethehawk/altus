import Store from "electron-store";
import { ensureIsolatedProfile } from "../../utils/isolation";
import { type ThemeStore, ThemeStoreDefaults } from "./common";

// Configure Electron's data directory before electron-store initializes.
ensureIsolatedProfile();

export const electronThemeStore = new Store<ThemeStore>({
  name: "themes",
  defaults: ThemeStoreDefaults(),
});
