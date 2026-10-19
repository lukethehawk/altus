import { Configuration } from "app-builder-lib";

export const CommonConfig: Partial<Configuration> = {
  appId: "com.lukethehawk.altus.electron44test",
  productName: "Altus Electron 44 Test",
  // Deliberately do not register the whatsapp:// protocol.
};
