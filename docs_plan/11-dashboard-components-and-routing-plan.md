# Dashboard Components and Routing Execution Plan

This plan covers the dashboard refactor that splits reusable UI into `components/` and moves navigation to `routes/`.

The goal is not a rewrite. The goal is a controlled refactor that:

- reduces repeated inline UI
- makes navigation URL-based
- keeps data fetching in pages/hooks
- keeps presentational components reusable and dumb
- preserves the current dashboard behavior while improving structure

## Working Principles

1. **Extract only real reuse**
   - Do not move one-off UI into `components/` just because it looks clean.
   - Extract pieces that already appear more than once or clearly deserve reuse.

2. **Keep logic out of shared UI**
   - Reusable components should be presentational.
   - Fetching, mapping, filtering, and orchestration stay in pages/hooks.

3. **Route first, then cleanup**
   - Introduce URL routing before removing the old state-based navigation.
   - That keeps the app usable during migration.

4. **Migrate page by page**
   - Do not move every page at once.
   - Each page should continue to work independently while the new shell is introduced.

5. **Verify after every phase**
   - Run diagnostics after each phase.
   - Keep the diff focused and avoid incidental UI churn.

---

## Phase 0 — Audit the Dashboard Shell

### Goal
Identify the repeated UI patterns and decide the route shell structure before extracting code.

### Exact files to touch
- `apps/dashboard/src/App.tsx`
- `apps/dashboard/src/main.tsx`
- `apps/dashboard/src/index.css`
- `apps/dashboard/src/pages/Overview.tsx`
- `apps/dashboard/src/pages/Orders.tsx`
- `apps/dashboard/src/pages/Inventory.tsx`
- `apps/dashboard/src/pages/Chat.tsx`
- `apps/dashboard/src/pages/Cashflow.tsx`
- `apps/dashboard/src/pages/LLMConsole.tsx`
- `apps/dashboard/src/pages/Settings.tsx`
- `apps/dashboard/src/pages/LiveFeed.tsx`
- `apps/dashboard/src/pages/BotOverview.tsx`

### Dependency order
- None

### Tasks
- Identify repeated inline UI blocks such as badges, stat cards, loading overlays, headers, and tables.
- Decide which parts belong in reusable components and which stay page-specific.
- Decide the route structure and which page becomes the default landing route.
- Confirm whether the dashboard should keep a shared shell for all pages.

### Done when
- The reusable UI list is clear.
- The route map is clear.
- The migration can proceed without changing behavior yet.

---

## Phase 1 — Extract Reusable UI Components

### Goal
Move repeated presentational UI into shared dashboard components.

### Exact files to touch
Create these files:
- `apps/dashboard/src/components/ui/StatusBadge.tsx`
- `apps/dashboard/src/components/ui/StatCard.tsx`
- `apps/dashboard/src/components/ui/DataTable.tsx`
- `apps/dashboard/src/components/ui/LoadingState.tsx`
- `apps/dashboard/src/components/ui/EmptyState.tsx`
- `apps/dashboard/src/components/ui/PageHeader.tsx`
- `apps/dashboard/src/components/ui/FilterBar.tsx`
- `apps/dashboard/src/components/ui/index.ts`

Optional layout helpers if needed:
- `apps/dashboard/src/components/layout/DashboardShell.tsx`
- `apps/dashboard/src/components/layout/Sidebar.tsx`
- `apps/dashboard/src/components/layout/Topbar.tsx`
- `apps/dashboard/src/components/layout/index.ts`

### Dependency order
- Phase 0

### Tasks
- Create a reusable `StatusBadge` for status labels such as order state, health, and stock state.
- Create a reusable `StatCard` for the overview-style summary tiles.
- Create a reusable `DataTable` wrapper only if multiple pages benefit from the same table styling/structure.
- Create reusable loading and empty states so pages do not each invent their own overlay markup.
- Create a reusable page header and optional filter bar for pages with search or filter controls.

### Done when
- At least two pages import and use the new shared UI components.
- Shared components are presentational only.
- The repeated inline UI blocks are visibly reduced.

---

## Phase 2 — Introduce URL-Based Routing

### Goal
Replace the state-based page switch with `react-router-dom` navigation.

### Exact files to touch
Create these files:
- `apps/dashboard/src/routes/AppRoutes.tsx`
- `apps/dashboard/src/routes/DashboardLayout.tsx`
- `apps/dashboard/src/routes/ProtectedRoute.tsx`
- `apps/dashboard/src/routes/routePaths.ts`
- `apps/dashboard/src/routes/NotFound.tsx`
- `apps/dashboard/src/routes/index.ts`

Update these files:
- `apps/dashboard/src/App.tsx`
- `apps/dashboard/src/main.tsx`

### Dependency order
- Phase 0
- Phase 1

### Tasks
- Define route paths for the existing dashboard pages.
- Introduce a shared dashboard layout with sidebar/header and an `Outlet`.
- Make `App.tsx` delegate to the route tree instead of manually switching page state.
- Keep a fallback/not-found route so invalid URLs do not break the app.
- Add a route guard only if the dashboard needs one in the current auth flow.

### Suggested route map
- `/` → Overview
- `/chat` → Chat
- `/live` → LiveFeed
- `/orders` → Orders
- `/inventory` → Inventory
- `/cashflow` → Cashflow
- `/llm` → LLMConsole
- `/settings` → Settings
- `/bot-overview` → BotOverview if still needed

### Done when
- Navigation uses URLs instead of local page state.
- Browser refresh stays on the same page.
- Back/forward browser buttons work.
- The dashboard shell is stable and shared across pages.

---

## Phase 3 — Migrate Pages One by One

### Goal
Convert each page to use the new shared components and route structure without breaking behavior.

### Exact files to touch
- `apps/dashboard/src/pages/Overview.tsx`
- `apps/dashboard/src/pages/Orders.tsx`
- `apps/dashboard/src/pages/Inventory.tsx`
- `apps/dashboard/src/pages/Chat.tsx`
- `apps/dashboard/src/pages/Cashflow.tsx`
- `apps/dashboard/src/pages/LLMConsole.tsx`
- `apps/dashboard/src/pages/Settings.tsx`
- `apps/dashboard/src/pages/LiveFeed.tsx`
- `apps/dashboard/src/pages/BotOverview.tsx`
- `apps/dashboard/src/components/ui/*`
- `apps/dashboard/src/routes/*`

### Dependency order
- Phase 2

### Task order
1. `Overview`
2. `Orders`
3. `Inventory`
4. `Chat`
5. `Cashflow`
6. `LLMConsole`
7. `Settings`
8. `LiveFeed`
9. `BotOverview`

### Tasks
- Replace inline badges with `StatusBadge` where appropriate.
- Replace repeated stat tiles with `StatCard`.
- Replace repeated loading overlays with `LoadingState`.
- Replace repeated “no data” UI with `EmptyState`.
- Use `PageHeader` and `FilterBar` where a page has search/filter controls.
- Keep page-level fetch and business mapping inside the page or hook.

### Done when
- Each page still behaves the same from the user’s perspective.
- Each migrated page imports fewer inline UI helpers than before.
- The route-based version of the page works with direct URL entry.

---

## Phase 4 — Remove Legacy State Navigation

### Goal
Delete the old page-switching pattern once routing is stable.

### Exact files to touch
- `apps/dashboard/src/App.tsx`
- `apps/dashboard/src/main.tsx`
- `apps/dashboard/src/index.css`
- `apps/dashboard/src/components/layout/*` if created
- `apps/dashboard/src/routes/*`

### Dependency order
- Phase 2
- Phase 3

### Tasks
- Remove the `useState` page switch logic from `App.tsx`.
- Remove any stale page title maps or navigation arrays that only exist for the old state-based shell.
- Clean up CSS rules that were only needed for the old inline shell structure.
- Make `App.tsx` a thin entry point or router mount.

### Done when
- The dashboard no longer depends on manual page-state switching.
- All navigation flows through the route system.
- No dead navigation code remains in the old shell.

---

## Phase 5 — Polish and Consistency Cleanup

### Goal
Tighten the structure after the refactor so the dashboard stays maintainable.

### Exact files to touch
- `apps/dashboard/src/components/ui/*`
- `apps/dashboard/src/components/layout/*`
- `apps/dashboard/src/routes/*`
- `apps/dashboard/src/index.css`
- `apps/dashboard/src/pages/*`

### Dependency order
- Phase 4

### Tasks
- Normalize naming and exports in the new component folders.
- Ensure component APIs stay small and consistent.
- Check that route layout and active-nav styling match the rest of the dashboard.
- Remove any leftover page-local duplicate markup that should now live in shared components.

### Done when
- The dashboard structure is easy to navigate by folder name.
- Shared components are truly reusable and not bloated.
- The dashboard layout feels consistent across all pages.

---

## Suggested commit order

1. Phase 0 — audit and route design
2. Phase 1 — reusable UI extraction
3. Phase 2 — router introduction
4. Phase 3 — page-by-page migration
5. Phase 4 — remove old navigation state
6. Phase 5 — polish and cleanup

---

## Definition of done

This plan is complete when:

- reusable components exist for the repeated dashboard UI
- dashboard navigation is URL-based
- refresh/back/forward all work
- the dashboard shell is shared and stable
- pages are slimmer and rely less on inline duplication
- the old state-based navigation has been removed
- the dashboard remains fully functional after the refactor
