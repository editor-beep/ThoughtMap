---
name: Realm visibility filter, orphan realm ids, and trackpad NaN drag
description: Why Cartographer nodes can vanish (blank canvas), the filter rule that prevents it, and the trackpad NaN drag fix
---

# Realm visibility filter (Living Thought Map web)

The spatial canvas hides a node when it belongs to a realm that is not currently
active. The Cartographer AI route is prompted to emit `realms: [...]` containing
arbitrary realm ids that frequently do NOT exist in the store's realm list.

**Rule:** a node may only be hidden by realms that actually exist in the store.
Realm ids that match no known realm ("orphan" ids, e.g. invented by the AI) must
NOT hide the node. Filter logic: visible if `realms.length === 0`, OR none of its
realms are known realms, OR at least one known realm is active.

**Why:** `addNode` only activates a realm when the node's realm id matches an
existing realm by id. AI-invented ids match nothing, so no realm activates and
the node is filtered out — with several such nodes the entire canvas goes blank
and looked like a "runtime crash." The blank state also triggered a per-frame
`console.error` flood (the `[VISIBLE NODE COLLAPSE]` diagnostic).

**How to apply:** keep any node-visibility filtering resilient to unknown realm
ids. If realm tagging from the AI should become first-class, register/activate
those realms at apply time instead — but the filter must still tolerate orphans.

# Trackpad NaN drag positions

**Symptom:** touching the MacBook trackpad causes nodes to vanish; multiple
`[INVALID DRAG POSITION]` errors fire. RF v11 fires drag events during two-finger
scroll, producing NaN positions.

**Why it broke:** the NaN guard correctly blocked bad store writes but did NOT
trigger a re-render. Without a store write, React Flow kept its internal node
state at NaN — nodes become invisible and stay that way.

**Fix:** on NaN drag stop/change, write the node's correct store position back
via `updateNodePosition(id, storeNode.x, storeNode.y)`. This triggers a
re-render that resets RF's internal state.

**Also:** `user-scalable=no` in the viewport meta interferes with pointer
coordinate APIs inside a nested iframe on macOS. Replaced with
`touch-action: none` on the canvas wrapper div (the correct RF approach).

# Opaque "uncaught exception ... not an error object" message

This line in the Replit preview console is the harness reporting a window
`error` event where `event.error === null` — i.e. a cross-origin "Script error."
from the preview iframe harness itself. Confirmed: `IS_DEV = true` but the app's
`[Runtime Error]` handler never fires (requires `event.error != null`). This is
**environmental noise, not an app bug.**
