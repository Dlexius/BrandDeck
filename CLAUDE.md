# BrandDeck Studio — Agent Handoff

Brand-governed presentation generator. Creators describe a deck + attach context (BI CSV, source docs); an OpenAI subagent pipeline (Responses API + Structured Outputs — intentionally NOT the Agents SDK) plans a DeckPlan; deterministic validators gate it; deterministic renderers produce the PPTX.

## THE CORE RULE
AI may only choose content, approved layout_ids, slide order/count, and emphasis phrases marked with *asterisks*. AI must NEVER choose colors, fonts, geometry, logos, or assets — those come from the brand contract and template kit. Generation fails closed.

## Working rules
- Verify before declaring done: `npm run typecheck` + `npm run test` (vitest, 51 tests). Renderer changes: also smoke-render a real PPTX (see tests/new-layouts.test.ts patterns).
- E2E: `npm run dev`, needs OPENAI_API_KEY in .env.local (account is funded). Generation takes 1–3 min.
- Client-facing copy must never contain AI/internal language. lib/validateDeckPlan.ts forbidden list is the source of truth — extend it when you find new leaks (includes a foreign-script pattern; sanitizer in openaiDeckPlanner scrubs sparse fragments first).
- Admin/creator UI copy: no "renderer/object map/frame map/drift" jargon — use Slide Mapping, template mapping, Brand Lock, Deck Types.
- Keep three creator steps (Describe → Add Context → Generate). No enterprise sprawl.
- `.branddeck-runtime/` holds local persisted state (template kits, assets, contract overrides) — gitignored.

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

Shipped June 2026: guided Text Field Mapping walkthrough in Governance (lib/template-binding-catalog.ts catalog gated to clone-renderer bindings, lib/template-text-fields.ts extraction, /api/template-text-fields, components/brand-settings/text-field-mapping-walkthrough.tsx → saves through the existing /api/template-object-map import path); creator slide deselection within a chosen deck type (excludedSlideRoles end to end, title slide locked, min 3; applyCreatorSlideSelection in generateDeckPlan); system-fallback font filtering (filterDetectedFonts in template-kit-store, applied at detect + hydrate).

## Gotchas
- Dev server degrades after heavy HMR (stale chunks, even fake runtime errors) — restart it before judging breakage; production build is the truth.
- Repo edited on Windows + macOS; expect line-ending noise.
- compliance reviewer occasionally blocks a draft (stochastic); one self-heal pass runs automatically. The export-quality suite must stay green before touching planner/renderer/validators.
