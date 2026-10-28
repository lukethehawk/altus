import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  Menu,
  MenuItem,
  nativeImage,
  session,
  shell,
  Tray,
} from "electron";
import fs from "fs";
import path from "path";
import { electronTabStore } from "./stores/tabs/electron";
import { Tab, TabStore } from "./stores/tabs/common";
import { electronThemeStore } from "./stores/themes/electron";
import { ThemeStore } from "./stores/themes/common";
import { electronSettingsStore } from "./stores/settings/electron";
import { languages } from "./i18n/langauges.config";
import os from "os";
import Store from "electron-store";
import { electronI18N } from "./i18n/electron";
import {
  DefaultSettingValues,
  SettingKey,
  Settings,
} from "./stores/settings/common";
import AutoLaunch from "auto-launch";
import electronDl from "electron-dl";
import contextMenu from "electron-context-menu";
import {
  EXPERIMENT_APP_ID,
  EXPERIMENT_NAME,
  hasExplicitProfileDirectory,
} from "./utils/isolation";
import { getPartitionsToPrune } from "./utils/partitions";
import { isAltusPartition, isTrustedWhatsAppURL, getSafeExternalHttpURL } from "./utils/security";
import { SettingsSchema } from "./stores/settings/common";

const windowState = new Store<{
  width: number | null;
  height: number | null;
  x: number | null;
  y: number | null;
}>({
  name: "windowState",
  defaults: {
    width: null,
    height: null,
    x: null,
    y: null,
  },
});

function getSettingWithDefault<Key extends SettingKey>(
  setting: Key
): Settings[Key]["value"] {
  const defaultValue = DefaultSettingValues[setting];
  try {
    const value = electronSettingsStore.get(setting).value;
    return value ?? defaultValue;
  } catch (error) {
    console.error(error);
    return defaultValue;
  }
}

let tray: Tray | undefined;

const iconsPath = path.join(__dirname, "assets", "icons");

const mainIcon = nativeImage.createFromPath(
  path.join(iconsPath, process.platform === "win32" ? "icon.ico" : "icon.png")
);

const mainNotificationIcon = nativeImage.createFromPath(
  path.join(iconsPath, "icon-notification.png")
);

const trayIcon = nativeImage.createFromPath(
  path.join(iconsPath, process.platform === "win32" ? "icon.ico" : "tray.png")
);

const trayNotificationIcon = nativeImage.createFromPath(
  path.join(iconsPath, "tray-notification.png")
);

function confirmAndExit() {
  dialog
    .showMessageBox({
      type: "question",
      buttons: [electronI18N.t("Exit"), electronI18N.t("Cancel")],
      title: electronI18N.t("Exit"),
      message: electronI18N.t("Are you sure you want to exit?"),
    })
    .then(({ response }) => {
      if (response !== 0) {
        return;
      }
      if (tray) tray.destroy();
      app.exit(0);
    });
}

function quitApp() {
  const shouldPrompt = getSettingWithDefault("exitPrompt");
  if (shouldPrompt) confirmAndExit();
  else app.exit(0);
}

function createWindow() {
  const useCustomTitlebar =
    process.platform !== "darwin" && getSettingWithDefault("customTitlebar");
  const rememberWindowSize = getSettingWithDefault("rememberWindowSize");
  const rememberWindowPosition = getSettingWithDefault(
    "rememberWindowPosition"
  );

  const mainWindow = new BrowserWindow({
    minWidth: 520,
    minHeight: 395,
    width: rememberWindowSize ? windowState.get("width") || 800 : undefined,
    height: rememberWindowSize ? windowState.get("height") || 600 : undefined,
    x: rememberWindowPosition ? windowState.get("x") ?? undefined : undefined,
    y: rememberWindowPosition ? windowState.get("y") ?? undefined : undefined,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webviewTag: true,
    },
    title: `${EXPERIMENT_NAME} ${app.getVersion()}`,
    show: false,
    frame: !useCustomTitlebar,
    titleBarStyle: useCustomTitlebar ? "hidden" : "default",
    icon: mainIcon,
  });

  // Every <webview> must be a WhatsApp Web tab in its own persistent
  // partition, running our preload without Node access, whatever the
  // renderer asked for.
  mainWindow.webContents.on(
    "will-attach-webview",
    (event, webPreferences, params) => {
      if (
        !isTrustedWhatsAppURL(params.src) ||
        !isAltusPartition(params.partition)
      ) {
        event.preventDefault();
        return;
      }
      webPreferences.preload = path.join(__dirname, "whatsapp.preload.js");
      webPreferences.nodeIntegration = false;
      webPreferences.nodeIntegrationInSubFrames = false;
      webPreferences.contextIsolation = true;
      webPreferences.sandbox = true;
    }
  );
  // The app UI is a local page: it never navigates away or opens windows.
  mainWindow.webContents.on("will-navigate", (event) => event.preventDefault());
  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // The window starts hidden; minimizing it before ready-to-show could
  // leave it inaccessible on some systems. Wait until its first paint.
  mainWindow.once("ready-to-show", () => {
    if (getSettingWithDefault("launchMinimized")) {
      mainWindow.showInactive();
      mainWindow.minimize();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  changeAutoHideMenuBar(mainWindow, getSettingWithDefault("autoHideMenuBar"));

  // Resizing/moving can emit hundreds of events. Persist the normal bounds
  // once activity settles, without writing on every animation frame.
  let boundsSaveTimer: ReturnType<typeof setTimeout> | undefined;
  const saveNormalBounds = () => {
    if (mainWindow.isDestroyed() || mainWindow.isMinimized()) return;
    windowState.store = mainWindow.getNormalBounds();
  };
  const scheduleBoundsSave = () => {
    if (boundsSaveTimer) clearTimeout(boundsSaveTimer);
    boundsSaveTimer = setTimeout(saveNormalBounds, 350);
  };
  mainWindow.on("resize", scheduleBoundsSave);
  mainWindow.on("move", scheduleBoundsSave);

  mainWindow.on("blur", () => mainWindow.webContents.send("window-blurred"));
  mainWindow.on("focus", () => mainWindow.webContents.send("window-focused"));

  mainWindow.on("close", (event) => {
    if (boundsSaveTimer) clearTimeout(boundsSaveTimer);
    saveNormalBounds();
    const shouldCloseToTray = getSettingWithDefault("closeToTray");
    const shouldPrompt = getSettingWithDefault("exitPrompt");
    if (shouldCloseToTray) {
      event.preventDefault();
      mainWindow.hide();
    } else if (shouldPrompt) {
      event.preventDefault();
      confirmAndExit();
    } else if (tray) {
      tray.destroy();
    }
  });

  return mainWindow;
}

const singleInstanceLock = app.requestSingleInstanceLock();

if (!singleInstanceLock) {
  app.exit();
} else {
  app.on("second-instance", (_, argv) => {
    if (BrowserWindow.getAllWindows().length === 0) return;

    const mainWindow = BrowserWindow.getAllWindows()[0];
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();

    if (argv.find((arg) => arg.includes("whatsapp"))) {
      handleWhatsappLinks(argv);
    }
  });

  app.on("ready", () => {
    if (process.platform === "win32") app.setAppUserModelId(EXPERIMENT_APP_ID);
    const userAgentFallback = app.userAgentFallback;
    app.userAgentFallback = userAgentFallback.replace(
      /(Altus|Electron)([^\s]+\s)/g,
      ""
    );

    if (process.argv.some((arg) => arg.includes("whatsapp"))) {
      handleWhatsappLinks(process.argv);
    }

    pruneUnusedPartitions(
      electronTabStore.get("tabs"),
      electronTabStore.get("previouslyClosedTab"),
      app.getPath("userData")
    );

    // A smoke-test run on a throwaway profile must not rewrite the autostart
    // entry of the installed app, which shares the same name.
    if (!hasExplicitProfileDirectory()) {
      const autoLauncher = new AutoLaunch({
        name: EXPERIMENT_NAME,
      });
      // disable() rejects when no entry exists yet; nothing to do then.
      (getSettingWithDefault("autoLaunch")
        ? autoLauncher.enable()
        : autoLauncher.disable()
      ).catch((error) => console.warn("Autostart update failed", error));
    }

    const mainWindow = createWindow();

    contextMenu();

    const defaultDownloadDir = getSettingWithDefault("defaultDownloadDir");
    electronDl({
      saveAs: getSettingWithDefault("showSaveDialog"),
      directory: defaultDownloadDir ? defaultDownloadDir : undefined,
    });

    initializeI18N(mainWindow).then(() => {
      toggleTray(mainWindow, getSettingWithDefault("trayIcon"));
    });

    addIPCHandlers(mainWindow);
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on("web-contents-created", (_, webContents) => {
    if (webContents.getType() === "webview") {
      // Popups stay disabled as before (no allowpopups); _blank links are
      // handled by the preload through the validated "open-link" channel.
      webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      // Keep each tab on WhatsApp Web; open other http(s) pages in the
      // default browser instead of inside the account's session.
      webContents.on("will-navigate", (event, url) => {
        if (isTrustedWhatsAppURL(url)) return;
        event.preventDefault();
        const externalURL = getSafeExternalHttpURL(url);
        if (!externalURL) return;
        void shell
          .openExternal(externalURL)
          .catch((error) => console.error("Failed to open external URL:", error));
      });

      contextMenu({
        window: {
          webContents: webContents,
          inspectElement: webContents.inspectElement.bind(webContents),
        } as unknown as BrowserWindow,
        showSaveImageAs: true,
        showInspectElement: true,
        append: (def, params, window) => [
          {
            label: "Bold",
            visible: params.isEditable,
            click: () => {
              (window as BrowserWindow).webContents.send("format-text", "*");
            },
          },
          {
            label: "Italic",
            visible: params.isEditable,
            click: () => {
              (window as BrowserWindow).webContents.send("format-text", "_");
            },
          },
          {
            label: "Strike",
            visible: params.isEditable,
            click: () => {
              (window as BrowserWindow).webContents.send("format-text", "~");
            },
          },
          {
            label: "Monospaced",
            visible: params.isEditable,
            click: () => {
              (window as BrowserWindow).webContents.send("format-text", "```");
            },
          },
        ],
      });
    }

    webContents.on("before-input-event", (event, input) => {
      if (getSettingWithDefault("preventEnter")) {
        if (input.key === "Enter" && !input.shift && !input.control) {
          webContents.sendInputEvent({
            keyCode: "Shift+Return",
            type: "keyDown",
          });
          event.preventDefault();
          return;
        }

        if (input.key === "Enter" && input.control) {
          try {
            webContents.executeJavaScript(
              `document.querySelector('button[aria-label="Send"]').click()`
            );
          } catch (error) {
            console.error(error);
          }
          event.preventDefault();
          return;
        }
      }
    });
  });
}

function handleWhatsappLinks(argv: string[]) {
  const arg = argv.find((arg) => arg.includes("whatsapp"));
  if (!arg) return;

  let url = "https://web.whatsapp.com/";

  if (arg.includes("send/?phone")) {
    url += arg.split("://")[1].replace("/", "");
  } else if (arg.includes("chat/?code")) {
    url += "accept?code=" + arg.split("=")[1];
  }

  const mainWindow = BrowserWindow.getAllWindows()[0];
  mainWindow.webContents.send("open-whatsapp-link", url);
}

function pruneUnusedPartitions(
  tabs: Tab[],
  previouslyClosedTab: Tab | null,
  userDataPath: string
) {
  const partitionsDirectoryPath = path.join(userDataPath, "Partitions");

  const doesPartitionsDirectoryExist = fs.existsSync(partitionsDirectoryPath);
  if (!doesPartitionsDirectoryExist) return;

  const tabIds = tabs.map((tab) => tab.id);
  if (previouslyClosedTab) {
    tabIds.push(previouslyClosedTab.id);
  }

  let partitions: string[];
  try {
    partitions = fs.readdirSync(partitionsDirectoryPath);
  } catch (error) {
    console.error("Could not list partitions", error);
    return;
  }

  for (const id of getPartitionsToPrune(partitions, tabIds)) {
    // A locked file must not abort startup; retry on the next launch.
    try {
      fs.rmSync(path.join(partitionsDirectoryPath, id), { recursive: true });
    } catch (error) {
      console.warn("Could not remove unused partition", error);
    }
  }
}

function changeAutoHideMenuBar(mainWindow: BrowserWindow, value: boolean) {
  mainWindow.setAutoHideMenuBar(value);
  mainWindow.setMenuBarVisibility(!value);
}

function toggleTray(mainWindow: BrowserWindow, enabled: boolean) {
  // Recreating an enabled tray icon without destroying the previous one leaks
  // an OS tray resource and can leave duplicate icons after toggling settings.
  if (tray) tray.destroy();
  tray = undefined;
  if (!enabled) return;
  if (process.platform === "darwin") {
    app.dock?.setMenu(getLocalizedTrayMenu());
  }
  tray = new Tray(
    process.platform === "darwin"
      ? trayIcon.resize({
          width: 16,
          height: 16,
        })
      : trayIcon
  );
  tray.setToolTip(EXPERIMENT_NAME);
  tray.setContextMenu(getLocalizedTrayMenu());
  tray.on("click", () => {
    if (process.platform !== "darwin") {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
      }
    }
  });
}

type PartitionID = string;
/**
 * For every permission that we want to handle, we keep track of the partitions
 * where it is enabled.
 */
const sessionPermissions = {
  notifications: new Set<PartitionID>(),
  media: new Set<PartitionID>(),
};
type SessionPermissionKey = keyof typeof sessionPermissions;
const HandledPermissions = Object.keys(sessionPermissions);

function addIPCHandlers(mainWindow: BrowserWindow) {
  // Every invoke channel serves the app's own UI. WhatsApp pages only use the
  // send channels below (zoom, open-link, message-count), which check their
  // sender themselves.
  const handle = (
    channel: string,
    listener: Parameters<typeof ipcMain.handle>[1]
  ) =>
    ipcMain.handle(channel, (event, ...args) => {
      if (event.sender !== mainWindow.webContents) {
        throw new Error(`Unauthorized IPC sender for ${channel}`);
      }
      return listener(event, ...args);
    });

  handle("get-whatsapp-preload-path", () => {
    // @ts-expect-error ImportMeta works correctly
    return import.meta.url.replace("main.js", "whatsapp.preload.js");
  });

  handle("settings-store-get", () => {
    return electronSettingsStore.store;
  });

  handle(
    "settings-store-set",
    (event, key: SettingKey, value: unknown) => {
      if (event.sender !== mainWindow.webContents) throw new Error("Unauthorized settings sender");
      if (typeof key !== "string" || !Object.prototype.hasOwnProperty.call(SettingsSchema.shape, key)) {
        throw new Error("Invalid setting key");
      }
      if (value === undefined) return electronSettingsStore.delete(key);
      const parsed = SettingsSchema.shape[key].safeParse({ value });
      if (!parsed.success) throw new Error("Invalid setting value");
      if (key === "autoHideMenuBar") {
        changeAutoHideMenuBar(mainWindow, value as boolean);
      } else if (key === "trayIcon") {
        toggleTray(mainWindow, value as boolean);
      }
      return electronSettingsStore.set(key, { value });
    }
  );

  handle("tab-store-get", () => {
    return electronTabStore.store;
  });

  handle(
    "tab-store-set",
    (event, key: keyof TabStore, value: unknown) => {
      if (event.sender !== mainWindow.webContents) throw new Error("Unauthorized tab sender");
      if (!["tabs", "selectedTabId", "previouslyClosedTab"].includes(key)) throw new Error("Invalid tab store key");
      if (value === undefined) return electronTabStore.delete(key);
      return electronTabStore.set(key, value);
    }
  );

  handle("theme-store-get", () => {
    return electronThemeStore.store;
  });

  handle(
    "theme-store-set",
    (event, key: keyof ThemeStore, value: unknown) => {
      if (event.sender !== mainWindow.webContents || key !== "themes") throw new Error("Unauthorized theme store update");
      if (value === undefined) return electronThemeStore.delete(key);
      return electronThemeStore.set(key, value);
    }
  );

  handle("init-permission-handler", (event, partitionId: unknown) => {
    if (event.sender !== mainWindow.webContents || !isAltusPartition(partitionId)) {
      throw new Error("Unauthorized session partition");
    }
    session
      .fromPartition(partitionId)
      .setPermissionRequestHandler((requestingContents, permission, callback) => {
        if (!isTrustedWhatsAppURL(requestingContents.getURL()) || !HandledPermissions.includes(permission)) {
          callback(false);
          return;
        }
        const isEnabled =
          sessionPermissions[permission as SessionPermissionKey].has(partitionId);
        callback(isEnabled);
      });
  });

  handle(
    "toggle-notifications",
    (event, enabled: boolean, partitionId: string) => {
      if (event.sender !== mainWindow.webContents || !isAltusPartition(partitionId) || typeof enabled !== "boolean") {
        throw new Error("Invalid notification permission update");
      }
      if (enabled) {
        sessionPermissions.notifications.add(partitionId);
      } else {
        sessionPermissions.notifications.delete(partitionId);
      }
    }
  );

  handle(
    "toggle-media-permission",
    (event, enabled: boolean, partitionId: string) => {
      if (event.sender !== mainWindow.webContents || !isAltusPartition(partitionId) || typeof enabled !== "boolean") {
        throw new Error("Invalid media permission update");
      }
      if (enabled) {
        sessionPermissions.media.add(partitionId);
      } else {
        sessionPermissions.media.delete(partitionId);
      }
    }
  );

  ipcMain.on("open-link", (event, rawURL: unknown) => {
    if (event.sender.getType() !== "webview" || !isTrustedWhatsAppURL(event.sender.getURL())) return;
    const url = getSafeExternalHttpURL(rawURL);
    if (!url) return;
    void shell.openExternal(url).catch((error) => console.error("Failed to open external URL:", error));
  });

  handle(
    "show-message-box",
    (_event, options: Electron.MessageBoxOptions) => {
      return dialog.showMessageBox(options);
    }
  );

  handle("get-app-menu", () => {
    const menu = Menu.getApplicationMenu();
    if (!menu) return;
    const cloneableMenu = getCloneableMenu(menu);
    return cloneableMenu;
  });

  handle("menu-item-click", (_event, id: string) => {
    const menu = Menu.getApplicationMenu();
    if (!menu) return;
    const item = menu.getMenuItemById(id);
    if (!item) return;
    const focusedWindow = BrowserWindow.getFocusedWindow();
    if (!focusedWindow) return;
    const focusedWebContents = focusedWindow.webContents;
    item.click(undefined, focusedWindow, focusedWebContents);
  });

  handle("minimize-window", () => {
    mainWindow.minimize();
  });

  handle("maximize-window", () => {
    mainWindow.maximize();
  });

  handle("restore-window", () => {
    mainWindow.restore();
  });

  handle("close-window", () => {
    mainWindow.close();
  });

  handle("is-maximized", () => {
    return mainWindow.isMaximized();
  });

  handle("is-blurred", () => {
    return !mainWindow.isFocused();
  });

  ipcMain.on("zoom", ({ sender }, type) => {
    if (sender.getType() !== "webview" || !isTrustedWhatsAppURL(sender.getURL())) return;
    if (!["in", "out", "reset"].includes(type)) return;
    const currentZoomFactor = sender.getZoomFactor();
    switch (type) {
      case "in":
        sender.setZoomFactor(Math.min(2.5, currentZoomFactor + 0.1));
        break;
      case "out":
        sender.setZoomFactor(Math.max(0.5, currentZoomFactor - 0.1));
        break;
      default:
        sender.setZoomFactor(1);
        break;
    }
  });

  const unreadByTab = new Map<string, number>();
  ipcMain.on("message-count", (event, detail: unknown) => {
    if (event.sender.getType() !== "webview" || !isTrustedWhatsAppURL(event.sender.getURL())) return;
    if (!detail || typeof detail !== "object") return;
    const { tabId, messageCount } = detail as { tabId?: unknown; messageCount?: unknown };
    if (typeof tabId !== "string" || !Number.isSafeInteger(messageCount) ||
        (messageCount as number) < 0 || (messageCount as number) > 100000) return;
    const activeIds = new Set(electronTabStore.get("tabs").map((tab) => tab.id));
    if (!activeIds.has(tabId)) return;
    for (const id of unreadByTab.keys()) {
      if (!activeIds.has(id)) unreadByTab.delete(id);
    }
    unreadByTab.set(tabId, messageCount as number);
    mainWindow.webContents.send("message-count", { tabId, messageCount });
    if (!getSettingWithDefault("notificationBadge")) {
      return;
    }
    const totalUnread = [...unreadByTab.values()].reduce((sum, count) => sum + count, 0);
    if (totalUnread > 0) {
      switch (process.platform) {
        case "darwin":
          app.dock?.setBadge("·");
          break;
        default:
          if (tray) tray.setImage(trayNotificationIcon);
          mainWindow.setOverlayIcon(mainNotificationIcon, "Notification badge");
          break;
      }
    } else {
      switch (process.platform) {
        case "darwin":
          app.dock?.setBadge("");
          break;
        default:
          if (tray) tray.setImage(trayIcon);
          mainWindow.setOverlayIcon(null, "Notification badge empty");
          break;
      }
    }
  });
}

type CloneableMenuItem = Omit<MenuItem, "menu" | "submenu" | "click"> & {
  submenu?: CloneableMenu;
};
export type CloneableMenu = CloneableMenuItem[];

function getCloneableMenu(menu: Menu) {
  return menu.items.map(getCloneableMenuItem);
}

function getCloneableMenuItem(item: MenuItem): CloneableMenuItem {
  const cloneableItem = { ...item } as CloneableMenuItem & {
    menu?: Menu;
    submenu?: Menu;
    click?: () => void;
  };
  delete cloneableItem["menu"];
  delete cloneableItem["click"];
  if (cloneableItem.submenu) {
    (cloneableItem as CloneableMenuItem).submenu = getCloneableMenu(
      cloneableItem.submenu as Menu
    );
  }
  cloneableItem.checked = item.checked;
  return cloneableItem;
}

async function initializeI18N(mainWindow: BrowserWindow) {
  electronI18N.setLanguageChangeCallback((language) => {
    electronSettingsStore.set("language", {
      value: language,
    });
  });

  electronI18N.setLanguageLoadedCallback(() => {
    const menu = getLocalizedMainMenu();
    Menu.setApplicationMenu(menu);
    mainWindow.webContents.send("reload-custom-title-bar");
    mainWindow.webContents.send("reload-translations");
  });

  try {
    await electronI18N.initialize();

    const initialLanguage = getSettingWithDefault("language");
    electronI18N.setLanguage(initialLanguage);
  } catch (error) {
    console.error(error);
  }
}

const versionInfo = `${EXPERIMENT_NAME}: ${app.getVersion()}
Electron: ${process.versions.electron}
Chrome: ${process.versions.chrome}
V8: ${process.versions.v8}
OS: ${os.type()} ${os.arch()} ${os.release()}`;

const aboutDialogText = `With help from: MarceloZapatta, Dafnik, dmcdo, insign, srevinsaju, maicol07, ngmoviedo.

Thanks to: vednoc for Dark WhatsApp theme.
  
${versionInfo}`;

function getLocalizedMainMenu() {
  const menuTemplate: (
    | Electron.MenuItemConstructorOptions
    | Electron.MenuItem
  )[] = [
    {
      label: electronI18N.t("&File"),
      submenu: [
        {
          label: electronI18N.t("Start &New Chat"),
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("new-chat");
          },
          id: "start-new-chat",
        },
        {
          label: electronI18N.t("Force &Reload"),
          role: "forceReload",
          id: "force-reload",
        },
        {
          label: electronI18N.t("&Quit"),
          id: "quit",
          accelerator: "CmdOrCtrl+Q",
          acceleratorWorksWhenHidden: false,
          click: quitApp,
        },
      ],
    },
    {
      label: electronI18N.t("&Edit"),
      submenu: [
        {
          label: electronI18N.t("Undo"),
          role: "undo",
          id: "undo",
        },
        {
          label: electronI18N.t("Redo"),
          role: "redo",
          id: "redo",
        },
        {
          type: "separator",
        },
        {
          label: electronI18N.t("Cut"),
          role: "cut",
          id: "cut",
        },
        {
          label: electronI18N.t("Copy"),
          role: "copy",
          id: "copy",
        },
        {
          label: electronI18N.t("Paste"),
          role: "paste",
          id: "paste",
        },
        {
          label: electronI18N.t("Select All"),
          role: "selectAll",
          id: "select-all",
        },
        {
          type: "separator",
        },
        {
          label: electronI18N.t("Language"),
          submenu: languages.map((lang) => {
            return {
              label: electronI18N.t(lang),
              type: "radio",
              checked: electronI18N.getLanguage() === lang,
              click: () => {
                electronI18N.setLanguage(lang);
              },
              id: lang,
            };
          }),
        },
      ],
    },
    {
      label: electronI18N.t("Tab"),
      submenu: [
        {
          label: electronI18N.t("Add New Tab"),
          accelerator: "CmdOrCtrl+T",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("add-new-tab");
          },
          id: "add-new-tab",
        },
        {
          label: electronI18N.t("Edit Active Tab"),
          accelerator: "CmdOrCtrl+E",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("edit-active-tab");
          },
          id: "edit-active-tab",
        },
        {
          label: electronI18N.t("Close Active Tab"),
          accelerator: "CmdOrCtrl+W",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("close-active-tab");
          },
          id: "close-active-tab",
        },
        {
          label: electronI18N.t("Open Tab DevTools"),
          accelerator: "CmdOrCtrl+Shift+D",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("open-tab-devtools");
          },
          id: "open-tab-devtools",
        },
        {
          label: electronI18N.t("Restore Tab"),
          accelerator: "CmdOrCtrl+Shift+T",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("restore-tab");
          },
          id: "restore-tab",
        },
        {
          type: "separator",
        },
        {
          label: electronI18N.t("Go to Next Tab"),
          accelerator: "CmdOrCtrl+Tab",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("next-tab");
          },
          id: "next-tab",
        },
        {
          label: electronI18N.t("Go to Previous Tab"),
          accelerator: "CmdOrCtrl+Shift+Tab",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("previous-tab");
          },
          id: "previous-tab",
        },
        {
          type: "separator",
        },
        {
          label: electronI18N.t("Go to First Tab"),
          accelerator: "CmdOrCtrl+1",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("first-tab");
          },
          id: "first-tab",
        },
        {
          label: electronI18N.t("Go to Last Tab"),
          accelerator: "CmdOrCtrl+9",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("last-tab");
          },
          id: "last-tab",
        },
      ],
    },
    {
      label: electronI18N.t("Themes"),
      submenu: [
        {
          label: electronI18N.t("Theme Manager"),
          accelerator: "Alt+T",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("open-theme-manager");
          },
          id: "open-theme-manager",
        },
      ],
    },
    {
      label: electronI18N.t("&Settings"),
      submenu: [
        {
          label: electronI18N.t("&Settings"),
          accelerator: "Ctrl+,",
          click() {
            const window = BrowserWindow.getFocusedWindow();
            if (window) window.webContents.send("open-settings");
          },
          id: "open-settings",
        },
      ],
    },
    {
      label: electronI18N.t("&Help"),
      submenu: [
        {
          label: electronI18N.t("&About"),
          click() {
            dialog
              .showMessageBox({
                type: "info",
                title: `${EXPERIMENT_NAME} v${app.getVersion()}`,
                message: `Made by Aman Harwara.`,
                detail: aboutDialogText,
                icon: mainIcon,
                buttons: ["Copy Version Info", "OK"],
              })
              .then((res) => {
                const buttonClicked = res.response;
                switch (buttonClicked) {
                  case 0:
                    void clipboard.writeText(versionInfo).catch(console.error);
                    break;
                }
              })
              .catch((err) => {
                console.error(err);
              });
          },
          id: "about",
        },
        {
          label: electronI18N.t("Check For &Updates"),
          accelerator: "CmdOrCtrl+Shift+U",
          click() {
            dialog
              .showMessageBox({
                type: "question",
                message: "Check for Updates?",
                detail: `Current version: v${app.getVersion()}`,
                buttons: ["Yes", "No"],
              })
              .then((res) => {
                const buttonClicked = res.response;
                if (buttonClicked === 0) {
                  // checkUpdates().catch((err) => console.error(err));
                }
              })
              .catch((err) => console.error(err));
          },
          id: "check-for-updates",
        },
        {
          label: electronI18N.t("Links"),
          submenu: [
            {
              label: electronI18N.t("Report Bugs/Issues"),
              click: () => {
                shell.openExternal(
                  "https://gitlab.com/amanharwara/altus/-/issues"
                );
              },
              id: "report-bugs-issues",
            },
            {
              label: electronI18N.t("Website"),
              click: () => {
                shell.openExternal("https://amanharwara.com");
              },
              id: "website",
            },
            {
              label: electronI18N.t("Repository"),
              click: () => {
                shell.openExternal("https://www.github.com/amanharwara/altus");
              },
              id: "repository",
            },
          ],
        },
        {
          label: electronI18N.t("Open &DevTools"),
          role: "toggleDevTools",
          id: "toggle-dev-tools",
        },
      ],
    },
  ];

  return Menu.buildFromTemplate(menuTemplate);
}

function getLocalizedTrayMenu() {
  const menuTemplate: (
    | Electron.MenuItemConstructorOptions
    | Electron.MenuItem
  )[] = [
    {
      label: electronI18N.t("Maximize"),
      click() {
        const window = BrowserWindow.getAllWindows()[0];
        if (window) window.show();
      },
    },
    {
      label: electronI18N.t("Minimize to Tray"),
      click() {
        const window = BrowserWindow.getAllWindows()[0];
        if (window) window.hide();
      },
    },
    {
      label: electronI18N.t("Quit"),
      click: quitApp,
    },
  ];

  return Menu.buildFromTemplate(menuTemplate);
}
