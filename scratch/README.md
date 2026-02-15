# Scratch

A ticket management system with a tRPC API and React SPA.

## Prerequisites

- Node.js 20+
- npm 10+

## Setup

```bash
npm install
```

## Development

Start both the API server (with hot reload via tsx watch) and the UI dev server (Vite) concurrently:

```bash
npm run dev
```

- API server: http://localhost:3001
- UI dev server: http://localhost:5173

The Vite dev server proxies `/trpc` requests to the API server automatically. Both servers support hot reload — changes to API code or UI code are picked up immediately.

## Production

Build all packages (shared types, API server, UI):

```bash
npm run build
```

Start the production server:

```bash
npm start
```

This starts a single Node.js server on port 3001 that serves both the tRPC API (at `/trpc`) and the built React SPA. All non-API routes serve `index.html` for client-side routing.

## Environment Variables

| Variable      | Default | Description                                      |
| ------------- | ------- | ------------------------------------------------ |
| `PORT`        | `3001`  | Port for the API server                          |
| `TICKETS_DIR` | —       | Absolute path to the `.tickets/` directory. If not set, the server walks parent directories from `cwd` to find it. |

## Project Structure

```
packages/
  shared/   — TypeScript type definitions (compiled with tsc)
  api/      — tRPC API server (compiled with tsc, run with Node.js)
  ui/       — React SPA (bundled with Vite)
```
