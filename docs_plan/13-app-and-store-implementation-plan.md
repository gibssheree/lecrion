# App and Store Implementation Plan

This document is the concrete implementation plan for the dashboard `app/` and `store/` folders.

It should only be executed if the dashboard truly needs dashboard-wide bootstrap or shared global state.
If the current page-local hooks and route shell are sufficient, keep both folders empty and do not force abstraction.

## Scope Rules

- `app/` is for app-level bootstrap only: providers, error boundary, router bootstrap, and top-level initialization.
- `store/` is for shared dashboard state only: small cross-route UI/session state.
- Do not move server data, report payloads, or page-specific form state into `store/`.
- Do not move page business logic into `app/`.
- If a need can be solved with local state or an existing hook, keep it there.

---

## Phase 0 — Confirm the Need

### Goal
Only start this implementation if there is a real cross-route concern.

### Exact files to touch
- None

### Dependency order
- Dashboard routing must already be stable.
- Shared UI extraction must already be complete.

### Trigger conditions
Start this plan only if one or more of the following become true:
- multiple routes need the same provider setup
- auth/session bootstrap needs to happen before rendering routes
- error handling should be centralized at the app root
- a shared UI preference must persist across route changes
- a small global state slice is repeatedly duplicated in multiple pages

### Done when
- There is a documented reason to introduce `app/` or `store/`.
- The implementation is scoped to a real use case, not a preference for structure.

---

## Phase 1 — Build the `app/` Bootstrap Layer

### Goal
Create a dashboard bootstrap layer for shared providers and top-level app concerns.

### Exact files to touch
Create only what is needed. Typical files:
- `apps/dashboard/src/app/AppProviders.tsx`
- `apps/dashboard/src/app/ErrorBoundary.tsx`
- `apps/dashboard/src/app/router.tsx`
- `apps/dashboard/src/app/index.ts`
- `apps/dashboard/src/app/types.ts`

Update as needed:
- `apps/dashboard/src/App.tsx`
- `apps/dashboard/src/main.tsx`
- `apps/dashboard/src/routes/*`

### Dependency order
- Phase 0

### Tasks
- Move only app-wide providers into `app/`.
- Keep provider composition small and explicit.
- Add a top-level error boundary if the dashboard needs one.
- If router bootstrap belongs outside `App.tsx`, move it into `app/router.tsx`.
- Keep `app/` free of business logic and page-specific behavior.

### Good candidates for `app/`
- auth/session bootstrap wrapper
- shared theme/provider wrappers
- error boundary
- router wiring
- shared query/client initialization if needed later

### Not good candidates for `app/`
- fetched orders data
- product catalog data
- report snapshots
- page form state
- page-specific filters

### Done when
- `App.tsx` becomes thinner and mostly delegates to app bootstrap.
- Shared providers are centralized in one place.
- No page logic was moved into `app/`.

---

## Phase 2 — Build the `store/` State Layer

### Goal
Create a very small global state layer only for data that must survive route changes or be shared broadly.

### Exact files to touch
Create only what is needed. Typical files:
- `apps/dashboard/src/store/auth.store.ts`
- `apps/dashboard/src/store/ui.store.ts`
- `apps/dashboard/src/store/realtime.store.ts`
- `apps/dashboard/src/store/preferences.store.ts`
- `apps/dashboard/src/store/index.ts`

### Dependency order
- Phase 0
- Shared routing should already exist.

### Tasks
- Define the smallest possible shared state slices.
- Keep state shape simple and intentional.
- Prefer selectors or narrow hooks over exposing the entire store everywhere.
- Do not use `store/` as a default place for server data.

### Good candidates for `store/`
- authenticated user/session metadata shared across routes
- sidebar collapsed state
- theme or display preferences
- realtime connection status
- a small dashboard-wide filter state if it truly spans routes

### Not good candidates for `store/`
- API responses fetched from `/api/orders`
- cached report snapshots
- product lists
- table filter state that only belongs to one page
- form state for a single page

### Done when
- The store contains only state that genuinely needs to survive route changes.
- Server data still lives in API calls and page hooks.
- The store is small enough to understand quickly.

---

## Phase 3 — Connect `app/` and `store/` to the Dashboard Shell

### Goal
Wire app bootstrap and shared state into the dashboard only where there is a real cross-route benefit.

### Exact files to touch
- `apps/dashboard/src/App.tsx`
- `apps/dashboard/src/main.tsx`
- `apps/dashboard/src/components/layout/DashboardShell.tsx`
- `apps/dashboard/src/components/layout/Sidebar.tsx`
- `apps/dashboard/src/routes/*`
- `apps/dashboard/src/app/*`
- `apps/dashboard/src/store/*`

### Dependency order
- Phase 1
- Phase 2

### Tasks
- Wrap the dashboard in the app bootstrap layer.
- Expose shared state only where the shell or multiple routes actually need it.
- Keep route pages independent of the store unless persistence across navigation is required.
- Avoid prop drilling by using the store only for truly shared state.

### Done when
- The dashboard shell can consume bootstrap and store state cleanly.
- Route pages still work independently.
- The integration does not increase coupling unnecessarily.

---

## Phase 4 — Stabilize and Clean Up

### Goal
Make sure the new folders stay disciplined and do not become a dumping ground.

### Exact files to touch
- `apps/dashboard/src/app/*`
- `apps/dashboard/src/store/*`
- `apps/dashboard/src/App.tsx`
- `apps/dashboard/src/main.tsx`
- `apps/dashboard/src/routes/*`

### Dependency order
- Phase 3

### Tasks
- Remove any duplicated logic that is still present in page files after wiring the new layers.
- Normalize exports in `app/` and `store/`.
- Keep `app/` only for bootstrap concerns.
- Keep `store/` only for true shared state.

### Done when
- The folder boundaries remain clear.
- There is no business logic in `app/`.
- There is no server data cache in `store/`.
- The dashboard stays buildable and diagnostics remain clean.

---

## Suggested execution order

1. Confirm a real need
2. Add `app/` bootstrap
3. Add `store/` slices
4. Connect them to the shell
5. Clean up and verify

---

## Definition of done

This plan is complete when one of these is true:

- the dashboard never needed `app/` or `store/`, so both remain intentionally empty, or
- both folders are implemented with a very small, clearly owned surface area and no speculative abstraction
