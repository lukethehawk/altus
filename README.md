<div align="center">

<img src="public/assets/icons/icon.png" alt="Altus + icon" width="96" />

# Altus +

**Several WhatsApp accounts in one desktop app, kept up to date.**

[![Latest release](https://img.shields.io/github/v/release/lukethehawk/altus-plus?label=release)](https://github.com/lukethehawk/altus-plus/releases/latest)
[![Platform](https://img.shields.io/badge/platform-Windows%20x64-0078D6)](https://github.com/lukethehawk/altus-plus/releases/latest)
[![License](https://img.shields.io/github/license/lukethehawk/altus-plus)](LICENSE)

**English** · [Italiano](README.it.md)

</div>

---

Altus + is a maintained fork of [**Altus**](https://github.com/amanharwara/altus) by [Aman Harwara](https://github.com/amanharwara), an Electron wrapper around WhatsApp Web with tabs for multiple accounts.

The original project is no longer updated. Altus + keeps it running on a current Electron and adds what daily use with several accounts needs. It puts **security first, then stability, then resource use**.

## Highlights

| | |
|---|---|
| 👥 **Multiple accounts** | One tab per WhatsApp account, each in its own isolated session. |
| 🔔 **Clear notifications** | Notification titles show the account (`Work · Mario Rossi`). A click opens the right tab and chat. |
| 🔕 **Per-account mute** | Right-click a tab to mute it for 1 hour, 8 hours or until you turn it back on. Other accounts keep notifying. |
| 🔊 **Background audio** | Voice messages keep playing when you switch tab; inactive tabs are never suspended or muted. |
| 📎 **Download notice** | "Attachment saved · Show in folder" after each download. |
| 🩹 **Crash recovery** | A crashed or frozen account reloads on its own without touching the others. |
| ⬆️ **In-app updates** | New releases download in the background, are verified (SHA512) and install with one click. A notice stays on screen while they install. |
| 🌐 **English / Italiano** | Settings → Language, applied at once. |
| 🛡️ **Hardened** | Up-to-date Electron (44), locked-down webviews, links opened in your browser, checked IPC. |

## Download

1. Download **`Altus-Plus-Setup-<version>.exe`** from the [latest release](https://github.com/lukethehawk/altus-plus/releases/latest).
2. Run it and follow the setup.

> [!NOTE]
> The installer is not code-signed, so Windows SmartScreen may show "Windows protected your PC". Click **More info → Run anyway**. Each release lists the installer's SHA256 if you want to check it.

From then on Altus + updates itself. It checks at startup (Settings → *Check for updates at startup*) or from **Help → Check for Updates**, then asks **Restart now / Later**.

Altus + uses its own data folder. It does not read, change or remove anything belonging to the original Altus, so both can stay installed.

## Keyboard shortcuts

| Action | Shortcut |
|---|---|
| New tab | `Ctrl+T` |
| Edit current tab | `Ctrl+E` |
| Close current tab | `Ctrl+W` |
| Reopen closed tab | `Ctrl+Shift+T` |
| Next / previous tab | `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| First / last tab | `Ctrl+1` / `Ctrl+9` |
| Settings | `Ctrl+,` |
| Theme manager | `Alt+T` |
| Check for updates | `Ctrl+Shift+U` |
| Quit | `Ctrl+Q` |

## Privacy

Altus + loads WhatsApp Web and nothing else in its tabs. Its only other connection is to GitHub, to check for updates, and you can switch that off. There is no telemetry.

## Build from source

Requires Node.js 22 or later and Corepack (Yarn 4).

```bash
corepack enable
yarn install --immutable
yarn start        # run in development
yarn lint         # type check + ESLint
yarn test         # unit tests
yarn make         # Windows installer in out/make
```

Release steps are in [`docs/RELEASING.md`](docs/RELEASING.md) and manual checks in [`TESTING-ELECTRON44.md`](TESTING-ELECTRON44.md).

## Feedback

Found a bug or have an idea? [Open an issue](https://github.com/lukethehawk/altus-plus/issues). For a bug, include the version (Help → About → Copy Version Info).

## Credits

Altus + exists thanks to [**Altus**](https://github.com/amanharwara/altus) by **Aman Harwara**, and to everyone who contributed to it:

- [Melvin-Abraham](https://github.com/Melvin-Abraham) — fixes for [#53](https://github.com/amanharwara/altus/issues/53), [#55](https://github.com/amanharwara/altus/issues/55)
- [Dylan McDougall](https://github.com/dmcdo) — exit confirmation dialog ([#10](https://github.com/amanharwara/altus/pull/10))
- [Dafnik](https://github.com/Dafnik) — fix for [#4](https://github.com/amanharwara/altus/issues/4) ([#5](https://github.com/amanharwara/altus/pull/5))
- [Marcelo Zapatta](https://github.com/MarceloZapatta) — Linux tray icon ([#77](https://github.com/amanharwara/altus/pull/77))
- [Maicol Battistini](https://github.com/maicol07) — Italian translation ([#153](https://github.com/amanharwara/altus/pull/153))
- [Nicolás González Meneses](https://github.com/ngmoviedo) — Spanish translation ([#163](https://github.com/amanharwara/altus/pull/163))
- [Hugo Rocha de Moura](https://github.com/hugorochaffs) — Portuguese translation ([#185](https://github.com/amanharwara/altus/pull/185))

Built with [Electron](https://www.electronjs.org/), [SolidJS](https://www.solidjs.com/), [Kobalte](https://kobalte.dev/), [electron-store](https://github.com/sindresorhus/electron-store) and [electron-updater](https://www.electron.build/auto-update). The dark theme is based on [vednoc/dark-whatsapp](https://github.com/vednoc/dark-whatsapp).

Altus + is not affiliated with WhatsApp or Meta.

## License

[GPL-3.0](LICENSE), like the original Altus. Copyright of the original code remains with its authors.
