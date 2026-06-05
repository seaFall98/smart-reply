param(
    [ValidateSet("user", "project", "local")]
    [string]$Scope = "user",
    [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Assert-ExternalCommand {
    param([string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command is unavailable: $Name"
    }
}

function Assert-LastExitCode {
    param([string]$Description)

    if ($LASTEXITCODE -ne 0) {
        throw "$Description failed with exit code $LASTEXITCODE."
    }
}

function Read-Version {
    param(
        [string]$Text,
        [string]$Name
    )

    if ($Text -notmatch "(\d+)\.(\d+)\.(\d+)") {
        throw "Unable to parse $Name version from: $Text"
    }
    return [version]"$($Matches[1]).$($Matches[2]).$($Matches[3])"
}

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
Assert-ExternalCommand "node"
Assert-ExternalCommand "claude"

$nodeVersion = Read-Version ((& node --version | Out-String).Trim()) "Node.js"
Assert-LastExitCode "Node.js version check"
if ($nodeVersion -lt [version]"20.0.0") {
    throw "Smart Reply requires Node.js 20 or newer. Found $nodeVersion."
}

$claudeVersion = Read-Version ((& claude --version | Out-String).Trim()) "Claude Code"
Assert-LastExitCode "Claude Code version check"
if ($claudeVersion -lt [version]"2.1.163") {
    throw "Smart Reply requires Claude Code 2.1.163 or newer. Found $claudeVersion."
}

& claude plugin validate --strict $repoRoot
Assert-LastExitCode "Claude Code plugin validation"

if ($WhatIf) {
    Write-Host "Would run: claude plugin marketplace add `"$repoRoot`" --scope $Scope"
    Write-Host "Would run: claude plugin install smart-reply@smart-reply-marketplace --scope $Scope"
    exit 0
}

& claude plugin marketplace add $repoRoot --scope $Scope
Assert-LastExitCode "Claude Code marketplace registration"

& claude plugin install smart-reply@smart-reply-marketplace --scope $Scope
Assert-LastExitCode "Smart Reply plugin installation"

Write-Host "Smart Reply installed for Claude Code scope '$Scope'."
