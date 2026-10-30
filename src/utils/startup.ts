import path from "path";

/**
 * The autostart entry starts the app with this flag (auto-launch's isHidden),
 * so "Start in tray with Windows" never hides a window the person opened.
 */
export const AUTOSTART_FLAG = "--hidden";

/**
 * On Windows auto-launch names the Run value after the exe file and ignores
 * its `name` option, so an entry left by another build (named after that
 * build's exe) is only reached through a path ending in that exe's name.
 * The file does not need to exist.
 */
export function autostartPathFor(appName: string, execPath: string): string {
  return path.win32.join(path.win32.dirname(execPath), `${appName}.exe`);
}

export type StartupWindowMode = "tray" | "minimized" | "normal";

/**
 * How the main window appears when the app starts. It only stays hidden when
 * the tray icon exists, so the window can always be reopened.
 */
export function getStartupWindowMode(options: {
  startedByAutostart: boolean;
  launchToTray: boolean;
  trayIcon: boolean;
  launchMinimized: boolean;
}): StartupWindowMode {
  if (options.startedByAutostart && options.launchToTray && options.trayIcon) {
    return "tray";
  }
  return options.launchMinimized ? "minimized" : "normal";
}
