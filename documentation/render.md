# Render deployment

[Dashboard](https://dashboard.render.com/static/srv-db72b6ek1f9s73c0a4c0) |
[Live site](https://wurm-tools.onrender.com/) |
[Deployment workflow](../README.md#automated-deployment-scripts)

The [blueprint](../render.yaml) pins Node 24.22.1 LTS and bootstraps pnpm 12.15.0.
Existing manually configured Render services must also set `NODE_VERSION=24.22.1` and use:

```bash
npm install --global pnpm@12.15.0 && pnpm install --frozen-lockfile && pnpm run build
```

npm is only the online bootstrap for pnpm, not the project dependency manager.
Publish `dist`. Production deployment and live verification remain explicit approval gates.
This change does not modify an existing Render service remotely or deploy the application.

SQLite remains in the local helper, not the static Render filesystem.
The [PostgreSQL/pgAdmin preparation](database-development.md) does not provision a hosted
database, put credentials into the static frontend, or migrate existing data.
