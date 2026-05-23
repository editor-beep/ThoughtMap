# Prompt v2 Spec (Cartographer)

## Goals
1. Stricter JSON guarantees for extraction output.
2. Hard separation between reflection and extraction calls.
3. Deterministic edge typing.
4. Fewer parsing ambiguities between routes.

---

## 1) Endpoint and Mode Contract

Use **separate endpoints** instead of overloading a single endpoint with `mode`:

- `POST /api/cartographer/extract`
  - Purpose: structured extraction only.
  - Response type: `application/json`.
  - Never streams.
- `POST /api/cartographer/reflect`
  - Purpose: conversational/wander/reflection text only.
  - Response type: `text/event-stream` (streaming) or `application/json` with a `text` field for non-stream fallback.
  - Must never include extraction payloads.

If keeping one route for backward compatibility, require a strict discriminator:

```json
{ "kind": "extract", ... }
{ "kind": "reflect", ... }
```

Reject any payload with missing or unknown `kind`.

---

## 2) Request Schemas (strict)

### 2.1 Extract Request

```json
{
  "kind": "extract",
  "requestId": "uuid",
  "message": "string <= 10000 chars",
  "context": {
    "nodes": [
      {
        "id": "node_...",
        "title": "string",
        "type": "thought|joke|character|myth|research|canon|contradiction|artifact|fragment",
        "realms": ["humor|mythology|worldbuilding|rituals|horror|philosophy"],
        "x": 0,
        "y": 0
      }
    ],
    "activeTerrain": "memory-palace|interstellar-plane|terrestrial-globe|mythic-landscape|the-void",
    "activeRealms": ["humor|mythology|worldbuilding|rituals|horror|philosophy"]
  },
  "options": {
    "variationCount": 3,
    "allowNearZone": true,
    "strictEnums": true
  }
}
```

Validation rules:
- `additionalProperties: false` at every object level.
- `variationCount` constrained to `1..3`.
- Unknown enum values must fail fast (400), never coerced.

### 2.2 Reflect Request

```json
{
  "kind": "reflect",
  "requestId": "uuid",
  "message": "string <= 10000 chars",
  "context": {
    "nodes": [],
    "activeTerrain": "...",
    "activeRealms": []
  },
  "style": "converse|wander"
}
```

Validation rules:
- `additionalProperties: false`.
- No extraction-specific fields (`options`, `variationCount`, etc.).

---

## 3) Extraction Output Schema (deterministic JSON)

Return exactly one object matching:

```json
{
  "schemaVersion": "2.0",
  "kind": "extract.result",
  "requestId": "uuid",
  "spatialInsight": "string",
  "variations": [
    {
      "id": "var_1",
      "title": "string",
      "content": "string",
      "type": "thought|joke|character|myth|research|canon|contradiction|artifact|fragment",
      "realms": ["humor|mythology|worldbuilding|rituals|horror|philosophy"],
      "suggestedZone": {
        "kind": "center|north|south|east|west|near",
        "nodeId": "node_123"
      },
      "reasoning": "string",
      "edges": [
        {
          "sourceRef": "new:var_1|existing:node_123",
          "targetRef": "new:var_1|existing:node_456",
          "type": "supports|contradicts|references|evolves_from|remixes",
          "confidence": 0.82,
          "justification": "string"
        }
      ]
    }
  ]
}
```

Rules:
- No markdown/code fences, JSON only.
- `schemaVersion`, `kind`, and `requestId` are required.
- `edges.type` is a closed enum (deterministic typing).
- `confidence` is bounded `0..1`.
- If `suggestedZone.kind !== "near"`, omit `nodeId`.
- `sourceRef/targetRef` use explicit namespaces (`new:` vs `existing:`), removing title/id ambiguity.

---

## 4) Deterministic Edge Typing Rules

To reduce model drift, include a compact edge-typing rubric in the prompt and validate post-response:

- `supports`: downstream node strengthens or provides evidence.
- `contradicts`: downstream node disputes/inverts.
- `references`: cites or points without support/contradiction.
- `evolves_from`: derived iteration over time.
- `remixes`: recombination/hybridization.

Tie-break order when multiple seem valid:
1. contradicts
2. supports
3. evolves_from
4. remixes
5. references

Server-side post-check:
- If model emits unknown type, reject and trigger one repair pass with same requestId.
- If still invalid, return typed error (`422 EDGE_TYPE_INVALID`) rather than silently coercing.

---

## 5) Reflection Output Contract

Reflection should never be parsed as extraction.

Two safe options:
1. SSE text chunks only (`event: token`, `event: done`).
2. JSON envelope for non-stream:
   ```json
   {
     "schemaVersion": "2.0",
     "kind": "reflect.result",
     "requestId": "uuid",
     "style": "converse|wander",
     "text": "..."
   }
   ```

Prohibit fields named `variations`, `edges`, `suggestedZone` in reflect responses.

---

## 6) Prompt Templates (v2)

### 6.1 Extract System Prompt Core

- State: “You are in EXTRACT mode. Output **only** strict JSON matching the provided schema. No prose outside JSON.”
- Provide full JSON schema inline (or by reference) and enum tables.
- Require explicit `schemaVersion`, `kind`, `requestId` echo.
- Include deterministic edge rubric + tie-break order.
- Include “If uncertain, choose `references` and lower confidence.”

### 6.2 Reflect System Prompt Core

- State: “You are in REFLECT mode. Output natural language only. Do not output JSON.”
- Keep extraction nouns out of prompt body where possible to reduce bleed-through.

---

## 7) Route Ambiguity Elimination

- Preferred: split routes (`/extract`, `/reflect`).
- If single route remains:
  - Require `kind` discriminator.
  - Enforce content-type by kind:
    - extract -> `application/json`
    - reflect -> `text/event-stream` or explicit reflect envelope.
  - Add response header `x-cartographer-kind: extract.result|reflect.result`.

---

## 8) Error Model

Standardize machine-readable errors:

```json
{
  "schemaVersion": "2.0",
  "kind": "error",
  "requestId": "uuid",
  "code": "VALIDATION_ERROR|MODEL_JSON_INVALID|EDGE_TYPE_INVALID|TIMEOUT",
  "message": "human readable",
  "details": {}
}
```

No silent fallback to synthetic payloads in v2; return explicit error so clients can retry intelligently.

---

## 9) Migration Plan (v1 -> v2)

1. Add v2 schemas and validators.
2. Introduce `/extract` and `/reflect` endpoints.
3. Add `schemaVersion` and `kind` to all responses.
4. Ship compatibility layer mapping v1 fields (`suggestedZone: "near:nodeId"`) to v2 object form.
5. Deprecate v1 route after client rollout window.

---

## 10) Acceptance Tests

- Extract response always parses with `JSON.parse` and passes schema validation.
- Reflect route never emits parseable extraction object.
- Unknown edge type returns `422 EDGE_TYPE_INVALID`.
- Unknown request fields return `400 VALIDATION_ERROR`.
- Same input + same context + same model settings produces stable edge type distribution (within agreed threshold).
