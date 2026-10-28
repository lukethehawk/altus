import type { ForgeConfig } from "@electron-forge/shared-types";
import { VitePlugin } from "@electron-forge/plugin-vite";
import MakerAppImage from "./makers/MakerAppImage";
import MakerNSIS from "./makers/MakerNSIS";
import MakerDMG from "./makers/MakerDMG";

const config: ForgeConfig = {
  packagerConfig: {
    icon: "./public/assets/icons/icon",
    appBundleId: "com.lukethehawk.altus.electron44test",
    appCategoryType: "public.app-category.social-networking",
    // No whatsapp:// protocol registration in the isolated test build.
    asar: true,
    // The Vite bundles in .vite/ inline every runtime dependency; this
    // plugin-vite version does not prune the app folder by itself, so ship
    // only the bundles and package.json instead of sources and node_modules.
    ignore: (file: string) =>
      !!file && file !== "/package.json" && !file.startsWith("/.vite"),
  },
  rebuildConfig: {},
  makers: [new MakerAppImage(), new MakerDMG(), new MakerNSIS()],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/main.ts",
          config: "vite.main.config.ts",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
        },
        {
          entry: "src/whatsapp.preload.ts",
          config: "vite.whatsapp.preload.config.ts",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
  ],
};

export default config;
