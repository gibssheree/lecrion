# MIGRATION_EVELANT

  

## Objective

  

Rename the Pointera brand across the entire monorepo to Evelant, including file names, class names, CSS namespaces, manifest labels, documentation, generated assets, runtime constants, and any user-facing strings that still mention Pointera.

  

This is a brand migration, not a feature refactor. The goal is a consistent new product identity with no leftover Pointera references except where a temporary compatibility bridge is explicitly required.

  

## Scope

  

In scope:

- Monorepo root files, extension code under `src/`, dashboard/API code under `web/`, generated assets, docs, styles, manifests, and build outputs that are committed in the repo.

- File/folder renames when the file name itself contains the brand.

- CSS class prefixes, data attributes, storage keys, logger namespaces, route labels, titles, metadata, and visible copy.

- Domain and URL references such as `pointera.app`, `dashboard.pointera.app`, and any other brand-hosted service URLs.

  

Out of scope unless explicitly approved:

- External provider names such as Supabase, OpenAI, Anthropic, Gemini, Tavily, Chrome, or Next.js.

- Product features that are not brand-specific.

- Database schema changes unless a migration is required for a brand-bearing key or stored value.

  

## Migration Principles

  

- Preserve behavior first, rename identity second.

- Keep each phase small enough to review and validate independently.

- Prefer deterministic find/replace for simple brand strings, and semantic rename for symbols and imports.

- Rename file paths only after the new names are agreed and the import graph is mapped.

- Keep a temporary compatibility layer only where data would otherwise break, especially storage keys and URL redirects.

- Do not mix feature work into the brand migration.

  

## Phase 0 - Baseline Inventory

  

### Goal

Capture the exact brand-bearing surface area before editing anything.

  

### Tasks

- Collect all Pointera references in text, code, styles, manifests, docs, and generated assets.

- Classify each reference into one of these buckets:

  - visible UI copy

  - internal identifier

  - file/folder name

  - CSS selector/class prefix

  - storage key

  - runtime constant

  - URL/domain

  - documentation only

  - generated artifact

- Confirm whether any server-side or client-side persisted data contains Pointera strings.

- Confirm which generated files are checked in and must be updated or regenerated.

  

### Suggested agent tasks

- Agent A: scan `web/` for all Pointera text, brand URLs, and route labels.

- Agent B: scan `src/` for all Pointera text, CSS prefixes, storage keys, and runtime constants.

- Agent C: scan root docs and generated artifacts for Pointera branding.

  

### Non-conflict rule for parallel work

- Agent A owns `web/**` only.

- Agent B owns `src/**` only.

- Agent C owns root docs and generated outputs only.

- Do not edit shared files in this phase; only produce inventories.

  

### Expected output

- A complete inventory list of all Pointera-bearing files and symbols.

- A rename matrix with old name, new name, file path, and migration type.

  

### Verification

- Run repo-wide search for `Pointera`, `PointerA`, and `pointera`.

- Confirm the inventory matches the search results.

  

### Done flag for this phase

- Mark this phase complete only when every Pointera-bearing reference has a tracked owner and migration type.

  

## Phase 1 - Brand Naming Decisions

  

### Goal

Lock the new Evelant naming conventions before editing the codebase.

  

### Tasks

- Define final spelling and casing rules:

  - brand name: `Evelant`

  - product or prefix variants: `Evelant`, `evelant`, `EVELANT` only when technically required

- Decide whether technical namespaces should use `evelant`, `evelant-`, `Evelant`, or `EVELANT`.

- Decide storage key strategy:

  - hard cutover to new keys

  - dual-read / write-new strategy

  - one-time migration on startup

- Decide URL strategy:

  - new domains

  - redirect compatibility for old domains

  - canonical metadata updates

- Decide whether any public-facing legacy strings remain in comments or transition warnings.

  

### Suggested agent tasks

- Agent A: propose naming rules for manifests, URLs, and UI copy.

- Agent B: propose technical namespace rules for CSS, storage, and logger keys.

- Agent C: propose data migration policy for local storage and any persisted user state.

  

### Non-conflict rule for parallel work

- Agents only write proposal notes in separate scratch files or their own output.

- No code edits yet.

  

### Expected output

- One approved naming convention document for the rest of the migration.

  

### Verification

- Review that the approved naming rules are internally consistent and not contradictory.

  

### Done flag for this phase

- Mark complete only after the naming rules are fixed and no unresolved brand-casing decisions remain.

  

## Phase 2 - Manifest, Metadata, and Docs

  

### Goal

Replace brand text in user-visible and metadata surfaces first, because these are the easiest to validate.

  

### Files to update

- [package.json](package.json)

- [plasmo.config.mjs](plasmo.config.mjs)

- [README.md](README.md)

- [web/README.md](web/README.md)

- [FITUR_KILLER_ROADMAP.md](FITUR_KILLER_ROADMAP.md)

- [task.md](task.md)

- [web/app/layout.tsx](web/app/layout.tsx)

- [web/app/robots.ts](web/app/robots.ts)

- [web/app/sitemap.ts](web/app/sitemap.ts)

- All docs under `web/components/routes-ui/dashboard/documentation/`

  

### Tasks

- Replace all visible Pointera text with Evelant in titles, descriptions, headings, footer text, meta tags, and roadmap docs.

- Update extension display names, popup labels, command descriptions, and manifest metadata.

- Update all site URLs in docs and metadata.

- Keep wording consistent across root docs and dashboard docs.

  

### Suggested agent tasks

- Agent A: update root docs and extension manifest metadata.

- Agent B: update web app metadata, SEO tags, robots, sitemap, and public page copy.

- Agent C: update dashboard documentation content and markdown-like article content.

  

### Non-conflict rule for parallel work

- Agent A owns root files.

- Agent B owns `web/app/**` metadata files.

- Agent C owns `web/components/routes-ui/dashboard/documentation/**` only.

  

### Expected output

- All public-facing copy uses Evelant.

- No `pointera.app` or `dashboard.pointera.app` strings remain in docs or metadata unless intentionally kept for redirects.

  

### Verification

- Search for `Pointera`, `PointerA`, and `pointera` in docs and metadata.

- Confirm titles, descriptions, and URLs render the new brand.

  

### Done flag for this phase

- Mark complete only when public docs and metadata no longer advertise Pointera.

  

## Phase 3 - Runtime Constants and Internal Identifiers

  

### Goal

Rename technical brand constants and keys that are part of the running product.

  

### Files to update

- [src/lib/urls.ts](src/lib/urls.ts)

- [src/lib/logger.ts](src/lib/logger.ts)

- [src/background/constants.ts](src/background/constants.ts)

- [src/lib/storage/*](src/lib/storage)

- [src/lib/api/*](src/lib/api)

- [web/services/logger.ts](web/services/logger.ts)

- [web/services/cors.ts](web/services/cors.ts)

- [web/services/api/*](web/services/api)

- Any file that exports `POINTERA_*` constants

  

### Tasks

- Rename constants like `POINTERA_SITE_URL`, `POINTERA_APP_URL`, and `POINTERA_API_BASE` to their Evelant equivalents.

- Rename logger namespaces, local storage keys, and message channel identifiers that embed Pointera.

- Update any code that builds or validates brand-specific URLs.

- Keep temporary compatibility fallbacks for old keys if user data already exists.

  

### Suggested agent tasks

- Agent A: rename `src/lib/urls.ts` and related URL consumers.

- Agent B: rename storage and logger keys in `src/lib/storage/**` and `src/lib/logger.ts`.

- Agent C: rename web-side logger/config constants in `web/services/**`.

  

### Non-conflict rule for parallel work

- Agent A owns URL and domain constants only.

- Agent B owns storage/logger keys only.

- Agent C owns web service constants only.

  

### Expected output

- All brand-bearing technical constants use Evelant naming.

- Existing user state can still be read during the transition if a fallback is implemented.

  

### Verification

- Search for `POINTERA_`, `pointeraSettings`, `pointeraHistory`, `pointeraLog`, and other brand-key variants.

- Run typecheck on affected packages after rename.

  

### Done flag for this phase

- Mark complete only when no runtime code still depends on the old brand keys except explicit fallback readers.

  

## Phase 4 - CSS, Classes, and Style Namespaces

  

### Goal

Rename all brand-bearing class names and style namespaces.

  

### Files to update

- [src/styles/*](src/styles)

- [web/app/styles/*](web/app/styles)

- [out.css](out.css)

- [src/contents/**](src/contents)

- [src/popup.tsx](src/popup.tsx)

- [src/sidepanel.tsx](src/sidepanel.tsx)

- Any React component or CSS file using `pointera-` class prefixes

  

### Tasks

- Replace `.pointera-*` with the new Evelant class namespace.

- Update corresponding JSX/TSX `className` values.

- Update CSS variables, data attributes, and style hooks if they are brand-specific.

- Regenerate or update compiled CSS artifacts that still contain the old class names.

- Keep utility classes and generic design system classes unchanged unless they embed the brand.

  

### Suggested agent tasks

- Agent A: rename extension CSS namespaces in `src/styles/**` and `src/contents/**`.

- Agent B: rename web CSS namespaces in `web/app/styles/**` and component className usage.

- Agent C: update generated CSS artifacts like `out.css` and verify against source styles.

  

### Non-conflict rule for parallel work

- Agent A owns extension styling files only.

- Agent B owns dashboard/web styling files only.

- Agent C owns generated/bundled style outputs only.

  

### Expected output

- The UI uses the new Evelant styling namespace consistently.

- No `.pointera-` selectors remain in the committed source or generated style outputs.

  

### Verification

- Grep for `pointera-` across CSS, TSX, and generated assets.

- Open key UI screens to confirm styles still apply after rename.

  

### Done flag for this phase

- Mark complete only when the source styles and rendered UI both resolve the new class namespace correctly.

  

## Phase 5 - File and Folder Renames

  

### Goal

Rename brand-specific file and folder names without breaking imports.

  

### Files and folders likely to rename

- Any root or nested file name containing `pointera`.

- Any stylesheet, generated asset, or helper file with a brand-prefixed filename.

- Any route/documentation file whose filename itself is brand-specific.

  

### Tasks

- Rename only files and folders whose names contain the brand.

- Update all imports, exports, route references, and generated asset references after each rename batch.

- Prefer one directory tree at a time so failures are easy to localize.

  

### Suggested agent tasks

- Agent A: rename files in `src/` that are brand-specific and update imports.

- Agent B: rename files in `web/` that are brand-specific and update imports.

- Agent C: rename root-level brand files and documentation filenames if needed.

  

### Non-conflict rule for parallel work

- Agent A owns `src/**` file renames.

- Agent B owns `web/**` file renames.

- Agent C owns root-level file renames only.

- Do not rename the same folder tree from multiple agents.

  

### Expected output

- File names reflect Evelant branding where the filename itself is part of the identity.

- The project still compiles after import updates.

  

### Verification

- Run file search for brand-specific filenames.

- Run typecheck and build after each rename batch.

  

### Done flag for this phase

- Mark complete only when all intended brand-bearing filenames have been renamed and imports resolve.

  

## Phase 6 - UI Text, Routes, and Product Copy

  

### Goal

Make the visible product experience speak Evelant everywhere.

  

### Files to update

- [web/components/features/landing/*](web/components/features/landing)

- [web/components/routes-ui/public/*](web/components/routes-ui/public)

- [web/components/routes-ui/auth/*](web/components/routes-ui/auth)

- [web/components/routes-ui/dashboard/*](web/components/routes-ui/dashboard)

- [web/components/features/chat/*](web/components/features/chat)

- [web/components/features/settings/*](web/components/features/settings)

- [web/components/features/dashboard/*](web/components/features/dashboard)

- [web/components/features/appearance/*](web/components/features/appearance)

- [src/popup.tsx](src/popup.tsx)

- [src/sidepanel.tsx](src/sidepanel.tsx)

- [src/contents/**](src/contents)

  

### Tasks

- Replace any visible Pointera brand copy in buttons, labels, alt text, toasts, metadata, and onboarding text.

- Update route content, landing page copy, footer links, and documentation pages.

- Update any login/signup/reset-password and dashboard copy that still references Pointera.

- Keep the product tone consistent across extension and dashboard surfaces.

  

### Suggested agent tasks

- Agent A: landing and public marketing pages.

- Agent B: auth and dashboard route views.

- Agent C: extension UI copy and chat/settings copy.

  

### Non-conflict rule for parallel work

- Agent A owns public marketing views only.

- Agent B owns auth/dashboard page views only.

- Agent C owns extension copy only.

  

### Expected output

- The user-visible product presents as Evelant across the whole app.

  

### Verification

- Search for `Pointera` and `PointerA` in all TSX, TS, MD, and CSS files.

- Manually review the main landing page, auth pages, dashboard shell, popup, and side panel.

  

### Done flag for this phase

- Mark complete only when no user-facing Pointera text remains in any shipped surface.

  

## Phase 7 - Data Migration and Compatibility Bridge

  

### Goal

Prevent user data loss while the brand moves from Pointera to Evelant.

  

### Tasks

- Add dual-read / write-new handling for local storage keys if needed.

- Add migration logic for existing stored extension settings and history records.

- Add redirects or canonical handling for old branded URLs if domain changes.

- Preserve session continuity for authenticated users during the transition.

- Decide whether old brand strings stay as hidden aliases for one release window.

  

### Suggested agent tasks

- Agent A: extension storage migration and compatibility fallbacks.

- Agent B: dashboard/auth/session compatibility and redirects.

- Agent C: verify any backend stored brand strings or URL assumptions.

  

### Non-conflict rule for parallel work

- Agent A owns `src/lib/storage/**` and extension state migration.

- Agent B owns `web/services/auth/**`, `web/services/supabase/**`, and route redirects.

- Agent C owns scans for persisted brand strings and data backfill notes.

  

### Expected output

- Existing users keep their data and sessions after the rename.

- New writes use Evelant keys and URLs.

  

### Verification

- Log in with an existing account.

- Confirm stored settings/history are still readable.

- Confirm old URLs redirect or fail gracefully according to the chosen policy.

  

### Done flag for this phase

- Mark complete only when old brand data can be read safely and new data writes under the new brand.

  

## Phase 8 - Build, Scan, and Final Validation

  

### Goal

Prove the migration is complete and no unintended leftovers remain.

  

### Tasks

- Run the relevant lint, typecheck, and build commands for both packages.

- Re-run repo-wide searches for `Pointera`, `PointerA`, `pointera`, `pointera-`, and `POINTERA_`.

- Inspect generated artifacts again after builds.

- Confirm file renames did not break imports or route resolution.

- Review any remaining matches and decide if they are allowed legacy aliases or defects.

  

### Verification commands

Root extension:

```bash

npm run build

```

  

Web app:

```bash

cd web

pnpm lint

pnpm exec tsc --noEmit

pnpm build

```

  

Optional extra checks:

```bash

grep -R "Pointera\|PointerA\|pointera\|pointera-\|POINTERA_" .

```

  

### Expected output

- Clean builds for both monorepo packages.

- No unexpected Pointera references left in source, docs, or generated assets.

  

### Done flag for full migration

Mark the migration complete only when all of the following are true:

- All planned files and folders have been renamed or updated.

- All user-facing brand text now says Evelant.

- All technical namespaces, class prefixes, and storage keys have been migrated or have explicit compatibility aliases.

- All verification commands pass.

- Final repo-wide search returns only approved legacy compatibility entries, if any.

  

## Recommended Execution Order

  

1. Phase 0 - inventory and classification.

2. Phase 1 - naming decisions.

3. Phase 2 - docs, manifest, and metadata.

4. Phase 3 - runtime constants and identifiers.

5. Phase 4 - CSS and class namespaces.

6. Phase 5 - file and folder renames.

7. Phase 6 - UI text and route content.

8. Phase 7 - data migration and compatibility.

9. Phase 8 - validation and final sweep.

  

## Suggested Parallel Agent Strategy

  

If working with multiple agents at once, use this split:

- Agent A: root docs, manifests, and extension-side files.

- Agent B: web dashboard, API, and service files.

- Agent C: CSS and generated artifacts.

- Agent D: file rename pass and import fix-up after the content rename is stable.

  

Conflict avoidance rules:

- Never let two agents edit the same file tree in the same phase.

- Never let one agent rename files while another is still changing import paths inside that tree.

- Do content renames first, then file renames, then import fix-up, then verification.

  

## Migration Exit Criteria

  

The Evelant migration is finished when:

- Search for Pointera-related names is empty except for approved compatibility exceptions.

- The extension installs, launches, and loads its popup/side panel under the Evelant identity.

- The web dashboard loads, authenticates, and serves the Evelant-branded UI.

- The build outputs are clean and regenerated assets no longer expose Pointera branding.

- The documentation and metadata all describe the product as Evelant.