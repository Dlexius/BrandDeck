# BrandDeck Studio — Agent Handoff

Brand-governed presentation generator. Creators describe a deck + attach context (BI CSV, source docs); an OpenAI subagent pipeline (Responses API + Structured Outputs — intentionally NOT the Agents SDK) plans a DeckPlan; deterministic validators gate it; deterministic renderers produce the PPTX.

## THE CORE RULE
AI may only choose content, approved layout_ids, slide order/count, and emphasis phrases marked with *asterisks*. AI must NEVER choose colors, fonts, geometry, logos, or assets — those come from the brand contract and template kit. Generation fails closed.

## Working rules
- Verify before declaring done: `npm run typecheck` + `npm run test` (vitest, 64 tests). Renderer changes: also smoke-render a real PPTX (see tests/new-layouts.test.ts patterns).
- E2E: `npm run dev`, needs OPENAI_API_KEY in .env.local (account is funded). Generation takes 1–3 min.
- Client-facing copy must never contain AI/internal language. lib/validateDeckPlan.ts forbidden list is the source of truth — extend it when you find new leaks (includes a foreign-script pattern; sanitizer in openaiDeckPlanner scrubs sparse fragments first).
- Admin/creator UI copy: no "renderer/object map/frame map/drift" jargon — use Slide Mapping, template mapping, Brand Lock, Deck Types.
- Keep three creator steps (Describe → Add Context → Generate). No enterprise sprawl.
- `.branddeck-runtime/` holds local persisted state (template kits, assets, contract overrides, saved client profiles) — gitignored.
- White-label intake rule: creator-facing metric collection must never hardcode one vendor's workflow names. Workflow counts are creator-named `workflow_metrics` (manual form) or flexible CSV metric columns (BI import) flowing through the context pack into feature evidence; daily_logs/rfi/submittals row fields remain server-side back-compat only.

## Architecture map
- app/page.tsx (~2.7k lines): Home state + handlers only. UI lives in components/creator/* and components/brand-settings/*; shared types/constants/helpers in lib/ui-{types,constants,helpers}.ts.
- Pipeline: lib/generateDeckPlan.ts (deterministic baseline) → lib/openaiDeckPlanner.ts (subagents + sanitizer + self-heal) → lib/validateDeckPlan.ts / auditDeckAccuracy / auditDeckFit / deck-content-chunker → lib/renderPptx.ts (coordinate renderer; speaker notes; white-label image resolution via lib/brand-image-resolution.ts) or lib/cloneStarterPptx.ts (template clone/edit; supports admin static slides appended verbatim).
- 11 approved layouts incl. action_plan_table (status chips) + photo_section_divider. New-layout wiring checklist: deck-plan-schema APPROVED_LAYOUT_IDS, planner enum+fields+rules, brand-contract.json, renderer fn, FRAME_MAP_RULES (template-kit-store), TITLE_LIMITS + capacity (chunker), auditDeckFit, DeckPreview/LayoutMiniature, buildSlide case (slide_role === layout_id), recipes JSON.
- Export: canExport requires deck validation only; template clone/edit ships when preflight+dry-run pass, else governed brand-layout fallback — a valid deck is ALWAYS exportable.
- Stale model: input edits keep the last validated deck visible + gate export; failed regenerate restores the previous deck.
- White-label: governed assets (by role) beat bundled demo assets; adopted identities suppress bundled marks entirely.
- Brand Settings: left nav (Overview / Brand / Templates / Governance / Deck Types); Overview = brand hero + go-live checklist; Deck Type Builder shows LayoutMiniature thumbnails.

## Backlog / next steps (owner-prioritized, June 2026)
1. NotebookLM Enterprise connector: typed scaffold exists (lib/connectors/notebooklm-adapter.ts, env vars in .env.example). Wire live API once the owner has Enterprise credentials — follow the Google Drive connector pattern (answers/citations → bounded SourceDocuments). Owner: "later".
2. ON HOLD per owner (June 2026) — do not start: governed image generation (admin action calling an image API → asset pending approval → renderer-usable only after approval; NEVER inline in planning, see README "Future Integrations").
3. Roadmap only (tabled): OpenAI Realtime voice (generation API is already stateless JSON-in/out).

Shipped June 2026 (cost guards + auth): source-grounding failures no longer burn paid revision rounds — safeSourceFidelityLines (auditDeckAccuracy) feeds the planner the exact audit sentences as source_fidelity_lines + a carry-through rule, and repairSourceGrounding (openaiDeckPlanner) deterministically restates the top safe action/risk line inside layout budgets before AND after the revision loop (tests/source-grounding-repair.test.ts). Clerk auth installed (@clerk/nextjs v7): middleware.ts at root (NOT proxy.ts — Next 15.5 only loads middleware.(ts|js); rename when upgrading to Next 16), ClerkProvider + Show/SignInButton/SignUpButton/UserButton header in app/layout.tsx, keys in .env.local (keyless dev mode works without), .clerk/ gitignored. No routes are auth-gated yet — clerkMiddleware() only establishes auth context; per-user client assignment can now build on this.

Shipped June 2026 (step-2 versatility): trend section generalized (mobile-usage inputs removed from the manual form; fields stay server-side for imports); workflow metric caps raised to 24 with highest-volume-first ordering for big Power BI leaderboards; Risk & Action Quick Picks (BUILT_IN_ACTION_PRESETS in ui-constants + lib/action-preset-store.ts + /api/action-presets; admin manager card in Brand Settings → Deck Types; creator chips fill risk_summary / first empty recommendation slot); connector visibility toggles in Brand Settings → Brand (workspace-settings connectors object); NotebookLM preview connector (off by default, toggle on to demo: NOTEBOOKLM_SAMPLE_SOURCES attach as real SourceDocuments through the standard evidence path — swap for live notebook queries when Enterprise credentials land). Bundled quick picks and sample sources are tested jargon-free (tests/text-field-mapping.test.ts).

Shipped June 2026 (presentation mode): workspace-level "Who You Present To" setting in Brand Settings → Brand (lib/workspace-settings-store.ts + /api/workspace-settings). "internal" mode relabels step two (Client → Prepared For, Client Profile → Audience Profile, Save Current Audience) and hides bundled example clients; wording/examples only, brand rules unchanged. Also: no-client generation falls back to brandContract.companyName for the cover title (never the old "Selected Client" placeholder). Future direction (owner): Salesforce connector should sync assigned accounts into the client-profile store; per-user client assignment waits on a user model.

Shipped June 2026 (step-2 overhaul): saved client profiles (lib/client-profile-store.ts + /api/client-profiles; Save Current Client captures snapshot+context; saved clients suppress the bundled example clients); white-label workflow metrics (dynamic name+count list replacing fixed Procore fields end to end, incl. BI-import mirror + edit sync); BI dropzone copy clarified with /api/sample-csv download link.

Shipped June 2026: guided Text Field Mapping walkthrough in Governance (lib/template-binding-catalog.ts catalog gated to clone-renderer bindings, lib/template-text-fields.ts extraction, /api/template-text-fields, components/brand-settings/text-field-mapping-walkthrough.tsx → saves through the existing /api/template-object-map import path); creator slide deselection within a chosen deck type (excludedSlideRoles end to end, title slide locked, min 3; applyCreatorSlideSelection in generateDeckPlan); system-fallback font filtering (filterDetectedFonts in template-kit-store, applied at detect + hydrate).

## Gotchas
- Dev server degrades after heavy HMR (stale chunks, even fake runtime errors) — restart it before judging breakage; production build is the truth.
- Repo edited on Windows + macOS; expect line-ending noise.
- compliance reviewer occasionally blocks a draft (stochastic); one self-heal pass runs automatically. The export-quality suite must stay green before touching planner/renderer/validators.
