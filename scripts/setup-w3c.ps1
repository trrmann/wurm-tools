<#
.SYNOPSIS
    Prepare official local W3C developer tools on Windows.
.DESCRIPTION
    Requires the project's Node/npm dependencies to be installed first.
    Installs Temurin 21 with winget if Java 17+ is missing, then downloads
    missing checksum-verified validator jars. Does not run deployment.
#>
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)

function Test-JavaVersion {
    if (-not (Get-Command java -ErrorAction SilentlyContinue)) { return $false }
    $version = (& java --version 2>&1 | Out-String)
    return $LASTEXITCODE -eq 0 -and $version -match '(?:openjdk|java)\s+(\d+)' -and [int]$Matches[1] -ge 17
}

try {
    if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
        throw "Node.js/npm is required. Install the supported Node LTS and reopen your terminal."
    }
    if (-not (Test-Path "node_modules/vite/package.json")) {
        throw "Restore project dependencies with npm.cmd ci first."
    }
    if (-not (Test-JavaVersion)) {
        if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
            throw "Java 17+ is missing and winget is unavailable. Install a supported Java runtime and reopen your terminal."
        }
        & winget install --id EclipseAdoptium.Temurin.21.JDK --exact --source winget
        if ($LASTEXITCODE -ne 0) { throw "Java installation failed (exit $LASTEXITCODE)." }
        $env:Path = [Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [Environment]::GetEnvironmentVariable("Path", "User")
        if (-not (Test-JavaVersion)) {
            throw "Java 17+ is still not active. Reopen your terminal or correct PATH, then rerun setup."
        }
    }
    & npm.cmd run test:w3c:setup
    if ($LASTEXITCODE -ne 0) { throw "W3C tool setup failed (exit $LASTEXITCODE)." }
} catch {
    Write-Error $_
    exit 1
}
