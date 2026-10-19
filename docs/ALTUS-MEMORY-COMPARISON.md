# Compare Altus Electron 35 and Electron 44 RAM usage

This **optional, read-only** PowerShell script compares the two apps you
already installed. It does not modify either app, require administrator
privileges, disable GPU acceleration, or suspend account notifications.

## Instructions

1. Launch original Altus and **Altus Electron 44 Test** with the same number of
   WhatsApp accounts, and leave both open for 30 minutes.
2. Download [compare-altus-processes.ps1](scripts/compare-altus-processes.ps1)
   from this branch. Open the file to inspect it.
3. Open PowerShell in the folder where you saved it, and run:

   ```powershell
   powershell -NoProfile -ExecutionPolicy Bypass -File .\compare-altus-processes.ps1
   ```

4. Wait for 3 samples (15 seconds apart). The tool saves two CSV files to
   your Desktop. Share **only the CSV reports** for analysis.

By default it records process ID, sanitized Chromium role (renderer, GPU,
utility, browser/main), process working-set memory and private committed memory.
**No command-line arguments, WhatsApp URLs, session files, chat data or profile
paths are written to the reports.**

### Interpreting the result

Windows Task Manager and PowerShell report different memory metrics. Sum of
per-process working sets may double-count shared pages. Compare only the same
metric across **both** versions and use the process roles to identify where
their difference comes from.

To increase the observation window:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\compare-altus-processes.ps1 -Samples 5 -IntervalSeconds 30
```

The script assumes the app processes on Windows are named `Altus.exe` and
`Altus Electron 44 Test.exe`. Chromium subprocesses with the generic Altus
name are grouped under their parent process to avoid misclassification.
