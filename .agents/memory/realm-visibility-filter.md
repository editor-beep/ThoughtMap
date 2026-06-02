---
name: Realm visibility filter & orphan realm ids
description: Why Cartographer-created nodes can vanish (blank canvas) and the filter rule that prevents it
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

**Aside:** the opaque browser console line "An uncaught exception occured but the
error was not an error object" on this project is Replit's preview-harness
report of a window 'error' event with a non-serializable `event.error` (often a
cross-origin "Script error."). It appears even on the master view (no React
Flow) and is environmental noise — not necessarily an app bug.
