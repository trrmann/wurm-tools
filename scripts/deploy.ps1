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
.PARAMETER NoAutoFormat
    Skip automatic Prettier formatting (Prettier auto-formatting is enabled by default).
.PARAMETER SkipTests
    Rejected: deployment verification requires the complete test suite.
.PARAMETER NoLaunch
    Skip opening the site in Google Chrome (Chrome launch is enabled by default for -dev, -preview, and -prod).
.PARAMETER NoOpen
    Alias for -NoLaunch.
.PARAMETER NoPush
    Verify and build without pushing to GitHub.
.PARAMETER Major
    Advance major version before deployment commit.
.PARAMETER Minor
    Advance minor version before deployment commit.
.PARAMETER Patch
    Advance patch/point version before deployment commit.
.PARAMETER Point
    Alias for -Patch.
.PARAMETER NoVersionInCommit
    Override attaching the project version to the git commit message.
.PARAMETER w3c
    Rerun full W3C HTML/CSS validation against the live production site, even when no push is needed.
.PARAMETER w3c-HTML
    Compatibility flag; full HTML + CSS validation still runs and cannot be narrowed.
.PARAMETER w3c-CSS
    Compatibility flag; full HTML + CSS validation still runs and cannot be narrowed.
.PARAMETER Chrome
    Compatibility flag; full Chrome testing is mandatory for preview and production, not development.
.PARAMETER Lighthouse
    Rejected: individual-suite flags cannot narrow deployment verification.
.PARAMETER CssOverview
    Rejected: individual-suite flags cannot narrow deployment verification.
.PARAMETER Memory
    Rejected: individual-suite flags cannot narrow deployment verification.
.EXAMPLE
    deploy -dev
    deploy -preview
    deploy -prod -m "feat: release deed upkeep calculator v1.1"
    deploy -prod
    deploy -prod -w3c
    deploy -prod -w3c-HTML
    deploy -prod -w3c-CSS
    deploy -prod -Chrome
#>

[CmdletBinding()]
param(
    [switch]$Dev,
    [switch]$Preview,
    [switch]$Prod,

    [Alias("m", "Message")]
    [string]$CommitMessage = "",

    [switch]$NoAutoFormat,
    [switch]$SkipTests,
    [switch]$NoLaunch,
    [switch]$NoOpen, # Alias for NoLaunch
    [switch]$NoPush,

    # Versioning switches
    [switch]$Major,
    [switch]$Minor,
    [switch]$Patch,
    [switch]$Point,
    [Alias("NoVersion", "NoVersionPrefix")]
    [switch]$NoVersionInCommit,

    # W3C Validation switches
    [switch]$w3c,
    [switch]${w3c-HTML},
    [switch]${w3c-CSS},

    # Chrome Automated Testing switches
    [switch]$Chrome,
    [switch]$Lighthouse,
    [switch]$CssOverview,
    [switch]$Memory,

    # Seconds to wait after a push for Render to build and publish (default 5 minutes, 0 = no wait)
    [ValidateRange(0, 86400)]
    [int]$RenderWait = 300
)

$ErrorActionPreference = 'Stop'

$DeployLog = Join-Path (Split-Path $PSScriptRoot -Parent) ".deploy.log"
Start-Transcript -Path $DeployLog -Force | Out-Host
try {
& {
Write-Host "[INFO] Deployment log (overwritten each run): $DeployLog"

if ($SkipTests -or $Lighthouse -or $CssOverview -or $Memory) {
    Write-Host "[FAIL] Deployment verification requires all tests. Skip-tests and individual Chrome-suite flags are not supported; use standalone npm test commands for focused checks." -ForegroundColor Red
    exit 2
}
$W3CRequested = $w3c -or ${w3c-HTML} -or ${w3c-CSS}

# Validate environment target switches: exactly 1 required
$targetList = @()
if ($Dev) { $targetList += "dev" }
if ($Preview) { $targetList += "preview" }
if ($Prod) { $targetList += "prod" }

if ($targetList.Count -eq 0) {
    Write-Host "`n[FAIL] Missing environment target switch. Exactly one target is required: -dev, -preview, or -prod." -ForegroundColor Red
    Write-Host "Usage: deploy {-dev | -preview | -prod} [-m <message>] [-NoAutoFormat] [-NoOpen] [-NoPush]`n" -ForegroundColor Yellow
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
    & $Action *>&1 | Out-Host
    $stepExit = $LASTEXITCODE

    if ($stepExit -ne 0) {
        Write-Host "`n[FAIL] Step '$Name' failed with exit code $stepExit." -ForegroundColor Red
        Write-Host "[ABORT] Deployment aborted safely. Please fix the issue and retry." -ForegroundColor Red
        exit $stepExit
    }
    Write-Host "[PASS] $Name completed successfully.`n" -ForegroundColor Green
}

$script:PostDeploymentFailures = [System.Collections.Generic.List[string]]::new()
function Invoke-PostDeploymentStep {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name,
        [Parameter(Mandatory = $true)]
        [scriptblock]$Action
    )

    Write-Host ">>> [$Name] Starting..." -ForegroundColor Cyan
    try {
        & $Action *>&1 | Out-Host
        $stepExit = $LASTEXITCODE
    } catch {
        $stepExit = 1
        Write-Host $_ -ForegroundColor Red
    }
    if ($stepExit -ne 0) {
        Write-Host "[FAIL] Step '$Name' failed with exit code $stepExit; continuing remaining live checks.`n" -ForegroundColor Red
        $script:PostDeploymentFailures.Add("$Name (status $stepExit)")
        return $false
    }
    Write-Host "[PASS] $Name completed successfully.`n" -ForegroundColor Green
    return $true
}

function Get-ChromePath {
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

    return $chromePath
}

function Open-RenderSiteInChrome {
    param(
        [string]$Url = "https://wurm-tools.onrender.com"
    )

    Write-Host ">>> Opening $Url in Google Chrome..." -ForegroundColor Cyan

    $chromePath = Get-ChromePath

    if ($chromePath) {
        Start-Process $chromePath -ArgumentList $Url
        Write-Host "[PASS] Opened $Url in Google Chrome.`n" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Google Chrome not found. Opening $Url in default browser...`n" -ForegroundColor Yellow
        Start-Process $Url
        Write-Host "[PASS] Opened $Url in default browser.`n" -ForegroundColor Green
    }
}

function Launch-WhenReady {
    param(
        [string]$Url,
        [int]$TimeoutSeconds = 30
    )

    Write-Host ">>> Forking background monitor (polling $Url for HTTP 200 within ${TimeoutSeconds}s)..." -ForegroundColor Cyan
    $timeoutMs = $TimeoutSeconds * 1000
    Start-Process node -ArgumentList "`"$PSScriptRoot\launch-when-ready.js`"", "`"$Url`"", "$timeoutMs" -WindowStyle Hidden
}

# 0. Check dependencies
if (-not (Test-Path "node_modules")) {
    Invoke-SafeStep "Install Dependencies" {
        npm install
    }
}

# Start the local helper before verification so failed gates do not prevent dev startup.
Write-Host ">>> [Local Helper] Ensuring Wurm local helper is running..." -ForegroundColor Cyan
node "$PSScriptRoot\wurm-local.js"
if ($LASTEXITCODE -ne 0) {
    Write-Host "[WARN] Local helper failed to start; continuing without it." -ForegroundColor Yellow
}
Write-Host ""

# Clean up legacy .vite cache in node_modules if present to avoid OneDrive lock issues
if (Test-Path "node_modules\.vite") {
    try {
        Remove-Item -Recurse -Force "node_modules\.vite" -ErrorAction SilentlyContinue
    } catch {}
}

# 1. Formatting (AutoFormat is default unless -NoAutoFormat is specified)
function Test-Target {
    if (-not $NoAutoFormat) {
        Invoke-SafeStep "Auto-Format Code (Prettier)" {
            npm run format
        }
    } else {
        Write-Host "[INFO] Skipping auto-format (-NoAutoFormat flag specified)." -ForegroundColor DarkGray
    }
    Invoke-SafeStep "Prettier Code Style Check" {
        npm run format:check
    }
    Invoke-SafeStep "ESLint Code Quality Check" {
        npm run lint
    }
    Invoke-SafeStep "Vitest Unit Test Suite" {
        npm test
    }
    Invoke-SafeStep "Vite Build ($DisplayName / mode: $ViteMode)" {
        npm run build -- --mode $ViteMode
    }
    Invoke-SafeStep "Local HTML & CSS Validation (All Pages)" {
        npm run test:standards
    }
    if ($TargetEnv -eq "dev") {
        $script:ChromeResult = "NOT REQUIRED (development target)"
        Write-Host "[INFO] Development verification does not run Chrome audits." -ForegroundColor Cyan
    } else {
        Invoke-SafeStep "All Chrome Tests against local preview (All Pages)" {
            node "$PSScriptRoot\run-with-server.js" preview 4173 -- node "$PSScriptRoot\test-chrome.js" --all --url "http://localhost:4173"
        }
        $script:ChromeResult = "PASSED (all suites, all pages, local preview)"
    }
}

Test-Target

# 5. Git Status and Verification
Write-Host ">>> [Git Status Check] Verifying git repository state..." -ForegroundColor Cyan

$statusOutput = (git status --porcelain)
$hasPushed = $false

if ($TargetEnv -eq "prod") {
    # Check if a version bump was requested
    if ($Major -or $Minor -or ($Patch -or $Point)) {
        $bumpType = if ($Major) { "major" } elseif ($Minor) { "minor" } else { "patch" }
        Invoke-SafeStep "Advance Project Version ($bumpType)" {
            node "$PSScriptRoot\version.js" $bumpType
        }
        # Refresh status output since package.json was updated
        $statusOutput = (git status --porcelain)
    }

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

        # Resolve current version to attach to commit message automatically
        $currentVersion = ""
        try {
            $currentVersion = (node "$PSScriptRoot\version.js" --get).Trim()
        } catch {}

        $processedMsg = $CommitMessage
        if (-not $NoVersionInCommit -and $currentVersion) {
            if ($processedMsg -notmatch "^\[?v?\d+\.\d+\.\d+") {
                $processedMsg = "[v$currentVersion] $processedMsg"
                Write-Host "[INFO] Attached project version v$currentVersion to commit message." -ForegroundColor Cyan
            }
        }

        $trailer = "Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>"
        $fullCommitMsg = "$processedMsg`n`n$trailer"

        Invoke-SafeStep "Commit Changes (Production)" {
            git commit -m $fullCommitMsg
        }
    } else {
        Write-Host "Working tree clean; no uncommitted changes." -ForegroundColor DarkGray
    }

    # Check whether there is anything to push to origin main
    git fetch origin main --quiet 2>$null

    # If origin/main has commits this branch lacks (e.g. a merged PR), a push would be rejected
    # as non-fast-forward. Rebase onto origin/main first; abort cleanly on conflicts.
    $behindCount = 0
    $behindOutput = (git rev-list --count HEAD..origin/main 2>$null)
    if ($behindOutput) { $behindCount = [int]"$behindOutput".Trim() }
    if ($behindCount -gt 0 -and -not $NoPush) {
        Write-Host "[INFO] Branch is $behindCount commit(s) behind origin/main; rebasing before push." -ForegroundColor Yellow
        git rebase origin/main
        if ($LASTEXITCODE -ne 0) {
            git rebase --abort 2>$null
            Write-Host "[FAIL] Rebase onto origin/main hit conflicts and was aborted. Resolve manually, then re-run." -ForegroundColor Red
            exit 1
        }
        # A rebase changes the source tree; the pushed code must pass the same full gate.
        Test-Target
    }

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

# Wait for Render to pull the new commit from GitHub and publish it before any live-site testing
if ($TargetEnv -eq "prod" -and $hasPushed -and $RenderWait -gt 0) {
    Write-Host ">>> Waiting $RenderWait seconds for Render to build and publish the pushed commit (override with -RenderWait <seconds>)..." -ForegroundColor Cyan
    $waitEnd = (Get-Date).AddSeconds($RenderWait)
    while ((Get-Date) -lt $waitEnd) {
        $left = [int][math]::Ceiling(($waitEnd - (Get-Date)).TotalSeconds)
        Write-Progress -Activity "Waiting for Render deployment" -Status "$left seconds remaining" -PercentComplete ([math]::Max(0, [math]::Min(100, 100 * ($RenderWait - $left) / $RenderWait)))
        Start-Sleep -Seconds ([math]::Min(5, [math]::Max(1, $left)))
    }
    Write-Progress -Activity "Waiting for Render deployment" -Completed
    Write-Host "[INFO] Render wait complete.`n" -ForegroundColor Cyan
}

# 6. W3C Standards Validation Suite
$W3cResult = "NOT RUN (no production deployment)"
if ($TargetEnv -eq "prod" -and ($hasPushed -or $W3CRequested)) {
    Write-Host ">>> [W3C Standards Check] Testing site pages against official W3C validators..." -ForegroundColor Cyan
    $w3cStep = if ($hasPushed) {
        "W3C Full Validation Suite (HTML5 & CSS across All Pages)"
    } else {
        "W3C Full Validation Suite (Explicit Live Recheck)"
    }
    if (Invoke-PostDeploymentStep $w3cStep {
        npm run test:w3c
    }) {
        $W3cResult = "PASSED (HTML and CSS, all live production pages)"
    } else {
        $W3cResult = "FAILED (see W3C output; other live checks will continue)"
    }
} else {
    Write-Host "[INFO] External W3C validation runs only after a production push and deployment wait, or when explicitly rerun with -w3c.`n" -ForegroundColor Cyan
}

# 7. Chrome Automated Testing Suite (Lighthouse, CSS Overview, Memory)
if ($TargetEnv -eq "prod" -and $hasPushed) {
    if (Invoke-PostDeploymentStep "Chrome Tests against Render (https://wurm-tools.onrender.com)" {
        node "$PSScriptRoot\test-chrome.js" --all
    }) {
        $ChromeResult = "PASSED (all suites, all pages, local preview and Render)"
    } else {
        $ChromeResult = "FAILED (see live Chrome audit output)"
    }
}

if ($script:PostDeploymentFailures.Count -gt 0) {
    Write-Host "[FAIL] Post-deployment validation failed:" -ForegroundColor Red
    foreach ($failure in $script:PostDeploymentFailures) {
        Write-Host "  - $failure" -ForegroundColor Red
    }
    Write-Host "[ABORT] At least one live gate failed. The production push already occurred; rerun failed live checks after resolving service issues.`n" -ForegroundColor Red
    exit 1
}

# 8. Post-Deployment Summary & Actions
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "  [SUCCESS] $DisplayName Verification Completed!" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Environment : $DisplayName ($TargetEnv)" -ForegroundColor White
Write-Host "Target Mode : Vite mode '$ViteMode'" -ForegroundColor White
Write-Host "Chrome Tests: $ChromeResult" -ForegroundColor White
Write-Host "W3C Tests   : $W3cResult" -ForegroundColor White

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

    # Open Render live site in Chrome (default unless -NoLaunch / -NoOpen is passed)
    if (-not ($NoLaunch -or $NoOpen)) {
        Open-RenderSiteInChrome "https://wurm-tools.onrender.com"
    } else {
        Write-Host "[INFO] Chrome launch skipped (-NoLaunch flag set).`n" -ForegroundColor DarkGray
    }

    Write-Host "`nDeployment workflow finished.`n" -ForegroundColor Green

} elseif ($TargetEnv -eq "preview") {
    Write-Host "GitHub Push : Skipped (local preview environment)" -ForegroundColor DarkGray
    Write-Host "Local URL   : http://localhost:4173" -ForegroundColor White

    # Fork background monitor to poll HTTP 200 and refork Chrome
    if (-not ($NoLaunch -or $NoOpen)) {
        Launch-WhenReady "http://localhost:4173" -TimeoutSeconds 30
    } else {
        Write-Host "[INFO] Chrome launch skipped (-NoLaunch flag set)." -ForegroundColor DarkGray
    }

    Write-Host "`n>>> Starting Vite preview server (running in foreground; press Ctrl+C to stop)...`n" -ForegroundColor Cyan
    npm run preview

} else {
    Write-Host "GitHub Push : Skipped (local development environment)" -ForegroundColor DarkGray
    Write-Host "Local URL   : http://localhost:3000" -ForegroundColor White

    # Fork background monitor to poll HTTP 200 and refork Chrome
    if (-not ($NoLaunch -or $NoOpen)) {
        Launch-WhenReady "http://localhost:3000" -TimeoutSeconds 30
    } else {
        Write-Host "[INFO] Chrome launch skipped (-NoLaunch flag set)." -ForegroundColor DarkGray
    }

    Write-Host "`n>>> Starting Vite development server (running in foreground; press Ctrl+C to stop)...`n" -ForegroundColor Cyan
    npm run dev
}
} *>&1 | Out-Host
} catch {
    Write-Host "[FAIL] Unhandled deployment error: $_" -ForegroundColor Red
    Write-Host $_.ScriptStackTrace -ForegroundColor Red
    exit 1
} finally {
    Write-Host "[INFO] Deployment log: $DeployLog"
    Stop-Transcript | Out-Host
}
