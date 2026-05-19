# Living Thought Map Implementation Plan

## Scope Reviewed
This plan is based on `entirerepo.md`, which outlines a full monorepo implementation for a React + TypeScript + Tailwind + Zustand application with shared packages and documentation.

## Target File Set

### Workspace and Tooling
1. `package.json`
2. `apps/web/vite.config.ts`
3. `apps/web/tailwind.config.js`
4. `apps/web/index.html`

### Shared Packages
5. `packages/types/src/index.ts`
6. `packages/core/src/store.ts`

### Web App Entry and Styling
7. `apps/web/src/main.tsx`
8. `apps/web/src/index.css`
9. `apps/web/src/App.tsx`

### UI Components
10. `apps/web/src/components/ContextHistoryRail.tsx`
11. `apps/web/src/components/SpatialCanvas.tsx`
12. `apps/web/src/components/CustomThoughtNode.tsx`
13. `apps/web/src/components/ThoughtStreamRail.tsx`

### Domain Documentation
14. `docs/ontology.md`
15. `docs/node-types.md`
16. `docs/interaction-philosophy.md`

## Proposed Execution Plan

### Phase 1 — Bootstrap repository structure
- Create workspace directories (`apps/web`, `packages/core`, `packages/types`, `docs`).
- Add root workspace `package.json` and web build config files.
- Ensure path aliases in Vite align with package directory layout.

### Phase 2 — Define shared domain model
- Implement `packages/types/src/index.ts` first.
- Add all core types (`NodeType`, `EdgeType`, `ThoughtNode`, `ThoughtEdge`, `Realm`, `ChatMessage`) so downstream files compile against a stable contract.

### Phase 3 — Implement Zustand spatial state machine
- Build `packages/core/src/store.ts` using the shared types.
- Implement state slices:
  - nodes / edges
  - realms
  - chat history / streaming flags
- Implement actions and invariants in this order:
  1. `addNode`
  2. `updateNodePosition`
  3. `addEdge`
  4. `toggleRealm`
  5. `sendChatMessage` (stream-ready async path)
  6. `extractToMap`

### Phase 4 — Compose web app shell
- Create `main.tsx`, `index.css`, and `App.tsx`.
- Wire global styling and dark theme tokens.
- Set high-level layout regions for rails + spatial canvas.

### Phase 5 — Implement feature components
- Build each component with clear ownership:
  - `SpatialCanvas.tsx`: React Flow integration and drag/update interactions.
  - `CustomThoughtNode.tsx`: node rendering and type/realm presentation.
  - `ThoughtStreamRail.tsx`: chat stream, input, and extraction actions.
  - `ContextHistoryRail.tsx`: context timeline/history affordance.
- Integrate components into `App.tsx` once each compiles independently.

### Phase 6 — Author documentation
- Add docs that codify taxonomy and interaction model:
  - `ontology.md`
  - `node-types.md`
  - `interaction-philosophy.md`

### Phase 7 — Verify and harden
- Install dependencies.
- Run lint/build.
- Start local dev server and validate:
  - node creation
  - edge linking
  - node drag + persistence in state
  - chat message flow and map extraction path

## Implementation Notes / Risks
- `@types` alias may conflict conceptually with TypeScript conventions; keep alias consistent with Vite config and imports from the spec.
- `crypto.randomUUID()` requires modern browser/runtime support; acceptable for Vite targets but should be documented.
- React Flow node/edge typing should be aligned early to avoid conversion churn.

## Definition of Done
- All 16 outlined files are present and coherent with the architecture in `entirerepo.md`.
- Project installs and runs via workspace scripts.
- Core state operations and component integration compile without type errors.
- Documentation reflects implemented behavior.
