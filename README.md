# IFMIS React Frontend Study

This folder contains a frontend-only `React + TypeScript` starter that turns static IFMIS-style pages into a dynamic route-based UI.

## What is dynamic here

- One route pattern renders many modules: `"/modules/:moduleSlug"`
- Human-readable slugs are used, such as:
  - `/modules/contract-creation`
  - `/modules/invoice-processing`
  - `/modules/payment-order-management`
- The UI is generated from route-linked data in [`src/data/modules.ts`](./src/data/modules.ts)

## Readable file names

- [`src/pages/HomePage.tsx`](./src/pages/HomePage.tsx)
- [`src/pages/ModulePage.tsx`](./src/pages/ModulePage.tsx)
- [`src/components/AppShell.tsx`](./src/components/AppShell.tsx)
- [`src/components/ProcessFlow.tsx`](./src/components/ProcessFlow.tsx)
- [`src/data/modules.ts`](./src/data/modules.ts)

## Study the process

1. `main.tsx` starts the app and wraps it with `BrowserRouter`.
2. `App.tsx` defines the route pattern.
3. `ModulePage.tsx` reads `moduleSlug` from the URL.
4. The slug looks up a module definition from `modules.ts`.
5. Shared components render metrics, process steps, and study notes.

## Why this helps

- Adding a new module is mostly data entry, not a new full page rewrite.
- The UI stays consistent across modules.
- Responsive styles are shared instead of repeated in many HTML files.

## Run locally

```bash
npm install
npm run dev
```
