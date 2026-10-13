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

## 3. Prior Reference Project Links

- [Chow Hall Final Project (WDD 330)](https://validator.w3.org/nu/?doc=https%3A%2F%2Fwdd330-final-project-chow-hall-tracy-mann.onrender.com%2Fcountry%2F%3Fcountry%3DESP%26returnTo%3D%252Frecipe%252F%253Fweek%253Dcurrent%2526recipe%253D53182%2526returnTo%253D%25252Fmealplan%25252F%25253Fweek%25253Dcurrent%252526day%25253DMon)
