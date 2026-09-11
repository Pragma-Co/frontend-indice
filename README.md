# API-6 — Frontend

Frontend for the API-6 college project, built with Vue 3 and Vite. It runs directly with Node.js — no Docker required on this side; the API and the databases live in the [backend repository](https://github.com/Pragma-Co/backend-api-6).

## Tech stack

| Technology | Version | Role |
|------------|---------|------|
| [Node.js](https://nodejs.org/) | 20 LTS+ | JavaScript runtime (dev server and build) |
| [Vue](https://vuejs.org/) | 3.5 | UI framework |
| [Vite](https://vite.dev/) | 7.3 | Dev server, build tool and API proxy |
| [@vitejs/plugin-vue](https://github.com/vitejs/vite-plugin-vue) | 6.0 | Vue single-file component support |

The app consumes the Django backend API (separate repository — see the [backend README](https://github.com/Pragma-Co/backend-api-6#readme)) through the Vite dev-server proxy, so the browser never makes a cross-origin request.

## Requirements

**Software**

- Node.js **20.19+** (any Node 20 LTS or newer; Node 22 LTS recommended)
- npm **10+** (bundled with Node.js)
- Git
- The **backend must be running** — see the [backend README](https://github.com/Pragma-Co/backend-api-6#readme)

**Hardware (minimum)**

- Any dual-core machine
- 2 GB RAM
- ~300 MB of free disk space (Node.js dependencies)

Check your versions:

```bash
node --version   # v20.19.0 or newer
npm --version    # 10.0.0 or newer
```

## How the app reaches the backend

The backend does not send CORS headers, so the browser never calls it directly. Every API request goes through the Vite dev-server proxy instead:

```
Browser ── /api/... ──> Vite dev server (5173) ── /... ──> Django backend (VITE_API_PORT)
```

- Requests under `/api` are forwarded to `http://localhost:<VITE_API_PORT>`, with the `/api` prefix stripped.
- The port comes from `VITE_API_PORT` in your `.env`, read **once at startup** — restart `npm run dev` after changing it.
- In application code, always call the API through the `/api` prefix (e.g. `fetch('/api/health/')`) — never through the backend URL directly.

## Installation (step by step)

**1. Clone the repository**

```bash
git clone https://github.com/Pragma-Co/frontend-api-6.git
cd frontend-api-6
```

**2. Create your environment file**

```bash
# Linux/macOS
cp .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env
```

Open `.env` and make sure `VITE_API_PORT` matches the port your backend publishes (the backend default is `8000`).

> **LGPD notice:** unlike the backend, the frontend `.env` holds no secrets — only a port number. It is still ignored by Git, so each team member keeps their machine-specific configuration out of the repository.

**3. Install the dependencies**

```bash
npm install
```

**4. Start the dev server**

```bash
npm run dev
```

**5. Verify it works**

Open <http://localhost:5173/> — the app should load without errors. To confirm the connection to the backend, check the proxied health endpoint at <http://localhost:5173/api/health/>:

```json
{
  "project": "API-6",
  "status": "ok",
  "databases": {
    "postgresql": {"connected": true, "version": "PostgreSQL 17.x"},
    "mongodb": {"connected": true, "version": "8.2.x"}
  }
}
```

## URLs

| URL | Description |
|-----|-------------|
| <http://localhost:5173/> | Application (Vite dev server) |
| <http://localhost:5173/api/health/> | Backend health endpoint, proxied by the Vite dev server |

> These are dev-server URLs. The backend keeps answering on its own port (default 8000) — see the [backend README](https://github.com/Pragma-Co/backend-api-6#readme).

## Useful commands

```bash
# Development
npm run dev                  # start the dev server on http://localhost:5173
npm run dev -- --port 5174   # use another port if 5173 is busy

# Production
npm run build                # build the static bundle into dist/
npm run preview              # serve the dist/ build locally for a final check

# Tests (Vitest + Vue Test Utils)
npm test                     # run the test suite once
npm run test:watch           # re-run tests on file changes

# Maintenance
npm install                  # (re)install dependencies after a git pull
```

## LGPD & security notes

- **No credentials in this repository** — the frontend talks to the API only; database access (and its secrets) stays in the backend.
- **`.env` never reaches Git** — it is listed in `.gitignore`. It holds no secrets, just a port number, but keeping it out of the repository avoids machine-specific configuration leaking into commits.
- **API errors shown in the UI must never expose connection internals** — display only a status and an error name; hosts, usernames, passwords and stack traces stay out of the interface.
- **Team rules:** never commit `.env`; never hardcode backend URLs, ports or credentials in the source; never log or display real personal data during development; collect only the data the application actually needs (data minimization).

## Troubleshooting

| Problem | Fix |
|---------|-----|
| API requests fail / backend unreachable | The backend is not running. Start it — see the [backend README](https://github.com/Pragma-Co/backend-api-6#readme). |
| Backend is running, API requests still fail | `VITE_API_PORT` in `.env` does not match the backend port. Fix the value and restart `npm run dev` — the proxy reads it at startup. |
| `Port 5173 is already in use` | Another dev server is using the port. Stop it, or run `npm run dev -- --port 5174`. |
| `npm install` or `npm run dev` fails with engine/syntax errors | Node.js is too old. Check `node --version` — this project needs 20.19+ (see Requirements). |

## Project structure

See [PROJECT_STRUCTURE.md](PROJECT_STRUCTURE.md) for the full layout and conventions. Summary:

```
frontend/
├── index.html          # HTML shell that loads the Vue app
├── vite.config.js      # Dev server + /api proxy (reads VITE_API_PORT)
├── .env.example        # Environment template — copy to .env
├── package.json        # Dependencies and npm scripts
└── src/
    ├── main.js         # Application bootstrap
    ├── App.vue         # Root component (layout shell)
    ├── api/            # Backend integration (HTTP client, per-domain modules)
    ├── components/     # Reusable components (common/, layout/)
    ├── composables/    # Reusable composition logic
    ├── router/         # Route definitions
    ├── stores/         # Pinia global state
    ├── styles/         # Global CSS and design tokens
    ├── utils/          # Pure helper functions
    ├── views/          # Page-level components
    └── assets/         # Static icons and images
tests/                  # Vitest suites (Given/When/Then), mirroring src/
```

## Document registration flow

`/documentos/upload` (step 1, Upload) redirects to `/documentos/metadados` (step 2, Metadados) once the file is sent.
The metadata form previews the unique code `PROJECT-DISCIPLINE-TYPE-REV` (e.g. `AK-2100-EST-DWG-REV01`); the backend
generates the definitive value on submission. Step 3 (Confirmação) is a separate task.
