# Releasing Altus +

The in-app updater (`src/updater.ts`, electron-updater) reads the latest
**published, non-prerelease** GitHub release of `lukethehawk/altus` and needs
three files attached to it:

| File | Purpose |
|---|---|
| `Altus-Plus-Setup-<version>.exe` | the NSIS installer |
| `latest.yml` | version, file name and SHA512 the app verifies before installing |
| `Altus-Plus-Setup-<version>.exe.blockmap` | lets the next update download only what changed |

A release without `latest.yml` is ignored by the updater (users get an error
on a manual check and nothing on startup).

## Steps

1. Bump `version` in `package.json` (e.g. `5.8.1-plus.3` → `5.8.1-plus.4`) in
   the PR, merge it into `master`.
2. Wait for the **Altus + Windows installer** run on `master` and download its
   `Altus-Plus-Windows` artifact: it contains the three files above, built
   with `yarn install --immutable`.
3. Check that `latest.yml` names the same version and that its `sha512`
   matches the installer.
4. Create the release on the merge commit, tag `v<version>`, attach the three
   files, publish it as **Latest** (not as a pre-release).

Running installs download the update in the background, offer "Restart now /
Later", and otherwise install it silently the next time the app quits.

## Testing the updater locally

`ALTUS_TEST_UPDATE_FEED` (read at build time by `vite.main.config.ts`) points a
build at a generic feed instead of GitHub; release builds never set it.

1. Build the "new" version with `yarn make -p win32` and serve `out/make`
   (installer, `latest.yml`, `.blockmap`) over HTTP, e.g. on port 8765.
2. Build an older version with
   `ALTUS_TEST_UPDATE_FEED=http://127.0.0.1:8765/ yarn package -p win32`.
3. Run it with `--user-data-dir` on a throwaway profile and use
   Help → Check for Updates. Do not choose "Restart now" on a machine where
   Altus + is installed for real: the installer would replace it.

Downloads are cached in `%LOCALAPPDATA%\altus-plus-updater`.
