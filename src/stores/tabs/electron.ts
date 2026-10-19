import Store from "electron-store";
import { ensureIsolatedProfile } from "../../utils/isolation";
import { TabStoreDefaults, type TabStore } from "./common";

// Configure Electron's data directory before electron-store initializes.
ensureIsolatedProfile();

export const electronTabStore = new Store<TabStore>({
  name: "tabs",
  defaults: TabStoreDefaults(),
});
