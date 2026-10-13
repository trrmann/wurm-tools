<#
.SYNOPSIS
    Semantic version management script for Wurm Tools (Windows PowerShell).
.DESCRIPTION
    Increments project version by major, minor, or point/patch increase,
    or displays the current project version from package.json.
.PARAMETER Major
    Bump major version (e.g. 1.0.0 -> 2.0.0).
.PARAMETER Minor
    Bump minor version (e.g. 1.0.0 -> 1.1.0).
.PARAMETER Patch
    Bump patch/point version (e.g. 1.0.0 -> 1.0.1).
.PARAMETER Point
    Alias for -Patch.
.PARAMETER Get
    Output current version.
.EXAMPLE
    .\scripts\version.ps1 -Point
    .\scripts\version.ps1 -Minor
    .\scripts\version.ps1 -Major
    .\scripts\version.ps1 -Get
#>

[CmdletBinding()]
param(
    [switch]$Major,
    [switch]$Minor,
    [switch]$Patch,
    [switch]$Point,
    [switch]$Get,
    [string]$Type = ""
)

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectRoot

$target = $Type
if ($Major) { $target = "major" }
elseif ($Minor) { $target = "minor" }
elseif ($Patch -or $Point) { $target = "patch" }
elseif ($Get) { $target = "--get" }

if (-not $target) {
    $target = "--get"
}

node "$PSScriptRoot\version.js" $target
