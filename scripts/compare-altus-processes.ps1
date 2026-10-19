<#
.SYNOPSIS
  Compare memory used by official Altus and Altus Electron 44 Test on Windows.
.DESCRIPTION
  No administrator privileges, app modifications, chat access, or network calls.
  Samples the processes already running on this PC. Does not export process
  command lines, profile directories, account names, WhatsApp URLs or messages.
.EXAMPLE
  powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\compare-altus-processes.ps1
#>
[CmdletBinding()]
param(
    [ValidateRange(1, 10)]
    [int]$Samples = 3,

    [ValidateRange(5, 120)]
    [int]$IntervalSeconds = 15,

    [string]$OutputDirectory = [Environment]::GetFolderPath('Desktop')
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Get-ProcessKind {
    param([string]$CommandLine)
    if ([string]::IsNullOrWhiteSpace($CommandLine)) { return 'Unknown' }
    if ($CommandLine -match '(?:^|\s)--type=([a-zA-Z0-9-]+)') {
        $kind = $Matches[1]
        if ($kind -eq 'utility' -and $CommandLine -match '(?:^|\s)--utility-sub-type=([\w.]+)') {
            $service = $Matches[1]
            if ($service -like '*NetworkService*') { return 'Utility/Network' }
            if ($service -like '*AudioService*') { return 'Utility/Audio' }
            return 'Utility/Other'
        }
        return $kind
    }
    return 'Browser/main'
}

function Get-RootProcess {
    param($Process, [hashtable]$ByPid)
    $current = $Process
    $seen = @{}
    while ($null -ne $current -and $ByPid.ContainsKey([int]$current.ParentProcessId)) {
        $parentPid = [int]$current.ParentProcessId
        if ($seen.ContainsKey($parentPid)) { break }
        $seen[$parentPid] = $true
        $current = $ByPid[$parentPid]
    }
    return $current
}

function Get-SizeMB {
    param([long]$Bytes)
    return [math]::Round(($Bytes / 1MB), 1)
}

$allRows = [System.Collections.Generic.List[object]]::new()
$summaryRows = [System.Collections.Generic.List[object]]::new()
$started = Get-Date

Write-Host 'Altus memory diagnostic (no chats or personal data collected)'
Write-Host ('Samples: {0}, interval: {1}s' -f $Samples, $IntervalSeconds)

for ($sample = 1; $sample -le $Samples; $sample++) {
    # Obtain parent IDs once, so subprocesses bearing "Altus.exe" still count
    # towards the correct Electron 44 parent application.
    $processes = @(Get-CimInstance -ClassName Win32_Process | Where-Object {
        $_.Name -like 'Altus*.exe'
    })
    $byPid = @{}
    foreach ($proc in $processes) { $byPid[[int]$proc.ProcessId] = $proc }

    $sampleRows = [System.Collections.Generic.List[object]]::new()
    foreach ($proc in $processes) {
        $root = Get-RootProcess -Process $proc -ByPid $byPid
        $variant = if ($root.Name -like '*Electron 44 Test*') {
            'Electron 44 Test'
        } else {
            'Original Altus'
        }

        try {
            $live = Get-Process -Id ([int]$proc.ProcessId) -ErrorAction Stop
            $row = [pscustomobject]@{
                Sample           = $sample
                Timestamp        = (Get-Date).ToString('s')
                Variant          = $variant
                Pid              = [int]$proc.ProcessId
                Kind             = Get-ProcessKind -CommandLine $proc.CommandLine
                WorkingSetMB     = Get-SizeMB -Bytes $live.WorkingSet64
                PrivateMemoryMB  = Get-SizeMB -Bytes $live.PrivateMemorySize64
            }
            $sampleRows.Add($row)
            $allRows.Add($row)
        } catch {
            # A Chromium child process may have exited between enumeration
            # and reading its counters; skip it rather than fail the report.
        }
    }

    if ($sampleRows.Count -eq 0) {
        Write-Warning 'No Altus processes found. Start both Altus applications first.'
    } else {
        foreach ($group in ($sampleRows | Group-Object Variant)) {
            $ws = ($group.Group | Measure-Object WorkingSetMB -Sum).Sum
            $private = ($group.Group | Measure-Object PrivateMemoryMB -Sum).Sum
            $summaryRows.Add([pscustomobject]@{
                Sample          = $sample
                Variant         = $group.Name
                ProcessCount    = $group.Count
                WorkingSetMB    = [math]::Round($ws, 1)
                PrivateMemoryMB = [math]::Round($private, 1)
            })
        }
        Write-Host ('Sample {0}/{1}' -f $sample, $Samples)
        $summaryRows | Where-Object { $_.Sample -eq $sample } |
            Format-Table -Property Variant, ProcessCount, WorkingSetMB, PrivateMemoryMB -AutoSize |
            Out-String | Write-Host
    }

    if ($sample -lt $Samples) { Start-Sleep -Seconds $IntervalSeconds }
}

if ($allRows.Count -eq 0) { throw 'No Altus processes detected. No report was written.' }

[System.IO.Directory]::CreateDirectory($OutputDirectory) | Out-Null
$suffix = $started.ToString('yyyyMMdd-HHmmss')
$detailsFile = Join-Path $OutputDirectory "altus-process-details-$suffix.csv"
$summaryFile = Join-Path $OutputDirectory "altus-memory-summary-$suffix.csv"
$allRows | Export-Csv -Path $detailsFile -NoTypeInformation -Encoding UTF8
$summaryRows | Export-Csv -Path $summaryFile -NoTypeInformation -Encoding UTF8

Write-Host "Details saved: $detailsFile"
Write-Host "Summary saved: $summaryFile"
Write-Host 'Share only the two CSV files, not the original WhatsApp profile directories.'
Write-Host 'WorkingSetMB is physical memory mapped per process: shared pages may be counted multiple times.'
Write-Host 'PrivateMemoryMB includes committed private memory and may differ from Task Manager Memory.'
