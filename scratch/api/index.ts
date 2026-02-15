// ---------------------------------------------------------------------------
// tRPC API server — serves API at /trpc and SPA static files in production
// ---------------------------------------------------------------------------

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHTTPHandler } from '@trpc/server/adapters/standalone';
import cors from 'cors';
import { appRouter } from './router.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type { AppRouter } from './router.js';

const PORT = Number(process.env['PORT'] ?? 3001);

// ---------------------------------------------------------------------------
// tRPC handler — mounted at /trpc/
// ---------------------------------------------------------------------------

const trpcHandler = createHTTPHandler({
  router: appRouter,
  basePath: '/trpc/',
  middleware: cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:5174',
    ],
    credentials: true,
  }),
});

// ---------------------------------------------------------------------------
// Static file serving (production only)
// ---------------------------------------------------------------------------

const UI_DIST = path.resolve(__dirname, '../client');
const isProduction = fs.existsSync(UI_DIST) && fs.existsSync(path.join(UI_DIST, 'index.html'));

/** MIME types for common static assets */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.map': 'application/json',
  '.txt': 'text/plain; charset=utf-8',
};

/** Whether a file path looks like a hashed asset (immutable cache) */
function isHashedAsset(filePath: string): boolean {
  // Vite produces files like: assets/index-abc123.js
  return filePath.includes('/assets/');
}

function serveStaticFile(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  filePath: string,
): boolean {
  try {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      return false;
    }
  } catch {
    return false;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] ?? 'application/octet-stream';

  // Cache headers — hashed assets get long-lived cache, HTML gets no-cache
  if (isHashedAsset(filePath)) {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } else if (ext === '.html') {
    res.setHeader('Cache-Control', 'no-cache');
  }

  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
  return true;
}

function serveSpaFallback(_req: http.IncomingMessage, res: http.ServerResponse): void {
  const indexPath = path.join(UI_DIST, 'index.html');
  res.setHeader('Cache-Control', 'no-cache');
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  fs.createReadStream(indexPath).pipe(res);
}

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------

const server = http.createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const pathname = url.pathname;

  // 1. tRPC API routes
  if (pathname.startsWith('/trpc/') || pathname === '/trpc') {
    trpcHandler(req, res);
    return;
  }

  // 2. In production, serve static files and SPA fallback
  if (isProduction) {
    // Try to serve the exact file
    const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    const filePath = path.join(UI_DIST, safePath);

    // Prevent directory traversal
    if (!filePath.startsWith(UI_DIST)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    if (serveStaticFile(req, res, filePath)) {
      return;
    }

    // SPA fallback — all non-API, non-static routes serve index.html
    serveSpaFallback(req, res);
    return;
  }

  // 3. In development without UI dist, return 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
  if (isProduction) {
    console.log(`Serving SPA from ${UI_DIST}`);
  }
});
