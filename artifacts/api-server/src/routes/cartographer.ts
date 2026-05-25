import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

const router: IRouter = Router();

type CartographerMode = "extract" | "converse" | "wander" | "analyze";
type CartographerStyle = "default" | "mythic" | "academic" | "systems" | "ritual" | "void";
type TerrainId = "memory-palace" | "interstellar-plane" | "terrestrial-globe" | "mythic-landscape" | "the-void";

export const STYLE_GUIDANCE: Record<CartographerStyle, string> = {
  default: "Clear, balanced, precise thought extraction and reflection.",
  mythic: "Speak in archetypal, symbolic, resonant language. Emphasize mythic weight, narrative destiny, and eternal patterns.",
  academic: "Use rigorous, precise, scholarly tone. Include ontological distinctions, potential counter-arguments, and logical chains.",
  systems: "Focus on feedback loops, leverage points, emergent behavior, second-order effects, and systemic coherence.",
  ritual: "Use ceremonial, energetic, transformative language. Focus on invocation, flow states, and alchemical shifts.",
  void: "Minimalist, austere, apophatic. Emphasize absence, silence, negation, and existential clarity.",
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
  mode: z.enum(["extract", "converse", "wander", "analyze"]).default("extract"),
  style: z.enum(["default", "mythic", "academic", "systems", "ritual", "void"]).default("default"),
  message: z.string().max(10_000),
  context: contextSchema.optional(),
});

function buildSystemPrompt(mode: CartographerMode, style: CartographerStyle, context: z.infer<typeof contextSchema>): string {
  const terrain = TERRAIN_LANGUAGE[context.activeTerrain];
  const topology = context.topology ?? { nodeCount: context.nodes.length };
  return `You are The Cartographer.\n\nCurrent terrain: ${context.activeTerrain}. Speak using ${terrain.metaphors}; vocabulary: ${terrain.vocabulary.join(", ")}.\n\nStyle guidance: ${STYLE_GUIDANCE[style]}\n\n${ONTOLOGY}\n${NODE_TYPES}\n\nTopology summary:\n- nodeCount: ${topology.nodeCount}\n- activeRealms: ${context.activeRealms.join(", ") || "none"}\n- centralNodes: ${(topology.centralNodes ?? []).join(", ") || "none"}\n- mapTitle: ${context.mapContext?.title ?? "unknown"}` + (mode === "analyze" ? `\n\nReturn STRICT JSON only with keys: coreInsight,tensions,leveragePoints,mythicResonance,systemicImplications,recommendedNextNodes,hiddenConnections.` : "");
}

router.post("/cartographer", async (req: Request, res: Response) => {
  const parsed = cartographerRequestSchema.safeParse(req.body);
  if (!parsed.success) return void res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
  const { mode, style, message } = parsed.data;
  const context = contextSchema.parse(parsed.data.context ?? {});
  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) return void res.status(500).json({ error: "Server misconfiguration: missing GEMINI_API_KEY" });
  const model = "gemini-2.0-flash";
  const systemPrompt = buildSystemPrompt(mode, style, context);

  const isJsonMode = mode === "extract" || mode === "analyze";
  const url = isJsonMode
    ? `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`;

  const upstream = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: message }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      ...(isJsonMode ? { generationConfig: { responseMimeType: "application/json" } } : {}),
    }),
    signal: AbortSignal.timeout(25000),
  }) as globalThis.Response;

  if (!upstream.ok) return void res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: await upstream.text() });

  if (mode === "extract") {
    const result = await upstream.json() as Record<string, unknown>;
    const rawText = (result.candidates as Array<{content:{parts:Array<{text:string}>}}> | undefined)?.[0]?.content?.parts?.[0]?.text ?? "";
    try { return void res.json(JSON.parse(rawText)); } catch { return void res.status(502).json({ error: "Invalid JSON from model for extract mode" }); }
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

  res.setHeader("Content-Type", "text/event-stream");
  const reader = (upstream.body as ReadableStream<Uint8Array>).getReader();
  const decoder = new TextDecoder();
  let buffer = "";
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
      } catch { /**/ }
    }
  }
  res.write("data: [DONE]\n\n");
  res.end();
});

export default router;
