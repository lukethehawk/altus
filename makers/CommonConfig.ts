import { Configuration } from "app-builder-lib";

export const CommonConfig: Partial<Configuration> = {
  appId: "com.lukethehawk.altusplus",
  productName: "Altus +",
  // Deliberately do not register the whatsapp:// protocol.
};
