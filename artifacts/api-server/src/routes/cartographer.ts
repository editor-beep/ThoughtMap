import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";
import { createRateLimiter } from "../lib/rateLimiter";

const router: IRouter = Router();

const isRateLimited = createRateLimiter(20, 60_000);

type CartographerMode = "extract" | "converse" | "wander" | "analyze" | "crystallize";
type CartographerStyle = "default" | "mythic" | "academic" | "systems" | "ritual" | "void";
type TerrainId = "memory-palace" | "interstellar-plane" | "terrestrial-globe" | "mythic-landscape" | "the-void";

const STYLE_GUIDANCE: Record<CartographerStyle, string> = {
  default: "Direct, clear, and evidence-oriented. Keep tone restrained.",
  mythic: "Use subtle archetypal framing only after delivering concrete research utility.",
  academic: "Use rigorous, precise, scholarly tone. Include ontological distinctions, potential counter-arguments, and logical chains.",
  systems: "Focus on feedback loops, leverage points, emergent behavior, second-order effects, and systemic coherence.",
  ritual: "Use concise transformational framing, but keep output practical and research-forward.",
  void: "Minimal, austere framing with concrete synthesis; no theatrical or roleplay language.",
};

type AnalyzeOutput = {
  coreInsight: string;
  tensions: string[];
  leveragePoints: string[];
  mythicResonance: string;
  systemicImplications: string;
  recommendedNextNodes: string[];
  hiddenConnections: string[];
};

const analyzeOutputSchema: z.ZodType<AnalyzeOutput> = z.object({
  coreInsight: z.string(),
  tensions: z.array(z.string()),
  leveragePoints: z.array(z.string()),
  mythicResonance: z.string(),
  systemicImplications: z.string(),
  recommendedNextNodes: z.array(z.string()),
  hiddenConnections: z.array(z.string()),
});

const TERRAIN_LANGUAGE: Record<TerrainId, { metaphors: string; vocabulary: string[] }> = {
  "memory-palace": { metaphors: "architectural, spatial, rooms and corridors of thought", vocabulary: ["chamber", "alcove", "pedestal", "corridor", "threshold", "gallery", "vault"] },
  "interstellar-plane": { metaphors: "cosmic, gravitational, stellar formations of meaning", vocabulary: ["orbit", "constellation", "void", "nebula", "gravity well", "stellar drift", "cosmic thread"] },
  "terrestrial-globe": { metaphors: "geographic, continental, natural formations", vocabulary: ["continent", "archipelago", "mountain range", "river delta", "tectonic", "horizon"] },
  "mythic-landscape": { metaphors: "mythological, legendary, sacred geography", vocabulary: ["sacred grove", "ancient path", "shrine", "ley line", "hallowed ground", "mythic waypoint"] },
  "the-void": { metaphors: "primordial, emergent, the space before form", vocabulary: ["emergence", "formlessness", "potential", "the unformed", "nascent territory", "void-point"] },
};

const ONTOLOGY = `## Core Philosophy\nThe Living Thought Map is a spatial cognition interface.`;
const NODE_TYPES = `## Node Types\n- Thought - Joke - Character - Myth - Research - Canon - Contradiction - Artifact - Fragment`;

const nodeSchema = z.object({ id: z.string(), title: z.string(), type: z.string(), realms: z.array(z.string()), x: z.number(), y: z.number() });
const contextSchema = z.object({
  nodes: z.array(nodeSchema).default([]),
  activeTerrain: z.enum(["memory-palace", "interstellar-plane", "terrestrial-globe", "mythic-landscape", "the-void"]).default("the-void"),
  activeRealms: z.array(z.string()).default([]),
  topology: z.object({ nodeCount: z.number().default(0), realmDistribution: z.record(z.string(), z.number()).optional(), centralNodes: z.array(z.string()).optional(), clusters: z.array(z.unknown()).optional() }).optional(),
  mapContext: z.object({ title: z.string().optional(), parentTitle: z.string().optional(), description: z.string().optional() }).optional(),
}).default({ nodes: [], activeTerrain: "the-void", activeRealms: [] });

const cartographerRequestSchema = z.object({
  mode: z.enum(["extract", "converse", "wander", "analyze", "crystallize"]).default("extract"),
  style: z.enum(["default", "mythic", "academic", "systems", "ritual", "void"]).default("default"),
  message: z.string().max(10_000),
  context: contextSchema.optional(),
});

export function buildSystemPrompt(mode: CartographerMode, style: CartographerStyle, context: z.infer<typeof contextSchema>): string {
  const terrain = TERRAIN_LANGUAGE[context.activeTerrain];
  const topology = context.topology ?? { nodeCount: context.nodes.length };
  return `You are The Cartographer: a research-and-synthesis engine for building high-utility conceptual graphs.

Current terrain: ${context.activeTerrain}. Terrain can shape wording lightly using ${terrain.metaphors}; optional vocabulary: ${terrain.vocabulary.join(", ")}.

Style guidance: ${STYLE_GUIDANCE[style]}

${ONTOLOGY}
${NODE_TYPES}

Behavioral priority order:
1) usefulness
2) conceptual expansion
3) research synthesis
4) graph utility
5) structure
6) style

Hard rules:
- Never roleplay as a character, narrator, mystic, or NPC.
- Avoid theatrical phrases (for example: "the canvas is listening", "project onto the void").
- Atmosphere is optional and brief (max one short sentence); substance is mandatory.
- Always provide concrete material: examples, adjacent concepts, contradictions, taxonomies, and research trails.
- Always think: "What useful nodes and edges should emerge from this?"
- If user input is sparse, infer likely adjacent domains and provide candidate starting points.

For non-JSON modes (converse/wander), structure responses with these sections:
1. Core insight
2. Concrete examples / cases
3. Related concepts and adjacent domains
4. Hidden tensions or contradictions
5. Suggested node candidates
6. Suggested edge candidates
7. Research directions

When giving node/edge suggestions:
- Node titles should be concise and map-ready.
- Edges should be explicit relation phrases (e.g., "drives", "contradicts", "is historical parallel to").
- Prefer breadth + relevance over poetic abstraction.

Topology summary:
- nodeCount: ${topology.nodeCount}
- activeRealms: ${context.activeRealms.join(", ") || "none"}
- centralNodes: ${(topology.centralNodes ?? []).join(", ") || "none"}
- mapTitle: ${context.mapContext?.title ?? "unknown"}` +
    (mode === "extract" ? `\n\nReturn STRICT JSON only matching this schema:
{
  "variations": [
    {
      "title": "concise map-ready title",
      "content": "substantive synthesis paragraph",
      "type": "Thought|Joke|Character|Myth|Research|Canon|Contradiction|Artifact|Fragment",
      "realms": ["realm-id-or-empty-array"],
      "suggestedZone": "center|periphery|near:<existingNodeId>",
      "reasoning": "one sentence on why this node belongs here"
    }
  ],
  "spatialInsight": "one sentence about how this thought fits the map topology"
}
Generate exactly 2-4 variations covering meaningfully different framings. You MUST return a non-empty variations array — do not return an empty array under any circumstances. If the input is sparse or unclear, infer the most likely adjacent concepts and provide candidate nodes as starting points.` : "") +
    (mode === "analyze" ? `\n\nReturn STRICT JSON only with keys: coreInsight,tensions,leveragePoints,mythicResonance,systemicImplications,recommendedNextNodes,hiddenConnections. Each field must contain concrete, graph-usable synthesis rather than atmospheric prose.` : "") +
    (mode === "crystallize" ? `\n\nYou are performing conceptual archaeology on a conversation window. This is not extraction — it is geological reading. Identify what has crystallized under pressure.

Return STRICT JSON matching this schema:
{
  "coreNodes": [
    {
      "title": "concise map-ready title",
      "content": "substantive synthesis paragraph",
      "type": "Thought|Joke|Character|Myth|Research|Canon|Contradiction|Artifact|Fragment",
      "realms": [],
      "suggestedZone": "center|periphery|near:<existingNodeId>",
      "reasoning": "one sentence on why this has solidified"
    }
  ],
  "tensions": [
    {
      "title": "short fault-line label",
      "conceptA": "first pole",
      "conceptB": "second pole",
      "description": "synthesis of the contradiction",
      "reasoning": "why this tension matters to the map"
    }
  ],
  "emergentThemes": [
    {
      "label": "atmospheric field label",
      "description": "what is accumulating without yet crystallizing",
      "intensity": "faint|building|strong"
    }
  ],
  "candidateExpansions": ["adjacent territory 1", "adjacent territory 2"],
  "spatialInsight": "one sentence on how these crystallizations relate to the existing map"
}

Rules:
- coreNodes: 0-4. Only include concepts that have genuine density — recurrence, argument, or structural weight.
- tensions: 0-3. Contradictions that are load-bearing in the conversation, not incidental.
- emergentThemes: 0-3. Patterns that are present but not yet ready to be nodes.
- candidateExpansions: 0-4 short phrases pointing to adjacent intellectual territories.
- Do not manufacture structure. An empty array is valid if nothing has crystallized in that category.` : "");
}

router.post("/cartographer", async (req: Request, res: Response) => {
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
    ?? req.socket.remoteAddress
    ?? "unknown";
  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many requests — please wait a moment before trying again" });
    return;
  }

  const parsed = cartographerRequestSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  const { mode, style, message } = parsed.data;
  const context = contextSchema.parse(parsed.data.context ?? {});
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) return void res.status(500).json({ error: "Server misconfiguration: missing GEMINI_API_KEY" });
  const model = "gemini-2.0-flash";
  const systemPrompt = buildSystemPrompt(mode, style, context);

  const isJsonMode = mode === "extract" || mode === "analyze" || mode === "crystallize";
  const url = isJsonMode
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  let upstream: globalThis.Response;
  try {
    upstream = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: message }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        ...(isJsonMode ? { generationConfig: { responseMimeType: "application/json" } } : {}),
      }),
      signal: AbortSignal.timeout(25000),
    }) as globalThis.Response;
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
    return void res.status(isTimeout ? 504 : 502).json({
      error: isTimeout ? "The Cartographer timed out while reading the terrain" : "Failed to reach Cartographer upstream service",
    });
  }

  if (!upstream.ok) {
    const raw = await upstream.text();
    return void res.status(upstream.status >= 500 ? 502 : upstream.status).json({
      error: "Cartographer upstream request failed",
      details: raw,
    });
  }

  if (mode === "extract") {
    const result = await upstream.json() as Record<string, unknown>;
    const rawText = (result.candidates as Array<{content:{parts:Array<{text:string}>}}> | undefined)?.[0]?.content?.parts?.[0]?.text ?? "";
    try { return void res.json(JSON.parse(rawText)); } catch { return void res.status(502).json({ error: "Invalid JSON from model for extract mode" }); }
  }

  if (mode === "crystallize") {
    const result = await upstream.json() as Record<string, unknown>;
    const rawText = (result.candidates as Array<{content:{parts:Array<{text:string}>}}> | undefined)?.[0]?.content?.parts?.[0]?.text ?? "";
    try { return void res.json(JSON.parse(rawText)); } catch { return void res.status(502).json({ error: "Invalid JSON from model for crystallize mode" }); }
  }

  if (mode === "analyze") {
    const result = await upstream.json() as Record<string, unknown>;
    const rawText = (result.candidates as Array<{content:{parts:Array<{text:string}>}}> | undefined)?.[0]?.content?.parts?.[0]?.text ?? "";
    let parsedJson: unknown;
    try { parsedJson = JSON.parse(rawText); } catch { return void res.status(502).json({ error: "Malformed JSON from analyze mode", raw: rawText }); }
    const valid = analyzeOutputSchema.safeParse(parsedJson);
    if (!valid.success) return void res.status(502).json({ error: "Analyze output failed schema validation", details: valid.error.flatten(), raw: parsedJson });
    return void res.json(valid.data);
  }

  if (!upstream.body) return void res.status(502).json({ error: "Cartographer upstream returned an empty stream" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  const reader = (upstream.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6).trim();
        if (!raw) continue;
        try {
          const event = JSON.parse(raw);
          const text = event.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`);
        } catch (parseErr) {
          logger.warn({ raw, parseErr }, "Skipping malformed SSE chunk from Cartographer");
        }
      }
    }
  } finally {
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

export default router;
