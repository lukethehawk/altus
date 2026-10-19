# Altus Electron 44 Test (isolated experiment)

**Do not install this over your daily-use Altus.** This branch has an independent
Windows installer identity, app title, autostart name and Electron user-data path.

| Setting | Official Altus | Test build |
|---|---|---|
| Product name | Altus | Altus Electron 44 Test |
| App ID | harwara.aman.altus | com.lukethehawk.altus.electron44test |
| Windows data directory | Usually `%APPDATA%\\Altus` | `%APPDATA%\\Altus Electron 44 Test` |
| whatsapp:// registration | Optional | **Disabled** |
| Electron | 35.1.5 | 44.9.0 |

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

Only use this branch for evaluation. Do not merge it into `master` until
Windows behavior and session isolation have been verified.
