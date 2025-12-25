RTAP UI Style Guide

Structure and Naming (source of truth)

- Features-first UI: domain components live under `src/features/<domain>/components/**`; domain hooks live under `src/features/<domain>/hooks/**`.
- Shared domain widgets: `src/features/shared/**` (e.g., selectors). Keep generic primitives in `src/components/ui/**` only.
- Routers and services stay in `src/server/api/routers/**` and `src/server/services/**` (no UI imports in services).
- Path aliases: `@features/*`, `@server/*`, `@lib/*`, `@components/*`, and `@/*` are configured in `tsconfig.json` — prefer these over deep relative imports.
- Naming: keep existing file names for now; future cleanup will normalize React component filenames to kebab-case and utilities to camelCase. Avoid renaming during structural moves.

A concise, enforceable guide to keep the UI polished, consistent, and performant. Themes are neutral, dense, and modern — using a Professional Blue accent for clarity.

Principles

- Purposeful contrast: deep neutral blacks (Zinc) or clean whites (Slate); restrained Blue accent.
- Binary System: Strict Light vs. Dark modes. No confusing sub-themes.
- No blur by default: crisp 1px borders; use blur only on overlays if needed.
- Compact density: smaller paddings, tight grids, minimal chrome.
- Consistent states: same focus, hover, and success/failure treatments everywhere.
- Progressive rollout: tokens → primitives → pages.

Canonical Surfaces & Cards

- Page surface: `--surface-0` (Zinc-950 or White).
- List/content cards: `Card variant="default"` with 1px border. Hover = subtle border/ring, not darker fill.
- Overlays/modals: `Card variant="elevated"` only, stronger surface and shadow.
- Content inside modals: use neutral cards/containers; avoid nested elevated cards to prevent double-elevation.
- No "glass"/blur for dense pages. Avoid deep or saturated backgrounds on cards.

Design Tokens (CSS variables)
Define tokens once and reference them everywhere. Do not bake colors directly into components.

- Accent: `--color-accent` (Blue 500/600). Used for focus, active states, and selection.
- Surfaces: `--surface-0/1/2` mapped to `--color-surface` and `--color-surface-elevated`.
- Text: `--text-primary` (Zinc-200 / Slate-900), `--text-secondary`, `--text-muted`.
- Status: `--status-success/warn/error/info` fg/bg pairs. Distinct from Accent.
- Borders/Focus: `--border-rgb`, `--ring` (matches Accent).
- Legacy matrix tokens were removed; use the accent and surface variables above.

Theme configuration

- Strict `light` and `dark` modes managed via `next-themes`.
- Toggle available in sidebar (Sun/Moon).
- Exports automatically inherit the active theme (WYSIWYG).

Component Standards

Buttons

- Default: `size="sm"`, `variant="secondary"` or `"ghost"`; primary only for key CTA.
- Focus: `ring-2` using `--ring`.
- Avoid large, saturated fills.

Cards

- Use `variant="default"` or `"elevated"`. Avoid blur in dense pages.
- 1px borders, medium headers, regular content.

Heatmap

- Executed state: thin accent border (not thick ring).
- Hierarchy: parent → subtech via connector + indent (no clipping lines).
- Legend: compact single-word labels.

Usage Patterns

- No hardcoded colors; use tokens.
- Keep text `text-sm`; use medium for IDs, bold for titles only.
- Icons at ~70% opacity idle; brighten on active/success.

Confirm Modal Standard

- Cancel: `variant="secondary"`, Delete/Confirm destructive: `variant="danger"`.
- Use `ConfirmModal` from `@components/ui/confirm-modal`.

Card Hover/Focus Standard

- Hover: subtle ring/border using `--ring`; do not change surface tint.
- Selected/executed state (e.g., heatmap/technique): thin accent border; no filled backgrounds.

Navigation vs. Edit-In-Place

- Navigational cards (e.g., operation tiles): entire card clickable; show subtle ring on hover.
- Edit-in-place rows/cards (e.g., taxonomy items, techniques): no whole-card click; interactions via InlineActions (pencil/trash) on the right; no hover ring.
- Destructive actions always use ConfirmModal with secondary Cancel and danger Delete.

Do / Don’t

- Do: reuse tokens, keep hover/focus consistent, limit accent usage.
- Don’t: reintroduce blur, use oversized neon buttons, or verbose legends.

Forms & Selectors (Canonical Patterns)

- React Hook Form + Zod: use `react-hook-form` with `zodResolver` for anything beyond trivial inputs. Gate submit with `form.formState.isValid`; avoid ad‑hoc `alert()` validation.
  - Centralize: create a small hook next to the surface (e.g., `useTechniqueEditorForm.ts`) that owns the Zod schema, edit‑mode hydration, and mutations/invalidations.
  - Hydration: in edit flows, hydrate exactly once per session (keyed by the entity id) to avoid clobbering in‑progress edits on background refetch.
  - Cross‑field rules: put end ≥ start and conditional time requirements in Zod (`superRefine`), not the component.
- Date/time controls: always use our `DateTimePicker` and `TimeRangePicker` components.
- Multi‑selects: use `TaxonomySelector` for tag‑like, id/name lists.
  - Variants: `tools`, `crown-jewels`, `log-sources` (extend in place if new taxonomies appear).
  - Editor surfaces: badges‑only, `compactHeader`, `searchable=false` for denser UX.
  - Settings surfaces: keep `searchable=true` and the full header; use neutral list cards.
- MITRE selection: embed the tactic/technique/sub‑technique combobox in the editor’s Overview section; do not resurrect separate pickers.
  - Build combined options once (memoized), show sub‑techniques as nested entries, and display a curated short description under the selection.
- Submit/Close: on success, invalidate tRPC queries that feed the current page and close the modal; on cancel, reset form state and close.

When to adopt RHF (and when not to)

- Use RHF + Zod for:
  - Any form with cross‑field validation (times, conditional required fields).
  - Multi‑section or multi‑step editors (e.g., technique editor).
  - Edit flows where values arrive asynchronously and need hydration.
- Stick to local state for:
  - Simple one‑field or two‑field popups in Settings (rename, confirm delete, single select) with no cross‑field rules.
  - Temporary, internal tools or debug toggles.

New libraries allowed (already in repo)

- `react-hook-form` and `@hookform/resolvers` (paired with `zod`). No new date/time libs; reuse in‑house pickers.
