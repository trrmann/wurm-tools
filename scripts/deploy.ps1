<#
.SYNOPSIS
    Automated deployment script for Wurm Tools (Windows PowerShell).
.DESCRIPTION
    Runs code verification (Prettier formatting, ESLint linting, Vitest unit tests,
    and Vite production build), verifies git status, commits pending changes (if requested),
    and pushes to GitHub main branch to trigger Render static site deployment.
    Provides safe stops if any step fails.
.PARAMETER CommitMessage
    Optional commit message for any uncommitted changes.
.PARAMETER AutoFormat
    Automatically fix Prettier formatting before checking.
.PARAMETER SkipTests
    Skip the unit test step (not recommended for production deployments).
.EXAMPLE
    deploy.ps1
    deploy.ps1 -CommitMessage "feat: add crop harvest calendar"
    deploy.ps1 -AutoFormat
#>

[CmdletBinding()]
param(
    [Alias("m")]
    [string]$CommitMessage = "",
    [switch]$AutoFormat,
    [switch]$SkipTests
)

$ErrorActionPreference = 'Stop'

# Ensure script runs from project root
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         Wurm Tools - Deployment Automation" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Working Directory: $ProjectRoot`n" -ForegroundColor DarkGray

function Invoke-SafeStep {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Action
    )

    Write-Host ">>> [$Name] Starting..." -ForegroundColor Cyan
    & $Action
    $stepExit = $LASTEXITCODE

    if ($stepExit -ne 0) {
        Write-Host "`n[FAIL] Step '$Name' failed with exit code $stepExit." -ForegroundColor Red
        Write-Host "[ABORT] Deployment aborted safely. Please fix the issue and retry." -ForegroundColor Red
        exit $stepExit
    }

    Write-Host "[PASS] $Name completed successfully.`n" -ForegroundColor Green
}

# 0. Check dependencies
if (-not (Test-Path "node_modules")) {
    Invoke-SafeStep "Install Dependencies" {
        npm install
    }
}

# 1. Formatting
if ($AutoFormat) {
    Invoke-SafeStep "Format Code (Prettier)" {
        npm run format
    }
}

Invoke-SafeStep "Prettier Code Style Check" {
    npm run format:check
}

# 2. Linting
Invoke-SafeStep "ESLint Code Quality Check" {
    npm run lint
}

# 3. Unit Tests
if (-not $SkipTests) {
    Invoke-SafeStep "Vitest Unit Test Suite" {
        npm test
    }
} else {
    Write-Host "[WARN] Skipping unit test suite (-SkipTests flag set).`n" -ForegroundColor Yellow
}

# 4. Production Build
Invoke-SafeStep "Vite Production Build" {
    npm run build
}

# 5. Git Status and Verification
Write-Host ">>> [Git Status Check] Verifying git repository state..." -ForegroundColor Cyan

$CurrentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
if ($CurrentBranch -ne "main") {
    Write-Host "[WARN] Current branch is '$CurrentBranch' (not 'main')." -ForegroundColor Yellow
    $confirm = Read-Host "Do you want to deploy branch '$CurrentBranch' to origin main? (y/N)"
    if ($confirm -ne 'y' -and $confirm -ne 'Y') {
        Write-Host "[ABORT] Deployment cancelled by user." -ForegroundColor Yellow
        exit 0
    }
}

$statusOutput = (git status --porcelain)
if ($statusOutput) {
    Write-Host "Uncommitted changes detected in repository:" -ForegroundColor Yellow
    git status --short

    if (-not $CommitMessage) {
        $CommitMessage = Read-Host "`nEnter commit message for these changes (or press Enter to abort)"
        if (-not $CommitMessage) {
            Write-Host "`n[ABORT] Deployment halted: Cannot push uncommitted changes without a commit message." -ForegroundColor Yellow
            exit 1
        }
    }

    Invoke-SafeStep "Stage Changes" {
        git add -A
    }

    $trailer = "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
    $fullCommitMsg = "$CommitMessage`n`n$trailer"

    Invoke-SafeStep "Commit Changes" {
        git commit -m $fullCommitMsg
    }
} else {
    Write-Host "Working tree clean; no uncommitted changes." -ForegroundColor DarkGray
}

# 6. Push to GitHub
Invoke-SafeStep "Push to GitHub (origin main)" {
    git push origin HEAD:main
}

# 7. Post-Deployment Summary
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  [SUCCESS] Verification and GitHub Push Completed!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "GitHub Repo : https://github.com/trrmann/wurm-tools" -ForegroundColor White
Write-Host "Render Live : https://wurm-tools.onrender.com" -ForegroundColor White
Write-Host "W3C HTML    : https://validator.w3.org/nu/?doc=https%3A%2F%2Fwurm-tools.onrender.com%2F" -ForegroundColor White
Write-Host "W3C CSS     : https://jigsaw.w3.org/css-validator/validator?uri=https%3A%2F%2Fwurm-tools.onrender.com%2F" -ForegroundColor White

if (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Host "`nMonitoring GitHub Actions CI..." -ForegroundColor Cyan
    Start-Sleep -Seconds 3
    gh run list --repo trrmann/wurm-tools --limit 2
}
Write-Host "`nDeployment workflow finished.`n" -ForegroundColor Green
