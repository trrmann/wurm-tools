<#
.SYNOPSIS
    Automated deployment script for Wurm Tools (Windows PowerShell).
.DESCRIPTION
    Runs code verification (Prettier formatting, ESLint linting, Vitest unit tests,
    and Vite build for the targeted environment), verifies git status, commits pending
    changes, and pushes to GitHub to trigger Render static site deployment.
    Requires exactly one environment target switch: -dev, -preview, or -prod.
    For -prod, if uncommitted changes exist, a message argument (-m / -CommitMessage) is strictly required.
.PARAMETER Dev
    Target the development environment (mode: development, target branch: dev).
.PARAMETER Preview
    Target the preview/staging environment (mode: preview, target branch: preview).
.PARAMETER Prod
    Target the production environment (mode: production, target branch: main).
.PARAMETER CommitMessage
    Commit message for uncommitted changes. Strictly required for -prod when changes exist.
.PARAMETER AutoFormat
    Automatically fix Prettier formatting before checking.
.PARAMETER SkipTests
    Skip the unit test step (not recommended for production deployments).
.PARAMETER NoPush
    Verify and build without pushing to GitHub.
.EXAMPLE
    deploy -dev
    deploy -preview -m "test: preview deed timer updates"
    deploy -prod -m "feat: release deed upkeep calculator v1.1"
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
    Write-Host "Usage: deploy {-dev | -preview | -prod} [-m <message>] [-AutoFormat] [-SkipTests] [-NoPush]`n" -ForegroundColor Yellow
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
        $TargetBranch = "dev"
        $ViteMode = "development"
    }
    "preview" {
        $DisplayName = "Preview"
        $TargetBranch = "preview"
        $ViteMode = "preview"
    }
    "prod" {
        $DisplayName = "Production"
        $TargetBranch = "main"
        $ViteMode = "production"
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
        Write-Host "Working tree clean; no uncommitted changes for production." -ForegroundColor DarkGray
    }
} else {
    # dev or preview
    if ($statusOutput) {
        Write-Host "[INFO] Uncommitted changes detected for $DisplayName deployment:" -ForegroundColor Yellow
        git status --short

        if (-not [string]::IsNullOrWhiteSpace($CommitMessage)) {
            Invoke-SafeStep "Stage Changes" {
                git add -A
            }

            $trailer = "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
            $fullCommitMsg = "$CommitMessage`n`n$trailer"

            Invoke-SafeStep "Commit Changes ($DisplayName)" {
                git commit -m $fullCommitMsg
            }
        } else {
            if ([Environment]::UserInteractive) {
                $userMsg = Read-Host "`nEnter commit message for $TargetEnv changes (or press Enter to proceed without committing)"
                if (-not [string]::IsNullOrWhiteSpace($userMsg)) {
                    Invoke-SafeStep "Stage Changes" {
                        git add -A
                    }
                    $trailer = "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
                    $fullCommitMsg = "$userMsg`n`n$trailer"
                    Invoke-SafeStep "Commit Changes ($DisplayName)" {
                        git commit -m $fullCommitMsg
                    }
                } else {
                    Write-Host "[WARN] Proceeding without committing changes for $DisplayName environment.`n" -ForegroundColor Yellow
                }
            } else {
                Write-Host "[WARN] Non-interactive session: proceeding without committing changes for $DisplayName environment.`n" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "Working tree clean; no uncommitted changes." -ForegroundColor DarkGray
    }
}

# 6. Push to GitHub
if (-not $NoPush) {
    if ($TargetEnv -eq "prod") {
        $CurrentBranch = (git rev-parse --abbrev-ref HEAD).Trim()
        if ($CurrentBranch -ne "main") {
            Write-Host "[WARN] Current branch is '$CurrentBranch' (not 'main')." -ForegroundColor Yellow
            $confirm = Read-Host "Do you want to deploy branch '$CurrentBranch' to origin main? (y/N)"
            if ($confirm -ne 'y' -and $confirm -ne 'Y') {
                Write-Host "[ABORT] Production deployment cancelled by user." -ForegroundColor Yellow
                exit 0
            }
        }

        Invoke-SafeStep "Push to GitHub (origin main)" {
            git push origin HEAD:main
        }
    } else {
        $remainingChanges = (git status --porcelain)
        if ($remainingChanges) {
            Write-Host "[WARN] Uncommitted changes remain in working directory. Skipping push to GitHub for $DisplayName.`n" -ForegroundColor Yellow
        } else {
            Invoke-SafeStep "Push to GitHub (origin $TargetBranch)" {
                git push origin HEAD:$TargetBranch
            }
        }
    }
} else {
    Write-Host "[INFO] Skipping push to GitHub (-NoPush flag set).`n" -ForegroundColor Yellow
}

# 7. Post-Deployment Summary
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  [SUCCESS] $DisplayName Deployment Verification Completed!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Environment : $DisplayName ($TargetEnv)" -ForegroundColor White
Write-Host "Target      : origin $TargetBranch" -ForegroundColor White
Write-Host "GitHub Repo : https://github.com/trrmann/wurm-tools" -ForegroundColor White

if ($TargetEnv -eq "prod") {
    Write-Host "Render Live : https://wurm-tools.onrender.com" -ForegroundColor White
    Write-Host "W3C HTML    : https://validator.w3.org/nu/?doc=https%3A%2F%2Fwurm-tools.onrender.com%2F" -ForegroundColor White
    Write-Host "W3C CSS     : https://jigsaw.w3.org/css-validator/validator?uri=https%3A%2F%2Fwurm-tools.onrender.com%2F" -ForegroundColor White

    if (Get-Command gh -ErrorAction SilentlyContinue) {
        Write-Host "`nMonitoring GitHub Actions CI..." -ForegroundColor Cyan
        Start-Sleep -Seconds 3
        gh run list --repo trrmann/wurm-tools --limit 2
    }
} elseif ($TargetEnv -eq "preview") {
    Write-Host "`nTip: Run 'npm run preview' to launch local preview server on http://localhost:4173" -ForegroundColor DarkCyan
} else {
    Write-Host "`nTip: Run 'npm run dev' to launch local development server on http://localhost:3000" -ForegroundColor DarkCyan
}

Write-Host "`nDeployment workflow finished.`n" -ForegroundColor Green

