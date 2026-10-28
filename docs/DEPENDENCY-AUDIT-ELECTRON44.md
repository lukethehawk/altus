# Dependency audit — Electron 44 isolated build

Date: 2026-10-28. Branch: `security/electron44-deps-refresh`
(base `experiment/electron44-isolated` @ `bd15bc8` + lockfile refresh `ea86131` from PR #3).

## What changed

Only `yarn.lock`, keeping the semver ranges already declared:

| Package | Before | After |
|---|---:|---:|
| seroval (SolidJS runtime) | 1.2.1 | 1.6.11 |
| proxy-addr | 2.0.7 | 2.0.8 |
| form-data | 4.0.0 | 4.0.6 |
| tar 7.x | 7.4.3 | 7.5.22 |
| tar 6.x (dedup) | 6.2.0 + 6.2.1 | 6.2.1 |

## How the audit was run

```
yarn npm audit --all --recursive --environment production --json
yarn npm audit --all --recursive --environment development --json
yarn npm audit --all --recursive --environment all --json
```

| Scope | critical | high | moderate | low | total |
|---|---:|---:|---:|---:|---:|
| production (`dependencies`) | 0 | 32 | 19 | 2 | 53 |
| development (`devDependencies`) | 1 | 83 | 64 | 15 | 163 |
| all (deduplicated) | 1 | 87 | 65 | 15 | 168 |

## Why the production/development split is misleading here

`package.json` sorting does not match what ships in the installer:

- **`electron` is a devDependency but it is the runtime.** Yarn files its
  advisories under "development".
- **The app code is bundled by Vite** (Electron Forge Vite plugin). In the
  local build, `.vite/build/main.js` only `require`s Node built-ins and
  `electron`; everything else (electron-store/conf/ajv, auto-launch,
  electron-dl, electron-context-menu, zod, nanoid, solid-js/seroval) is
  inlined in the bundles. Build-only packages that sit under `dependencies`
  (e.g. `@kobalte/tailwindcss` → `tailwindcss` → `postcss`, `micromatch`,
  `glob`, `brace-expansion`) inflate the "production" count without running
  in the app.

The triage below therefore classifies by **what code runs in the packaged app**.

## Packaging finding (pre-existing, not changed here)

`resources/app` in the packaged build is **not an asar** and contains the
whole repository (sources, `.github`, `tests`, configs) plus an 83-entry
`node_modules` that includes dev tooling (`@babel`, `@eslint`,
`@electron-forge`, `@xmldom`, …). The bundles do not load these files, so
they are dead weight rather than an active attack surface, but they make the
installer larger and the audit harder to reason about. Tightening
`packagerConfig` (`asar`, `ignore`) changes how the app loads its files and
must be done as its own tested change.

## Triage

### Shipped runtime — act on these

| Advisory | Package | Reachability | Action |
|---|---|---|---|
| Mitigation for compromised eMudhra intermediate certificates (high) | `electron@44.9.0`, fixed in 44.9.1 | Runtime TLS trust store used for every WhatsApp Web connection | **Bump Electron to the latest 44.x patch in a separate, user-tested step** (44.10.0 / 44.9.3 available on 2026-10-28) |
| Several DoS / integer issues (high) | `nanoid@5.1.5` (direct) | Only called with constant sizes to create tab IDs; not fed remote input | Low priority; patch bump within `^5` when touching deps next |
| Memory exhaustion on oversized constrained collections (high) | `zod@3.24.2` (direct) | Validates settings IPC from our own renderer; fix requires zod 4 (major) | Low priority; do not major-bump without a dedicated change |
| ReDoS with `$data` option (moderate) | `ajv@8.12.0` via `electron-store` → `conf` | Schema is ours and does not use `$data` | Not reachable |

### Build / packaging only — not shipped in the EXE

`tar@6.2.1` (the one **critical**, DoS on decompression, via `app-builder-lib`),
`@xmldom/xmldom`, `extract-zip`, `js-yaml`, `minimatch`, `glob`,
`brace-expansion`, `postcss`, `rollup`, `vite`, `express`/`body-parser`/
`path-to-regexp`/`ws` (Forge dev server), `lodash` (Forge), `tmp`,
`cross-spawn`, `flatted`, `browserslist`, `builder-util-runtime`/
`electron-updater` advisories (updater not used by this app).

These only run on the developer/CI machine against inputs we control
(our own sources, Electron/NSIS downloads over HTTPS). They matter for
supply-chain hygiene, not for the installed app. Fixing most of them needs
major upgrades of Forge / Vite / electron-builder and is out of scope for a
lockfile-only change.

## Not claimed

- This does not prove the shipped app is free of vulnerabilities; it only
  re-checks the dependency graph against the npm advisory database on the
  date above.
- Reachability notes are based on reading how each package is used, not on
  dynamic testing.
