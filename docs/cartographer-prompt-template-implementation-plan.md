# Cartographer Prompt Template Library — Implementation Plan

## Goals
- Replace ad-hoc Cartographer prompting with a typed, reusable prompt-template library.
- Support all requested modes (extract, wander, contradiction, synthesis, edges-only, enrich, health, focus, template-loader).
- Preserve existing behavior where possible while enabling gradual rollout.

## Scope
Primary integration points:
- `artifacts/api-server/src/routes/cartographer.ts`
- (Optionally later) `artifacts/living-thought-map/src/store/index.ts` request payload shape if we add new mode/template/tone UI controls.

New module(s):
- `artifacts/api-server/src/lib/cartographerPrompts.ts`
- `artifacts/api-server/src/lib/cartographerSchemas.ts`
- `artifacts/api-server/src/lib/cartographerContext.ts` (context compression)
- `artifacts/api-server/src/lib/metaCartographer.ts` (mode/template inference)

## Phase 1 — Foundation: types + prompt library
1. **Define canonical enums and interfaces**
   - `NodeType`: `thought | myth | research | canon | contradiction | artifact | character | fragment | joke`
   - `EdgeType`: `evolves_from | contradicts | references | remixes | supports`
   - `CartographerMode` (include existing + new modes).
   - `ToneModifier`: `poetic | analytical | speculative | ruthless`.
2. **Create constant Core System Prompt**
   - Shared prefix always included first.
   - Encodes principles and JSON-output constraint.
3. **Implement `getPrompt(mode, options)`**
   - Mode-specific body templates for all 9 requested modes.
   - Optional template lens block from a template registry.
   - Optional tone suffix appended consistently.
4. **Add template pack registry**
   - `Research Map`
   - `Story Worldbuilding`
   - `Argument / Dialectic Map`
   - `Personal Reflection`
   - `Phoenix / Cultural Analysis`

## Phase 2 — Input/output contracts
1. **Expand API schema for `/cartographer`**
   - Add fields: `template`, `tone`, `focusNodeId`, `selectedElements`, `allowMetaMode`, etc.
   - Extend `mode` enum with new modes.
2. **Define per-mode output schemas**
   - `ExtractResponse`, `WanderResponse`, `ContradictionResponse`, `HealthCheckResponse`, etc.
   - Strict validation + normalized error messages when model JSON is invalid.
3. **Add parsing utilities**
   - Safe JSON extraction from model text.
   - Fallback handling + telemetry-friendly parse diagnostics.

## Phase 3 — Context compression for large maps
1. **Build context prioritizer utility**
   - Rank nodes by: `importance`, graph distance to focus area, and recency/edit activity (if available).
2. **Construct compact context bundle**
   - Include top-N nodes + key edges + local neighborhood around focus.
   - Preserve contradiction/tension candidates when mode depends on them.
3. **Token-budget policy**
   - Fixed max context token target with deterministic trimming strategy.

## Phase 4 — Route integration
1. **Refactor `buildSystemPrompt` usage**
   - Replace in-route string concatenation with `getPrompt`.
2. **Mode execution strategy**
   - Keep current streaming behavior for narrative modes.
   - Use non-stream structured JSON calls where strict schema is needed.
3. **Backward compatibility**
   - Default to `extract` + no template/tone if omitted.
   - Keep current client payload valid.

## Phase 5 — Meta-Cartographer (optional but recommended)
1. **Mode/template inference layer**
   - If user does not specify, infer best mode and template from request + map context.
2. **Deterministic guardrails**
   - Return both inferred choice and rationale.
   - Allow explicit user override to bypass inference.

## Phase 6 — Frontend enablement (incremental)
1. Add template and tone controls in UI (likely `CartographerPanel` / store actions).
2. Wire new request fields (`mode`, `template`, `tone`, `selectedElements`, `focus`).
3. Add dedicated rendering for non-extract outputs (health issues, contradiction list, edge suggestions).

## Phase 7 — Testing + observability
1. **Unit tests**
   - Prompt assembly snapshots for each mode/template/tone combination.
   - Context compression ranking behavior.
   - Meta-inference heuristics.
2. **Contract tests**
   - Validate model outputs against per-mode schemas.
3. **Route tests**
   - `/cartographer` happy path and malformed-response handling.
4. **Operational logging**
   - Log selected mode/template/tone, compression stats, parse failures.

## Suggested file-by-file rollout order
1. `artifacts/api-server/src/lib/cartographerPrompts.ts`
2. `artifacts/api-server/src/lib/cartographerSchemas.ts`
3. `artifacts/api-server/src/lib/cartographerContext.ts`
4. `artifacts/api-server/src/routes/cartographer.ts`
5. `artifacts/living-thought-map/src/store/index.ts` (when exposing controls)
6. UI components for selectors/results rendering.

## Acceptance criteria
- Every requested mode is available through one typed prompt factory.
- Core taxonomy is enforced in all prompts.
- JSON responses parse and validate reliably by mode.
- Large-map requests use compressed context with deterministic prioritization.
- Template packs and tone modifiers are selectable and auditable.
- Existing extract/wander flows continue working without client breakage.
