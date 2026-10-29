import MakerBase, { MakerOptions } from "@electron-forge/maker-base";
import path from "path";
import fs from "fs-extra";
import debug from "debug";
import { buildForge } from "app-builder-lib";
import { CommonConfig } from "./CommonConfig";

const log = debug("electron-forge:maker:nsis");

export default class MakerNSIS extends MakerBase<MakerOptions> {
  name = "nsis";

  defaultPlatforms: string[] = ["win32"];

  isSupportedOnCurrentPlatform(): boolean {
    return process.platform === "win32";
  }

  async make(options: MakerOptions): Promise<string[]> {
    const { makeDir, targetArch } = options;
    const outPath = path.resolve(makeDir, `nsis`);
    const tmpPath = path.resolve(makeDir, `nsis/${targetArch}-tmp`);
    const result: Array<string> = [];

    log(`Emptying directories: ${tmpPath}, ${outPath}`);
    await fs.emptyDir(tmpPath);
    await fs.emptyDir(outPath);
    log(`Copying contents of ${options.dir} to ${tmpPath}`);
    await fs.copy(options.dir, tmpPath);

    log(`Calling app-builder-lib's buildForge() with ${tmpPath}`);
    const output = await buildForge(
      { dir: tmpPath },
      {
        win: [`nsis:${options.targetArch}`],
        config: {
          ...CommonConfig,
          // buildForge's own output setting is replaced by this config object.
          directories: { output: path.resolve(makeDir, "nsis/make") },
          icon: path.resolve(
            __dirname,
            "..",
            "public",
            "assets",
            "icons",
            "icon.ico"
          ),
          nsis: {
            oneClick: false,
            installerSidebar: path.resolve(
              __dirname,
              "..",
              "public",
              "assets",
              "installerSidebar.bmp"
            ),
            artifactName: "Altus-Plus-Setup-${version}.${ext}",
            allowToChangeInstallationDirectory: true,
            // Update notice and the first-install choice next to / in place
            // of the original Altus (makers/nsis/).
            include: path.resolve(__dirname, "nsis", "installer.nsh"),
          },
          // Describes where releases live so latest.yml (version + SHA512)
          // and the .blockmap for the in-app updater are generated; nothing
          // is uploaded from the build (publish: "never" below).
          publish: { provider: "github", owner: "lukethehawk", repo: "altus-plus" },
          // Versions like 5.8.1-plus.3 must still produce latest.yml rather
          // than a "plus" channel file.
          detectUpdateChannel: false,
        },
        // buildForge forwards this to build() but does not declare it.
        publish: "never",
      } as Parameters<typeof buildForge>[1]
    );

    log("Received output files", output);
    for (const file of output) {
      const filePath = path.resolve(makeDir, path.basename(file));
      result.push(filePath);

      if (fs.existsSync(filePath)) {
        log(`Removing ${filePath}`);
        await fs.remove(filePath);
      }

      await fs.move(file, filePath);
    }

    // latest.yml is written next to the installer but not reported as an
    // artifact; keep it, since the in-app updater reads it from the release.
    const updateInfoPath = path.resolve(makeDir, "nsis/make/latest.yml");
    if (fs.existsSync(updateInfoPath)) {
      const filePath = path.resolve(makeDir, "latest.yml");
      await fs.move(updateInfoPath, filePath, { overwrite: true });
      result.push(filePath);
    }

    await fs.remove(tmpPath);
    await fs.remove(outPath);
    await fs.remove(path.resolve(makeDir, "nsis/make"));

    return result;
  }
}
