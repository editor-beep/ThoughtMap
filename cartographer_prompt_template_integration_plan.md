# Cartographer Prompt Template Integration Plan

## Goal
Integrate the new Cartographer prompt template kit (base + mode-specific templates) into the existing ThoughtMap architecture with minimal risk, strict JSON reliability for extraction paths, and room for future style/voice modifiers.

## Current State (as of 2026-05-23)
- Frontend store calls a single API route (`POST /api/cartographer`) with `mode` currently set to `extract` or `wander`. `converse` is also supported server-side.
- Server-side prompt construction is currently in `artifacts/api-server/src/routes/cartographer.ts` via `buildSystemPrompt(mode, context)`.
- `extract` currently expects `variations + spatialInsight`; `wander/converse` currently stream prose.
- Existing spec guidance for split extract vs reflect behavior exists in `docs_prompt_v2_spec.md`.

## Integration Approach

### Phase 1 — Prompt Template System Foundation
1. **Create `promptTemplates.ts` in API server**
   - Add a centralized template registry with:
     - `BASE_SYSTEM_PROMPT`
     - `extract`
     - `wander`
     - `contradiction`
     - `synthesize`
     - `connect`
     - `research_populate`
   - Keep placeholders explicit: `{{CHAT_TEXT}}`, `{{MAP_CONTEXT}}`, `{{SELECTED_NODES_OR_CONTRADICTION}}`, `{{TITLE}}`, `{{CONTENT}}`.
2. **Define template typing**
   - Add `PromptMode` union and per-mode variable contracts.
   - Add `style` union (e.g., `default | poetic | rigorous | speculative`) as optional modifier.
3. **Add a deterministic renderer**
   - `renderPrompt(mode, params)` that:
     - validates required placeholders,
     - injects context safely,
     - appends style guidance only when provided.

### Phase 2 — Context Compression + Serialization
1. **Add context reducer utility** (`contextCompression.ts`)
   - Include:
     - nodes within 2–3 hops of active node(s),
     - high-importance nodes,
     - explicit contradictions,
     - lightweight edge summaries.
2. **Canonical map summary format**
   - Emit predictable block structure used by all templates.
3. **Token guardrails**
   - Hard cap summary length and degrade gracefully (drop low-importance peripheral nodes first).

### Phase 3 — API Contract Expansion
1. **Evolve request schema**
   - Expand `mode` from `extract|converse|wander` to include:
     - `contradiction`
     - `synthesize`
     - `connect`
     - `research_populate`
   - Add optional fields:
     - `style`
     - `selectedNodesOrContradiction`
     - `researchNode` (`title`, `content`)
2. **Output schemas by mode (Zod)**
   - Introduce strict response schemas for each JSON mode.
   - Maintain existing `extract` contract initially for backward compatibility, then migrate gradually.
3. **Route strategy decision**
   - Preferred: split endpoints:
     - `POST /api/cartographer/extract` (JSON-only)
     - `POST /api/cartographer/reflect` (streamed prose for wander/converse)
     - Optional additional structured endpoints for contradiction/synthesis/connect/research.
   - Transitional option: keep single endpoint with `kind` discriminator.

### Phase 4 — Frontend Wiring
1. **Store updates** (`artifacts/living-thought-map/src/store/index.ts`)
   - Add API wrappers for each mode.
   - Preserve existing extract UX and Wander panel behavior.
2. **New UX entry points**
   - Contradiction scanner action from map/inspector.
   - Synthesis action for selected tension pair.
   - Connection-suggester quick action.
   - Research node enrichment action from node detail panel.
3. **Style modifier UX**
   - Lightweight selector on Cartographer panel (default/poetic/rigorous/speculative).

### Phase 5 — Validation, Safety, and Fallbacks
1. **Strict post-response validation**
   - Validate all JSON against Zod before returning to UI.
2. **Self-healing parser path**
   - One repair pass for malformed JSON (if model returns close-to-valid output).
3. **Safe fallback payloads**
   - Return minimally valid defaults per mode rather than generic failures.
4. **Telemetry**
   - Log mode, token/latency, validation pass/fail, fallback usage.

### Phase 6 — Rollout Plan
1. **Feature flag** (`CARTOGRAPHER_PROMPTS_V3`)
   - Run new template system in shadow mode first for extract/wander.
2. **A/B quality check**
   - Compare acceptance/application rates of extracted suggestions.
3. **Incremental enablement**
   - Enable extract → wander → connect/contradiction → synthesis/research.

## Proposed File-Level Change List
- `artifacts/api-server/src/routes/cartographer.ts`
  - Replace inline prompt assembly with template renderer.
  - Expand mode handling and schema validation.
- `artifacts/api-server/src/cartographer/promptTemplates.ts` (new)
  - Contains base + all mode templates.
- `artifacts/api-server/src/cartographer/contextCompression.ts` (new)
  - Context filtering/summarization helpers.
- `artifacts/api-server/src/cartographer/schemas.ts` (new)
  - Mode-specific request/response zod schemas.
- `artifacts/living-thought-map/src/store/index.ts`
  - Add actions/API calls for new modes + style param.
- `docs_prompt_v2_spec.md`
  - Add v3 template matrix and endpoint contract updates.

## Acceptance Criteria
- All JSON-producing modes return schema-valid JSON ≥99% in staging.
- Existing extract and wander experiences remain intact for users under default settings.
- Context payload size remains bounded and does not regress p95 latency.
- New modes are accessible through UI actions with clear user intent boundaries.

## Test Plan
- Unit tests:
  - template rendering,
  - placeholder coverage,
  - context compression,
  - output schema validation per mode.
- Integration tests:
  - API route behavior per mode,
  - fallback behavior on malformed model output,
  - streaming behavior for reflect modes.
- UI checks:
  - extract flow,
  - wander flow,
  - contradiction/synthesis/connect/research actions.

## Risks & Mitigations
- **Risk:** Prompt complexity lowers extraction reliability.
  - **Mitigation:** Keep extraction prompt strict and compact, move reflective language to non-extract modes.
- **Risk:** Too much map context causes latency/cost spikes.
  - **Mitigation:** hop-based compression + token cap.
- **Risk:** Backward compatibility issues with current suggestion panel.
  - **Mitigation:** keep legacy extract response adapter during migration.

## Suggested Implementation Order (1 sprint)
1. Extract template module + renderer.
2. Context compression utility.
3. Schema layer for new modes.
4. Server route integration with feature flag.
5. Frontend style param + one new mode (`connect`) as pilot.
6. Remaining modes and UI affordances.
