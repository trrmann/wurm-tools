# Wurm Tools

A fast, modern, and modular companion suite for **Wurm Online** and **Wurm Unlimited** players. Built with pure **HTML, CSS, JavaScript (ES Modules), Node.js, and Vite**, designed for high performance, zero external framework bloat, and instantaneous static hosting on **Render**.

![Wurm Tools Preview](public/favicon.svg)

---

## Features (Starter Suite)

- 🏰 **Deed & Upkeep Calculator**:
  - Interactive dimensions planner ($W \times H$ tiles + perimeter buffer).
  - Monthly and yearly upkeep breakdown into Gold, Silver, Copper, and Iron.
  - Spirit guard upkeep scaling and initial founding fees.
  - Deed bank runway estimator (predicts exact days/months of upkeep remaining).
  - Presets: Homestead (5x5), Farmstead (11x11), Village (21x21), Township (31x31), Fortress (51x51).

- ⏳ **Action & Prayer Timers**:
  - 20-minute Prayer cooldown timer (favor gain cycles).
  - 30-minute Meditation path cooldown timer.
  - 3-hour Path ability countdown timer.
  - Custom countdown timer with preset shortcuts.
  - Synthesized audio chime (Web Audio API — works fully offline, no external audio files required).
  - Desktop browser notifications with permission toggle.

- 🧭 **Coordinate Distance & Travel Estimator**:
  - Calculates Euclidean tile distance and real-world metrics (1 tile = 4 meters).
  - Calculates 16-point compass heading and degrees.
  - Travel time estimation across: Walking on foot, Running on road, Ridden horse, Fast mount, Cart/Wagon, and Sailing ship.
  - Local waypoint manager: Save, recall, and manage custom coordinates directly in `localStorage`.

- 📝 **Settlement & Player Notes**:
  - Track deed building projects, mining veins, crafting supplies, and training goals.
  - Filter by category with priority badges and completion checkboxes.
  - One-click JSON backup export.

- 📜 **Extensive Concept Roadmap**:
  - Full architectural design and feature matrix documented in [`CONCEPTS.md`](./CONCEPTS.md).

---

## Tech Stack

- **Runtime & Tooling**: Node.js, Vite
- **Frontend**: Vanilla JavaScript (ES Modules), Semantic HTML5, Modern CSS (CSS Grid, Flexbox, CSS Variables)
- **Persistence**: Browser `localStorage` (client-side, privacy-respecting, zero tracking)
- **Version Control**: Git & GitHub (`trrmann/wurm-tools`)
- **Hosting**: Render (Static Site)

---

## Quick Start (Local Development)

### 1. Prerequisites

Ensure you have Node.js (v18 or newer) installed:

```bash
node -v
npm -v
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The site will be available at `http://localhost:3000`.

### 4. Code Quality & Formatting

```bash
# Check formatting with Prettier
npm run format:check

# Auto-format files with Prettier
npm run format

# Run ESLint
npm run lint

# Auto-fix lint issues
npm run lint:fix
```

### 5. Build for Production

```bash
npm run build
```

The compiled, optimized production files will be placed into the `dist/` directory.

### 6. Preview Production Build

```bash
npm run preview
```

---

## Automated Deployment Scripts

Automated deployment scripts with safe stops are located in [`scripts/`](./scripts) for both **PowerShell (Windows)** and **Bash (Fedora / Linux)**.

### Automatic PATH Integration in VS Code

The workspace is configured in `.vscode/settings.json` so the `scripts/` folder is automatically prepended to the system `PATH` in all integrated terminals:

- **Windows (PowerShell / Command Prompt)**: `${workspaceFolder}\scripts`
- **Linux (Fedora / Ubuntu Bash)**: `${workspaceFolder}/scripts`

This means inside any new VS Code terminal, you can directly run:

```bash
# In Bash (Fedora / Linux)
deploy
# or
deploy.sh -m "feat: add crop harvest calendar"

# In PowerShell / Windows Terminal
deploy
# or
deploy.ps1 -CommitMessage "feat: add crop harvest calendar"
```

### Deployment Pipeline Steps & Safe Stops

Both scripts run the exact same verification pipeline and **safely halt immediately** if any step encounters an error or fails validation:

1. **Dependency Verification**: Ensures `node_modules` are installed.
2. **Prettier Code Formatting**: Runs `npm run format:check` (or optional `--auto-format` / `-AutoFormat`).
3. **ESLint Quality Check**: Runs `npm run lint`.
4. **Vitest Unit Test Suite**: Runs `npm test` (or optional `--skip-tests` / `-SkipTests`).
5. **Vite Production Build**: Runs `npm run build`.
6. **Git Status & Commit**: Checks repository state, stages files, and commits with co-authorship.
7. **Push to GitHub (`origin main`)**: Pushes to `main`, which triggers automatic CI/CD and **Render** static site redeployment.
8. **Summary & Live Monitoring**: Reports GitHub Actions CI status, Render live site link, and W3C validation URLs.

---

## Deploying to Render

This repository is pre-configured for **Render Static Sites** via [`render.yaml`](./render.yaml) and manual deployment.

### Method 1: Render Blueprint (Zero-Config)

1. Push this repository to GitHub:
   ```bash
   git push -u origin main
   ```
2. In the [Render Dashboard](https://dashboard.render.com/), click **New +** > **Blueprint**.
3. Select your `wurm-tools` GitHub repository.
4. Render will automatically detect [`render.yaml`](./render.yaml), build with `npm install && npm run build`, and publish `dist/`.

### Method 2: Manual Static Site on Render

1. Go to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** > **Static Site**.
3. Connect your GitHub repository (`wurm-tools`).
4. Configure the build parameters:
   - **Name**: `wurm-tools`
   - **Branch**: `main`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
5. Click **Create Static Site**.
6. Render will automatically build and publish your site with a free SSL certificate on `https://wurm-tools.onrender.com` (or your custom domain).

---

## Project Structure

```text
WurmTools/
├── .github/
│   └── workflows/ci.yml     # Automated CI (Prettier, ESLint, Vitest, Build)
├── .vscode/
│   └── settings.json        # Integrated terminal PATH configuration
├── documentation/
│   ├── CONCEPTS.md          # Comprehensive concept roadmap for future tools
│   ├── render.md            # Render deployment dashboard links
│   └── validation.md        # W3C HTML & CSS live validation links
├── scripts/
│   ├── deploy.ps1           # Deployment automation for Windows PowerShell
│   ├── deploy.sh            # Deployment automation for Bash (Fedora / Linux)
│   ├── deploy.cmd           # Windows Command Prompt / terminal wrapper
│   └── deploy               # Linux executable wrapper
├── tests/
│   └── calculators.test.js  # Vitest unit test suite
├── index.html               # Main application HTML entry point
├── package.json             # NPM project manifest & scripts
├── render.yaml              # Render Blueprint deployment configuration
├── vite.config.js           # Vite build configuration
├── public/
│   └── favicon.svg          # Application vector icon
└── src/
    ├── main.js              # Application router, toast, search & modal logic
    ├── style.css            # Dark fantasy responsive styling & components
    └── tools/
        ├── registry.js      # Central registry discovering all active tools
        ├── deed-calculator/ # Deed cost, upkeep & runway calculator
        ├── action-timers/   # Audio/visual prayer & action timers
        ├── distance-calc/   # Coordinate distance & travel estimator
        └── player-notes/    # Player project log & persistent notebook
```

---

## How to Add New Tools

The architecture is built for easy expansion:

1. Create a folder in `src/tools/<your-tool-name>/`.
2. Add an `index.js` exporting:
   - `toolMetadata`: `{ id, name, category, icon, description }`
   - `mount(container)`: DOM rendering and event listeners.
   - `unmount()`: Cleanup function.
3. Import and add your tool to `TOOLS_LIST` in `src/tools/registry.js`.
4. Your tool is immediately integrated into the sidebar navigation and search bar!

---

## License

MIT License. Designed with passion for the Wurm Online and Wurm Unlimited community.
