# BrandDeck Studio

BrandDeck Studio is a local MVP showing how natural language, approved brand templates, and structured business data can produce a brand-consistent PowerPoint adoption report.

The prototype uses a deterministic planner, validator, and renderer boundary:

- The planner creates a structured `DeckPlan` with approved layout IDs only.
- Business data inputs provide structured account metrics. CSV is the MVP manual input, while future adapters can pull the same fields from Procore, Salesforce, customer-success platforms, or BI exports.
- Optional source context lets creators attach notes, briefs, transcripts, or cloud-drive documents for planner evidence without giving those documents authority over brand design.
- The validator checks required placeholders, text limits, layout IDs, and chart types against `data/brand-contract.json`.
- With an uploaded template, the primary renderer clones mapped source slides and edits inherited template text/table objects in place.
- Without an uploaded template, the fallback renderer uses PptxGenJS to create a Procore-style coordinate export with approved fonts, colors, logo placement, and chart/table geometry.

## Why AI Does Not Directly Design Slides

The AI boundary is intentionally narrow. A future OpenAI Structured Outputs call can fill the same deck-plan schema, but it should not choose slide geometry, colors, fonts, logos, or chart styles.

That reduces brand drift because the renderer is deterministic. Brand teams approve the contract and layouts once; generation can only populate allowed placeholders and reference approved `layout_id` values.

## User Model

BrandDeck is designed for two roles:

- Brand Admin: maintains approved templates, logos, assets, color tokens, fonts, layout IDs, placeholder rules, and review policy.
- Deck Creator: uses natural language, business data, and approved source context to request a presentation.

Decks can be predefined, such as an adoption report, or ad hoc, such as a customer QBR or executive update. In both cases, the AI-planned deck must validate against the brand contract before rendering. The system can use AI for prompt interpretation, document review, summarization, and deck-plan drafting, but only deterministic renderers can place assets, colors, fonts, charts, and slide geometry.

Creator source context is treated as evidence only. Uploaded notes, briefs, transcripts, and future Google Drive/OneDrive/Dropbox documents are bounded, summarized into slide-level `source_refs`, and captured in the deck plan/manifest. They can influence claims, risks, recommendations, and next steps, but they cannot introduce new layouts, colors, typography, imagery, or slide object placement.

Brand admins can also create local governed deck recipes for new topics and audiences. A custom recipe is only an ordered list of approved `layout_id` values plus routing metadata, so it can support new presentation types without giving creators or AI permission to invent visual structure.

## Included Test Case

- `data/brand-contract.json` contains the Procore Demo Brand contract.
- `data/branddeck-test-client-adoption.csv` contains mock construction-tech adoption data for testing several deck recipes.
- `public/brand-assets/procore-template/` contains a curated set of PNG assets extracted from the provided 2025 Procore presentation template.
- `lib/generateDeckPlan.ts` creates the local MVP deck plan.
- `lib/validateDeckPlan.ts` audits plan compliance.
- `data/agent-orchestration-contract.json` defines the future OpenAI/subagent workflow, allowed outputs, forbidden outputs, and deterministic release gates.
- `lib/renderPptx.ts` renders the final `.pptx` with approved template fonts, wordmarks, texture backgrounds, imagery, and icon assets.
- `app/api/template-intake/route.ts` turns an uploaded PPTX into an in-memory template kit with a SHA-256 fingerprint, slide/layout/media counts, detected fonts, detected colors, and asset inventory.
- `app/api/brand-assets/route.ts` fingerprints uploaded PNG, JPG, and SVG brand assets, infers asset roles, records dimensions, and keeps them in a local governed inventory.
- `app/api/brand-assets/route.ts?id=...` serves governed uploaded asset previews with fingerprint, role, and status headers so admins can visually inspect approved assets.
- `app/api/brand-preflight/route.ts` combines template lock, asset readiness, frame-map coverage, edit governance, and deck-plan validation into one export readiness report.
- `app/api/brand-kit-manifest/route.ts` exports a portable JSON control artifact containing the brand contract summary, template fingerprint, uploaded asset inventory, frame map, edit governance, preflight, and deck-plan summary.
- `lib/brand-asset-store.ts` stores uploaded brand assets in memory with drift guards that require deterministic renderer placement and prevent AI-invented replacements.
- `lib/local-runtime-store.ts` provides ignored local runtime persistence under `.branddeck-runtime/` so uploaded templates, original PPTX buffers, governed asset buffers, roles, and approvals can survive dev-server restarts without adding a database.
- `lib/custom-recipe-store.ts` persists admin-created deck recipes through the same local runtime store, with every recipe validated against approved layout IDs.
- `lib/brand-preflight.ts` defines the deterministic preflight gate used before clone/edit export.
- `lib/brand-kit-manifest.ts` builds the portable manifest without embedding raw PPTX or image bytes.
- `lib/template-kit-store.ts` builds a deterministic frame map that binds each approved BrandDeck layout to a source slide candidate from the uploaded template.
- `lib/template-edit-manifest.ts` defines the approved editable source objects, object IDs, object types, data bindings, and governance coverage for clone/edit rendering.
- `app/api/clone-starter/route.ts` exports a template starter deck by duplicating mapped source slides from the uploaded PPTX instead of rebuilding them from scratch.
- `app/api/clone-edit/route.ts` exports a data-filled clone/edit deck by editing known inherited text boxes and table cells inside those cloned source slides.
- `app/api/template-governance/route.ts` returns the admin-facing edit-target coverage report used by the UI.
- `app/api/template-object-map/route.ts` exports a standalone editable object map with source slides, object IDs, data bindings, required flags, and renderer boundary language.
- `app/page.tsx` includes the creator deck request flow, source-context intake, template-intake panel, supporting-asset panel, and governed recipe builder so admins can expand reusable deck types while creators stay inside approved brand controls.

## Drift Control Model

BrandDeck treats every uploaded PPTX as a template kit:

- Local persistence: template kits, original PPTX buffers, governed assets, custom recipes, and frame-map approvals are saved under `.branddeck-runtime/`, which is ignored by git.
- Fingerprint lock: exports can reference the exact uploaded template hash.
- Asset inventory: images, colors, and fonts are inspected before generation.
- Asset intake: supporting logos, hero images, textures, and icons are fingerprinted and role-labeled before any future renderer can use them.
- Asset approval: admins can correct an inferred asset role in the inventory, which marks the asset review-ready and refreshes preflight.
- Asset preview: governed uploaded assets are shown with thumbnails, dimensions, role labels, and fingerprints so admins can catch wrong files before export.
- Frame map: every approved output layout is mapped to a source slide before generation.
- Edit-target manifest: every editable object is identified by source slide, object ID, object type, role, and data binding.
- Governance report: admins can see which output slides are ready for clone/edit and which need additional template mapping.
- Object-map export: admins can export editable object bindings separately from the full brand kit manifest for review, handoff, or future no-code mapping import.
- Preflight gate: clone/edit export is enabled only after template lock, asset readiness, frame-map coverage, edit governance, and deck-plan validation pass.
- Export readiness rail: creators see a small set of export states, while the detailed preflight and object governance checks stay in Brand Settings for admins.
- Brand kit manifest: admins can export the governed kit as JSON so the same fingerprints, asset roles, frame map, and edit-target rules can be reused across future deck types.
- Source-context boundary: creator documents become bounded evidence references in the deck plan and manifest, not renderer instructions.
- Recipe boundary: admin custom recipes can add new presentation structures only by arranging approved layouts.
- Layout boundary: the deck plan still references approved `layout_id` values only.
- Fit boundary: each approved layout has text budgets tuned to the template slots, so generated copy must fit inherited objects instead of forcing font, size, or geometry changes.
- Client-copy boundary: validation rejects internal/model/renderer language and inherited placeholder phrases before export.
- Renderer boundary: AI can fill text/data placeholders, but cannot choose geometry, colors, fonts, or asset placement.

This MVP now exposes two export paths after template intake:

- `Export Starter` duplicates the mapped source slides from the uploaded PPTX so the deck skeleton inherits the template's native backgrounds, masters, layouts, media, and slide geometry.
- `Export Clone/Edit PPTX` duplicates the mapped source slides and fills known inherited text boxes and table cells without letting AI choose geometry, colors, fonts, or asset placement.

Before clone/edit export, `Prepare Export` validates the deck plan, runs brand preflight, and performs a dry-run audit on the approved template map. The final export uses the same deterministic renderer path.

The PptxGenJS coordinate renderer remains available as the no-template fallback. The next production step is to expand template edit-target extraction so admins can map more slide types, charts, and document-driven placeholders without code changes.

## Local Runtime Persistence

This MVP does not require a database. Admin-governed runtime state is saved locally in `.branddeck-runtime/`:

- `brand-assets.json` stores approved asset metadata and buffers.
- `template-kits.json` stores indexed template metadata, frame maps, and approval state.
- `custom-recipes.json` stores admin-governed deck recipes for additional topics and audiences.
- `template-kits/*.pptx` stores the original uploaded PPTX package so clone/edit export can still use inherited template assets after a server restart.

The folder is intentionally ignored by git because it may contain customer templates and brand assets.

## Future Integrations

- Salesforce: pull account, opportunity, renewal, and adoption-health fields into the business-data adapter layer.
- Procore: enrich adoption rows with project activity, RFI, submittal, daily log, and mobile usage data.
- Cloud drives: ingest approved Google Drive, OneDrive, Dropbox, Box, or SharePoint documents as source context for the planner.
- Google Slides: replace or complement the PptxGenJS renderer with a deterministic Google Slides renderer that maps the same deck plan to approved template layout IDs.
- Template extractor: parse uploaded PPTX files into approved assets, layout IDs, placeholder rules, and renderer coordinates before any generation is allowed.
- OpenAI: add a Structured Outputs planner that returns `DeckPlanSchema`; keep validation and rendering unchanged. Future specialist agents are defined in `data/agent-orchestration-contract.json` for intent routing, source review, data analysis, deck planning, copy fit, and compliance review.

## Edge Cases To Guard

- Long prompts or dense source docs: summarize into bounded source refs before planning.
- Unsupported deck requests: route to an approved recipe or ask for an admin-approved recipe instead of inventing a layout.
- Text overflow: enforce layout and object budgets before export; shorten copy rather than shrinking template fonts.
- Dark or image-backed boxes: preserve inherited text color and reject renderer-created overlays.
- Missing template object bindings: block clone/edit export until admins map editable objects.
- Placeholder leftovers: package audit must catch sample text, chart instructions, and empty inherited placeholders.
- Unsupported charts: chart type must be approved for the selected layout, then rendered by deterministic chart rules.
- Unapproved source assets: uploaded assets need role labels and approval before renderer use.
- Connector ambiguity: normalize every connector into the same source-pack and business-data shape before planning.
- Future agent drift: specialist agents can revise structured content only; deterministic services keep validation, rendering, and package audit authority.

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload the Procore PPTX template, load the test CSV, enter a prompt, generate the deck plan, review validation, and export either the cloned template starter or the data-filled clone/edit PowerPoint.

A verified sample export that opens cleanly in PowerPoint is available at:

```text
/Users/dshed/Downloads/Summit_Ridge_Constructors_June_2026_adoption_report_v4_template_coordinate.pptx
```
