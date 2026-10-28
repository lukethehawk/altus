# Altus Electron 44 Test (isolated experiment)

**Do not install this over your daily-use Altus.** This branch has an independent
Windows installer identity, app title, autostart name and Electron user-data path.

| Setting | Official Altus | Test build |
|---|---|---|
| Product name | Altus | Altus Electron 44 Test |
| App ID | harwara.aman.altus | com.lukethehawk.altus.electron44test |
| Windows data directory | Usually `%APPDATA%\\Altus` | `%APPDATA%\\Altus Electron 44 Test` |
| whatsapp:// registration | Optional | **Disabled** |
| Electron | 35.1.5 | 44.10.0 |

The test build uses **new WhatsApp Web partitions**: expect to pair WhatsApp again
with a QR code or phone linking. It will not copy or migrate your original sessions.

## Build and installation on Windows

In GitHub Actions, find the **Electron 44 isolated Windows build** workflow on
this branch and download the `Altus-Electron44-Test-Windows` artifact from a
successful run. Extract the ZIP and launch the contained installer.

Or locally, using Node.js 22 and Corepack:

```powershell
corepack enable
yarn install --immutable
yarn lint
yarn make -p win32
```

Verify the resulting installer/window says **Altus Electron 44 Test** before
signing in. Windows SmartScreen may warn about unsigned binaries.

## Smoke tests

1. Launch original Altus and test variant side by side; confirm their accounts and settings differ.
2. Pair a test WhatsApp account and verify it stays connected after closing/reopening.
3. Test download/upload, external links, clipboard copy/paste, media permissions,
   two accounts, notifications and close-to-tray.
4. Monitor idle CPU and RAM in Windows Task Manager with equal account counts.
5. Quit the test build and verify original Altus still starts with existing sessions.

## Regression checks for the hardening branches

Installing a newer test build over an existing one keeps the same
`%APPDATA%\\Altus Electron 44 Test` profile, so paired accounts should stay
logged in.

1. **Voice message from a background tab:** with three accounts A, B, C,
   play a voice message in B, switch to A and then C: the audio keeps playing.
   Turning sound off for B silences only B.
2. **Notifications** arrive from all three accounts while another tab, or the
   tray, is in front.
3. **Links:** a link in a chat opens in the default browser; the tab stays on
   WhatsApp Web. Downloads, uploads, image previews and copy/paste still work.
4. **Reopen closed tab:** close a tab, use "Restore closed tab": the account
   is still logged in.
5. **Crash recovery:** in Task Manager end one of the "Altus Electron 44 Test"
   renderer processes. The affected tab (or the whole window, if that
   renderer was the app UI) reloads within a few seconds on its own and stays
   logged in; other accounts are not reloaded.
6. Autostart on/off in settings still applies after a restart.

### Packaged smoke run without touching your profile

`--user-data-dir` overrides the profile folder and skips autostart changes,
so a build can be checked on a throwaway profile. Keep the path short:
Chromium's CacheStorage fails beyond Windows' 260-character path limit.

```powershell
& ".\out\Altus Electron 44 Test-win32-x64\Altus Electron 44 Test.exe" --user-data-dir="$env:TEMP\altus-smoke"
```

Only use this branch for evaluation. Do not merge it into `master` until
Windows behavior and session isolation have been verified.
