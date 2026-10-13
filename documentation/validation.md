# Wurm Tools — Code & Standards Validation

This document tracks HTML, CSS, and standards validation for the **Wurm Tools** web application.

---

## 1. Live Validation Links (Render Deployment)

- **Live URL**: [https://wurm-tools.onrender.com/](https://wurm-tools.onrender.com/)

### W3C HTML Validation (Nu HTML Checker)

- **Direct Check**: [https://validator.w3.org/nu/?doc=https%3A%2F%2Fwurm-tools.onrender.com%2F](https://validator.w3.org/nu/?doc=https%3A%2F%2Fwurm-tools.onrender.com%2F)
- **General W3C Validator**: [https://validator.w3.org/](https://validator.w3.org/)

### W3C CSS Validation (Jigsaw CSS Validator)

- **Direct Check**: [https://jigsaw.w3.org/css-validator/validator?uri=https%3A%2F%2Fwurm-tools.onrender.com%2F&profile=css3svg&usermedium=all&warning=1&vextwarning=&lang=en](https://jigsaw.w3.org/css-validator/validator?uri=https%3A%2F%2Fwurm-tools.onrender.com%2F&profile=css3svg&usermedium=all&warning=1&vextwarning=&lang=en)
- **General CSS Validator**: [https://jigsaw.w3.org/css-validator/](https://jigsaw.w3.org/css-validator/)

---

## 2. Automated CI & Code Quality Suite

In addition to manual W3C online validation, the project includes automated CI checks executed on every push and pull request via GitHub Actions:

- **Prettier Code Formatting**: `npm run format:check`
- **ESLint Code Quality**: `npm run lint`
- **Vitest Unit Test Suite**: `npm test`
- **Vite Production Build Verification**: `npm run build`

---

## 3. Environment-Targeted Deployment Quality Gates

The cross-platform deployment automation scripts (`scripts/deploy.ps1` and `scripts/deploy.sh`) enforce targeted quality gates per environment switch:

- **Target Switch Validation**: Requires exactly one target switch from `{-dev; -preview; -prod; }`. Any attempt to combine multiple target switches or omit the target causes an immediate safe abort.
- **Pre-deployment Verification**: Every target executes Prettier formatting, ESLint validation, Vitest test suite, and Vite mode-specific compilation prior to touching Git.
- **Production Git Commit Guard**: When deploying with `-prod`, the script inspects repository status for uncommitted changes (`git status --porcelain`). If changes are detected, a non-empty message argument (`-m` / `-CommitMessage`) is strictly required; deployments without an explicit message argument abort immediately with exit code 1.

---
