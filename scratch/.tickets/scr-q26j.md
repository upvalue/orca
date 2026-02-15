---
id: scr-q26j
status: closed
deps: [scr-bhaz, scr-444d]
links: []
created: 2026-02-15T00:08:32Z
type: task
priority: 1
assignee: Phil
parent: scr-qzpf
tags: [frontend, reviewed]
---
# Scaffold React app with Vite, Tailwind, shadcn/ui, and tRPC client

Initialize the React frontend in packages/ui using Vite + React + TypeScript. Set up:

1. Tailwind CSS v4 with the default configuration
2. shadcn/ui: initialize with 'npx shadcn@latest init', configure components directory
3. React Router with route structure: / (list), /tickets/:id (detail)
4. tRPC client: configure @trpc/client with httpBatchLink pointing to localhost:3001, wrap app with tRPC + TanStack Query providers
5. Create the tRPC client hooks by importing the AppRouter type from packages/api
6. Create a basic app shell layout with a header/nav bar using shadcn/ui components
7. Add polling: configure TanStack Query's refetchInterval for automatic background polling (e.g., every 5 seconds)

The app should start with 'npm run dev' and display a basic shell with routing working.

## Current State

**No work has been done on this ticket.** The `packages/ui` directory contains only a bare-bones TypeScript package (`src/index.ts` logs a console message). There are:

- No Vite configuration (dev script is just `tsc --build --watch`)
- No React dependency installed
- No Tailwind CSS
- No shadcn/ui initialization or components
- No React Router or route definitions
- No tRPC client setup
- No TanStack Query provider or polling configuration
- No app shell or header/nav

Additionally, `packages/api` exports `AppRouter` from `src/router.ts` but does **not** re-export it from `src/index.ts`. The `packages/api/src/index.ts` needs to add `export type { AppRouter } from './router.js';` so that `@scratch/api` resolves the type correctly for the tRPC client.

**All items listed in the description need to be implemented from scratch.**

## Acceptance Criteria

- Vite dev server starts on port 5173 and shows the app shell
- Tailwind CSS is working (utility classes render correctly)
- shadcn/ui is initialized and at least Button component is available
- React Router routes are configured: / and /tickets/:id
- tRPC client successfully connects to the API server on port 3001
- TanStack Query provider is configured with polling (refetchInterval)
- App shell has a header with the app name and basic navigation
- TypeScript compilation succeeds with no errors
- The tRPC AppRouter type is imported from packages/api for end-to-end type safety

## Notes

Scaffolded the full React frontend in packages/ui:

- **Vite + React + TypeScript**: Replaced tsc-based build with Vite dev server (port 5173) and vite build. Added vite.config.ts with @vitejs/plugin-react and path aliases for @/, @scratch/shared, @scratch/api.
- **Tailwind CSS v4**: Installed tailwindcss + @tailwindcss/vite plugin. Created src/index.css with @import "tailwindcss" and CSS custom properties for the design tokens (neutral theme).
- **shadcn/ui**: Manually set up components.json, cn() utility in src/lib/utils.ts, and Button component in src/components/ui/button.tsx with all variants (default, destructive, outline, secondary, ghost, link). Installed clsx, tailwind-merge, class-variance-authority, @radix-ui/react-slot, lucide-react.
- **React Router**: Configured BrowserRouter in main.tsx with routes for / (TicketListPage) and /tickets/:id (TicketDetailPage).
- **tRPC client**: Created src/lib/trpc.ts using createTRPCReact<AppRouter> with httpBatchLink pointing to localhost:3001. App wrapped in trpc.Provider + QueryClientProvider in main.tsx.
- **TanStack Query polling**: QueryClient configured with refetchInterval: 5000 and staleTime: 2000 for automatic background polling.
- **App shell**: Header with "Scratch" branding and "Tickets" nav link using shadcn/ui Button. Main content area with route outlet.
- **packages/api**: Added `export type { AppRouter } from './router.js'` to src/index.ts for end-to-end type safety.
- **Root tsconfig**: Removed packages/ui from project references and exclude list since UI now uses Vite (not tsc --build).
- **Verified**: TypeScript compilation (tsc --noEmit) passes with zero errors, Vite build succeeds, dev server starts on port 5173.
