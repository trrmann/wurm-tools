<#
.SYNOPSIS
    Automated deployment script for Wurm Tools (Windows PowerShell).
.DESCRIPTION
    Runs code verification (Prettier formatting, ESLint linting, Vitest unit tests,
    and Vite build for the targeted environment), verifies git status, commits pending
    changes (for -prod), and pushes to GitHub only for production when there are commits
    to push. Opens the live Render site in Google Chrome upon prod verification/deployment.
    Requires exactly one environment target switch: -dev, -preview, or -prod.
    -dev and -preview are local verification/build environments and never push to GitHub.
    For -prod, if uncommitted changes exist, a message argument (-m / -CommitMessage) is strictly required.
    If there are no new commits to push for -prod, pushing is safely skipped.
.PARAMETER Dev
    Target the local development environment (mode: development). Does not push to GitHub.
.PARAMETER Preview
    Target the local preview environment (mode: preview). Does not push to GitHub.
.PARAMETER Prod
    Target the production environment (mode: production). Deploys to GitHub origin main if changes exist,
    and opens the live Render site in Google Chrome.
.PARAMETER CommitMessage
    Commit message for uncommitted changes. Strictly required for -prod when uncommitted changes exist.
.PARAMETER AutoFormat
    Automatically fix Prettier formatting before checking.
.PARAMETER SkipTests
    Skip the unit test step (not recommended for production deployments).
.PARAMETER NoOpen
    Skip opening the live Render site in Google Chrome on production deployments.
.PARAMETER NoPush
    Verify and build without pushing to GitHub.
.EXAMPLE
    deploy -dev
    deploy -preview
    deploy -prod -m "feat: release deed upkeep calculator v1.1"
    deploy -prod
#>

[CmdletBinding()]
param(
    [switch]$Dev,
    [switch]$Preview,
    [switch]$Prod,

    [Alias("m", "Message")]
    [string]$CommitMessage = "",

    [switch]$AutoFormat,
    [switch]$SkipTests,
    [switch]$NoOpen,
    [switch]$NoPush
)

$ErrorActionPreference = 'Stop'

# Validate environment target switches: exactly 1 required
$targetList = @()
if ($Dev) { $targetList += "dev" }
if ($Preview) { $targetList += "preview" }
if ($Prod) { $targetList += "prod" }

if ($targetList.Count -eq 0) {
    Write-Host "`n[FAIL] Missing environment target switch. Exactly one target is required: -dev, -preview, or -prod." -ForegroundColor Red
    Write-Host "Usage: deploy {-dev | -preview | -prod} [-m <message>] [-AutoFormat] [-SkipTests] [-NoOpen] [-NoPush]`n" -ForegroundColor Yellow
    exit 1
}

if ($targetList.Count -gt 1) {
    $found = ($targetList | ForEach-Object { "-$_" }) -join ", "
    Write-Host "`n[FAIL] Multiple environment target switches specified ($found). Only 1 target switch is allowed." -ForegroundColor Red
    Write-Host "Please specify exactly one environment target: -dev, -preview, or -prod.`n" -ForegroundColor Yellow
    exit 1
}

$TargetEnv = $targetList[0]

switch ($TargetEnv) {
    "dev" {
        $DisplayName = "Development"
        $ViteMode = "development"
        $IsLocalOnly = $true
    }
    "preview" {
        $DisplayName = "Preview"
        $ViteMode = "preview"
        $IsLocalOnly = $true
    }
    "prod" {
        $DisplayName = "Production"
        $ViteMode = "production"
        $IsLocalOnly = $false
    }
}

# Ensure script runs from project root
$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $ProjectRoot

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "         Wurm Tools - Deployment Automation ($DisplayName)" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Environment Target: $TargetEnv ($DisplayName)" -ForegroundColor DarkCyan
Write-Host "Working Directory : $ProjectRoot`n" -ForegroundColor DarkGray

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

function Open-RenderSiteInChrome {
    param(
        [string]$Url = "https://wurm-tools.onrender.com"
    )

    Write-Host ">>> Opening Render site in Google Chrome..." -ForegroundColor Cyan

    $chromePath = $null

    # 1. Check registry App Paths
    try {
        $regVal = (Get-ItemProperty "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe" -ErrorAction SilentlyContinue).'(default)'
        if ($regVal -and (Test-Path $regVal)) {
            $chromePath = $regVal
        }
    } catch {}

    # 2. Check standard installation directories
    if (-not $chromePath) {
        $commonPaths = @(
            "C:\Program Files\Google\Chrome\Application\chrome.exe",
            "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
        )
        foreach ($p in $commonPaths) {
            if (Test-Path $p) {
                $chromePath = $p
                break
            }
        }
    }

    # 3. Check PATH command
    if (-not $chromePath) {
        $cmd = Get-Command "chrome.exe" -ErrorAction SilentlyContinue
        if ($cmd) {
            $chromePath = "chrome.exe"
        }
    }

    if ($chromePath) {
        Start-Process $chromePath -ArgumentList $Url
        Write-Host "[PASS] Opened $Url in Google Chrome.`n" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Google Chrome not found. Opening $Url in default browser...`n" -ForegroundColor Yellow
        Start-Process $Url
        Write-Host "[PASS] Opened $Url in default browser.`n" -ForegroundColor Green
    }
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

# 4. Vite Build for Target Environment
Invoke-SafeStep "Vite Build ($DisplayName / mode: $ViteMode)" {
    npm run build -- --mode $ViteMode
}

# 5. Git Status and Verification
Write-Host ">>> [Git Status Check] Verifying git repository state..." -ForegroundColor Cyan

$statusOutput = (git status --porcelain)
$hasPushed = $false

if ($TargetEnv -eq "prod") {
    if ($statusOutput) {
        Write-Host "[INFO] Uncommitted changes detected for production deployment:" -ForegroundColor Yellow
        git status --short

        if ([string]::IsNullOrWhiteSpace($CommitMessage)) {
            Write-Host "`n[FAIL] Production deployment aborted: Uncommitted changes were detected in the repository, but no commit message argument was provided." -ForegroundColor Red
            Write-Host "For production (-prod), a message argument (-m / -CommitMessage <string>) is required when uncommitted changes exist.`n" -ForegroundColor Red
            Write-Host "Example: deploy -prod -m `"feat: release version 1.1.0`"`n" -ForegroundColor Yellow
            exit 1
        }

        Invoke-SafeStep "Stage Changes" {
            git add -A
        }

        $trailer = "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
        $fullCommitMsg = "$CommitMessage`n`n$trailer"

        Invoke-SafeStep "Commit Changes (Production)" {
            git commit -m $fullCommitMsg
        }
    } else {
        Write-Host "Working tree clean; no uncommitted changes." -ForegroundColor DarkGray
    }

    # Check whether there is anything to push to origin main
    git fetch origin main --quiet 2>$null

    $aheadCount = 0
    try {
        $countOutput = (git rev-list --count origin/main..HEAD 2>$null)
        if ($countOutput) {
            $aheadCount = [int]$countOutput.Trim()
        }
    } catch {
        $aheadCount = 0
    }

    if ($aheadCount -gt 0) {
        if (-not $NoPush) {
            $CurrentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
            if ($CurrentBranch -ne "main") {
                Write-Host "[WARN] Current branch is '$CurrentBranch' (not 'main')." -ForegroundColor Yellow
                $confirm = Read-Host "Do you want to deploy branch '$CurrentBranch' to origin main? (y/N)"
                if ($confirm -ne 'y' -and $confirm -ne 'Y') {
                    Write-Host "[ABORT] Production deployment cancelled by user." -ForegroundColor Yellow
                    exit 0
                }
            }

            Invoke-SafeStep "Push to GitHub (origin main: $aheadCount commit(s) ahead)" {
                git push origin HEAD:main
            }
            $hasPushed = $true
        } else {
            Write-Host "[INFO] Skipping push to GitHub (-NoPush flag set).`n" -ForegroundColor Yellow
        }
    } else {
        Write-Host "[INFO] Local branch is up to date with origin/main. Nothing to push to prod.`n" -ForegroundColor Cyan
    }
} else {
    # dev or preview: strictly local environments, never push to GitHub
    if ($statusOutput) {
        Write-Host "[INFO] Uncommitted changes detected in working directory:" -ForegroundColor Yellow
        git status --short
        Write-Host "[INFO] Environment is local ($DisplayName). Working changes remain local.`n" -ForegroundColor DarkGray
    } else {
        Write-Host "Working tree clean." -ForegroundColor DarkGray
    }
    Write-Host "[INFO] Environment is local $DisplayName (matches 'npm run $TargetEnv'). Skipping push to GitHub.`n" -ForegroundColor Cyan
}

# 6. Post-Deployment Summary & Actions
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  [SUCCESS] $DisplayName Verification Completed!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Environment : $DisplayName ($TargetEnv)" -ForegroundColor White
Write-Host "Target Mode : Vite mode '$ViteMode'" -ForegroundColor White

if ($TargetEnv -eq "prod") {
    if ($hasPushed) {
        Write-Host "GitHub Push : Pushed to origin main" -ForegroundColor White
    } else {
        Write-Host "GitHub Push : Skipped (already up to date, nothing to push)" -ForegroundColor White
    }
    Write-Host "GitHub Repo : https://github.com/trrmann/wurm-tools" -ForegroundColor White
    Write-Host "Render Live : https://wurm-tools.onrender.com" -ForegroundColor White
    Write-Host "W3C HTML    : https://validator.w3.org/nu/?doc=https%3A%2F%2Fwurm-tools.onrender.com%2F" -ForegroundColor White
    Write-Host "W3C CSS     : https://jigsaw.w3.org/css-validator/validator?uri=https%3A%2F%2Fwurm-tools.onrender.com%2F" -ForegroundColor White

    if ($hasPushed -and (Get-Command gh -ErrorAction SilentlyContinue)) {
        Write-Host "`nMonitoring GitHub Actions CI..." -ForegroundColor Cyan
        Start-Sleep -Seconds 3
        gh run list --repo trrmann/wurm-tools --limit 2
    }

    # Open Render live site in Chrome
    if (-not $NoOpen) {
        Open-RenderSiteInChrome "https://wurm-tools.onrender.com"
    }
} elseif ($TargetEnv -eq "preview") {
    Write-Host "GitHub Push : Skipped (local preview environment)" -ForegroundColor DarkGray
    Write-Host "`nTip: Run 'npm run preview' to launch local preview server on http://localhost:4173" -ForegroundColor DarkCyan
} else {
    Write-Host "GitHub Push : Skipped (local development environment)" -ForegroundColor DarkGray
    Write-Host "`nTip: Run 'npm run dev' to launch local development server on http://localhost:3000" -ForegroundColor DarkCyan
}

Write-Host "`nDeployment workflow finished.`n" -ForegroundColor Green


