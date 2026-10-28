import { app, dialog, shell, type NativeImage } from "electron";
import { autoUpdater } from "electron-updater";
import { APP_NAME } from "./utils/isolation";
import { REPOSITORY_URL } from "./utils/updates";

type Translate = (key: string) => string;

let translate: Translate = (key) => key;
let dialogIcon: NativeImage | undefined;
let configured = false;
let interactiveCheck = false;
let downloadedVersion: string | null = null;
let quittingForUpdate = false;

/**
 * In-app updates from this repository's GitHub releases. A newer release is
 * downloaded in the background and checked against the SHA512 in its
 * latest.yml; the user then restarts now or lets it install silently the
 * next time the app quits.
 */
export function setupAutoUpdater(options: {
  translate: Translate;
  icon: NativeImage;
}) {
  translate = options.translate;
  dialogIcon = options.icon;
  if (configured) return;
  configured = true;

  // Local update tests point a build at a generic feed; release builds
  // never set this variable and always use GitHub.
  const testFeed = ALTUS_TEST_UPDATE_FEED;
  autoUpdater.setFeedURL(
    testFeed
      ? { provider: "generic", url: testFeed }
      : { provider: "github", owner: "lukethehawk", repo: "altus" }
  );
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  // Fork versions look like 5.8.1-plus.3; only published, non-prerelease
  // GitHub releases count, and never an older one.
  autoUpdater.allowPrerelease = false;
  autoUpdater.allowDowngrade = false;
  // Releases ship the full NSIS installer, not a web installer.
  autoUpdater.disableWebInstaller = true;
  autoUpdater.logger = {
    info: () => undefined,
    warn: (message) => console.warn("[updater]", message),
    error: (message) => console.error("[updater]", message),
  };

  autoUpdater.on("update-not-available", () => {
    if (!interactiveCheck) return;
    interactiveCheck = false;
    void dialog.showMessageBox({
      type: "info",
      message: translate("You are using the latest version"),
      detail: `${APP_NAME} ${app.getVersion()}`,
      icon: dialogIcon,
    });
  });

  autoUpdater.on("update-available", (info) => {
    // Stay interactive until the download finishes, so a failed download is
    // reported to the user who asked for the check.
    if (!interactiveCheck) return;
    void dialog.showMessageBox({
      type: "info",
      message: `${translate("Downloading update")}: ${APP_NAME} ${info.version}`,
      detail: translate(
        "It is downloading in the background. You will be asked to restart when it is ready."
      ),
      icon: dialogIcon,
    });
  });

  autoUpdater.on("update-downloaded", (info) => {
    interactiveCheck = false;
    downloadedVersion = info.version;
    promptToRestart(info.version);
  });

  autoUpdater.on("error", (error) => {
    if (!interactiveCheck) return;
    interactiveCheck = false;
    void dialog
      .showMessageBox({
        type: "warning",
        message: translate("Could not check for updates"),
        detail: `${translate("Try again later or open the releases page.")}\n\n${error.message}`,
        buttons: [translate("Open Releases Page"), "OK"],
      })
      .then(({ response }) => {
        if (response === 0) void shell.openExternal(`${REPOSITORY_URL}/releases`);
      });
  });
}

export async function checkForUpdates({ interactive }: { interactive: boolean }) {
  // The menu can be used before startup has configured the feed.
  if (!configured) return;
  if (!app.isPackaged) {
    if (interactive) {
      void dialog.showMessageBox({
        type: "info",
        message: translate("Updates are only available in the installed app."),
      });
    }
    return;
  }
  if (downloadedVersion) {
    if (interactive) promptToRestart(downloadedVersion);
    return;
  }
  interactiveCheck = interactive;
  try {
    const result = await autoUpdater.checkForUpdates();
    // The background download rejects on failure; that is also reported
    // through the "error" event.
    result?.downloadPromise?.catch(() => undefined);
  } catch {
    // Reported through the "error" event.
  }
}

function promptToRestart(version: string) {
  void dialog
    .showMessageBox({
      type: "info",
      message: `${translate("Update ready")}: ${APP_NAME} ${version}`,
      detail: translate(
        "Restart now to install it, or it will be installed the next time you quit Altus +."
      ),
      buttons: [translate("Restart now"), translate("Later")],
      defaultId: 0,
      cancelId: 1,
      icon: dialogIcon,
    })
    .then(({ response }) => {
      if (response === 0) installDownloadedUpdate({ relaunch: true });
    });
}

/** True while quitting to install, so close-to-tray must not cancel it. */
export function isQuittingForUpdate() {
  return quittingForUpdate;
}

/**
 * Exit paths that bypass Electron's quit event (app.exit) call this so a
 * downloaded update is still installed. Returns false when there is none.
 */
export function installDownloadedUpdate({ relaunch }: { relaunch: boolean }) {
  if (!downloadedVersion) return false;
  quittingForUpdate = true;
  // Silent NSIS install; relaunch only when the user asked to restart.
  autoUpdater.quitAndInstall(true, relaunch);
  return true;
}
