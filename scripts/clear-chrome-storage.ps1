<#
.SYNOPSIS
    Clear Chrome localStorage and sessionStorage for Wurm Tools (Windows PowerShell).
.DESCRIPTION
    Uses Chrome DevTools Protocol to clear localStorage and sessionStorage
    for Render production and local development/preview origins.
.PARAMETER Origin
    Optional custom origin URL (e.g. http://localhost:3000).
.EXAMPLE
    .\scripts\clear-chrome-storage.ps1
    .\scripts\clear-chrome-storage.ps1 -Origin "http://localhost:3000"
#>

[CmdletBinding()]
param(
    [string]$Origin = ""
)

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectRoot

if ($Origin) {
    node "$PSScriptRoot\clear-chrome-storage.js" $Origin
} else {
    node "$PSScriptRoot\clear-chrome-storage.js"
}
