param(
    [ValidateSet("user", "project", "local")]
    [string]$Scope = "user",
    [switch]$KeepData,
    [switch]$WhatIf
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command "claude" -ErrorAction SilentlyContinue)) {
    throw "Required command is unavailable: claude"
}

if ($WhatIf) {
    $keepDataText = if ($KeepData) { " --keep-data" } else { "" }
    Write-Host "Would run: claude plugin uninstall smart-reply@smart-reply-marketplace --scope $Scope --yes$keepDataText"
    Write-Host "Would run: claude plugin marketplace remove smart-reply-marketplace --scope $Scope"
    exit 0
}

if ($KeepData) {
    & claude plugin uninstall smart-reply@smart-reply-marketplace --scope $Scope --yes --keep-data
} else {
    & claude plugin uninstall smart-reply@smart-reply-marketplace --scope $Scope --yes
}
if ($LASTEXITCODE -ne 0) {
    throw "Smart Reply plugin uninstall failed with exit code $LASTEXITCODE."
}

& claude plugin marketplace remove smart-reply-marketplace --scope $Scope
if ($LASTEXITCODE -ne 0) {
    throw "Smart Reply marketplace removal failed with exit code $LASTEXITCODE."
}

Write-Host "Smart Reply uninstalled from Claude Code scope '$Scope'."
