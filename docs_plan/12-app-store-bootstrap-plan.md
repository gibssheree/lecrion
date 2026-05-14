# Dashboard App and Store Bootstrap Plan

This plan defines when and how the empty `app/` and `store/` folders should be introduced in the dashboard.

At the moment, both folders are intentionally empty. That is correct.
Do not fill them until there is a clear technical need that cannot be solved with page-local state, hooks, or the existing route/layout structure.

## Working Principles

1. **Do not create global abstractions early**
   - `app/` and `store/` should stay empty until there is a real cross-cutting need.

2. **Prefer the simplest state solution that works**
   - If a page can use local state or hooks, keep it there.
   - Add global state only for data that must survive route changes or be shared broadly.

3. **Keep bootstrap and state separate**
   - `app/` is for app-level setup and providers.
   - `store/` is only for global state.

4. **Add files only when they have a clear owner**
   - Do not create placeholder files without an immediate use case.

5. **Verify after each addition**
   - If either folder starts getting files, run diagnostics and ensure routing/components still stay clean.

---

## Phase 0 — Keep Both Folders Empty Until Needed

### Goal
Preserve the current clean state and avoid speculative abstraction.

### Exact files to touch
- None

### Dependency order
- None

### Done when
- `apps/dashboard/src/app` remains empty.
- `apps/dashboard/src/store` remains empty.
- There is no attempt to centralize state or bootstrap logic without a concrete requirement.

---

## Phase 1 — Introduce `app/` Only If App-Level Bootstrap Becomes Necessary

### Goal
Create a home for dashboard-wide bootstrap concerns only when they become real requirements.

### Trigger conditions
Start this phase only if the dashboard needs one or more of the following:
- shared providers used across many routes
- a single app bootstrap point
- app-wide error boundary
- auth/session bootstrap logic that should happen before route rendering
- client initialization that should not live inside `App.tsx`

### Exact files to touch
Create only the files that are actually needed. Typical candidates:
- `apps/dashboard/src/app/AppProviders.tsx`
- `apps/dashboard/src/app/ErrorBoundary.tsx`
- `apps/dashboard/src/app/router.tsx`
- `apps/dashboard/src/app/index.ts`

### Dependency order
- Dashboard routing must already be stable.
- Shared UI extraction should already be complete.

### Tasks
- Move only app-wide bootstrap logic out of the root component when necessary.
- Keep providers isolated and small.
- Do not move page logic or business logic into `app/`.

### Done when
- `app/` contains only true application bootstrap files.
- `App.tsx` becomes thinner because bootstrap concerns moved out.
- No page-level behavior was moved into `app/`.

---

## Phase 2 — Introduce `store/` Only If a Shared Global State Actually Exists

### Goal
Add global state management only for state that must be shared across routes or survive navigation.

### Trigger conditions
Start this phase only if you need state that:
- must be shared across multiple pages
- must persist while navigating
- should not be re-fetched or re-created on each route change
- is awkward to thread through props or duplicate in hooks

### Exact files to touch
Create only the files that are actually needed. Typical candidates:
- `apps/dashboard/src/store/auth.store.ts`
- `apps/dashboard/src/store/ui.store.ts`
- `apps/dashboard/src/store/realtime.store.ts`
- `apps/dashboard/src/store/index.ts`

### Dependency order
- `app/` bootstrap decisions should already be clear.
- The route structure should already be stable.

### Tasks
- Define the smallest possible shared state slices.
- Keep business data in the API or page-level hooks whenever possible.
- Avoid making `store/` the default place for server data.

### Good examples of store-worthy state
- sidebar collapsed state
- theme preference
- auth/session metadata that must be shared broadly
- realtime connection flags
- a tiny UI preference state

### Not good examples for store
- fetched orders list
- product catalog data
- report snapshots
- page-specific form state

### Done when
- The store contains only genuinely shared UI/session state.
- No server data was moved into global state just for convenience.
- The store remains small and easy to reason about.

---

## Phase 3 — Combine `app/` and `store/` Only If There Is Clear Cross-Route Value

### Goal
Connect bootstrap and state only when there is a justified dashboard-wide benefit.

### Exact files to touch
- `apps/dashboard/src/app/*`
- `apps/dashboard/src/store/*`
- `apps/dashboard/src/App.tsx`
- `apps/dashboard/src/main.tsx`

### Dependency order
- Phase 1 or Phase 2 as needed

### Tasks
- Wire providers into the app bootstrap layer.
- Wire global state only where route-to-route persistence is valuable.
- Keep the dashboard shell and page routing independent from the store unless a shared concern truly exists.

### Done when
- `app/` owns bootstrap.
- `store/` owns only shared state.
- The two folders stay narrow and do not become a dumping ground.

---

## Suggested implementation order if the folders are ever needed

1. Define the actual cross-route need.
2. Add the minimum `app/` bootstrap file(s).
3. Add the minimum `store/` slice(s).
4. Connect them to `App.tsx` and verify route behavior.
5. Run diagnostics and clean up any leftover duplication.

---

## Definition of done

This plan is complete when one of these is true:

- the folders remain intentionally empty because they are not needed yet, or
- they are introduced with a clear owner, a small surface area, and no speculative abstraction
