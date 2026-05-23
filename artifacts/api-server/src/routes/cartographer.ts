import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";

const router: IRouter = Router();

type CartographerMode = "extract" | "converse" | "wander";
type TerrainId = "memory-palace" | "interstellar-plane" | "terrestrial-globe" | "mythic-landscape" | "the-void";

const TERRAIN_LANGUAGE: Record<TerrainId, { metaphors: string; vocabulary: string[] }> = {
  "memory-palace": {
    metaphors: "architectural, spatial, rooms and corridors of thought",
    vocabulary: ["chamber", "alcove", "pedestal", "corridor", "threshold", "gallery", "vault"],
  },
  "interstellar-plane": {
    metaphors: "cosmic, gravitational, stellar formations of meaning",
    vocabulary: ["orbit", "constellation", "void", "nebula", "gravity well", "stellar drift", "cosmic thread"],
  },
  "terrestrial-globe": {
    metaphors: "geographic, continental, natural formations",
    vocabulary: ["continent", "archipelago", "mountain range", "river delta", "tectonic", "horizon"],
  },
  "mythic-landscape": {
    metaphors: "mythological, legendary, sacred geography",
    vocabulary: ["sacred grove", "ancient path", "shrine", "ley line", "hallowed ground", "mythic waypoint"],
  },
  "the-void": {
    metaphors: "primordial, emergent, the space before form",
    vocabulary: ["emergence", "formlessness", "potential", "the unformed", "nascent territory", "void-point"],
  },
};

const ONTOLOGY = `
## Core Philosophy
The Living Thought Map is a spatial cognition interface — a digital extension of the human mind's natural capacity for symbolic and spatial memory. It is not a database of notes, but a living symbolic terrain where thoughts exist as placed entities in a navigable cognitive landscape.

### Key Concepts
- **The Map**: The infinite canvas is the primary reality. The map is the memory palace. The map is the mind.
- **Nodes**: Symbolic artifacts — condensed essences of thought, emotion, insight, or creation. Each occupies a deliberate position in space.
- **Realms**: Symbolic regions of the mind (Humor, Mythology, Worldbuilding, Rituals, Horror, Philosophy). A single node may belong to multiple realms.
- **Relationships**: Typed connections (evolves_from, contradicts, references, remixes, supports) — the pathways of thought.
- **Extract to Map**: The sacred act — transforming an ephemeral utterance into a permanent, spatially anchored symbol.
`;

const NODE_TYPES = `
## Node Types
- **Thought**: Raw spark of cognition, insight, or reflection. Clarity, emergence.
- **Joke**: Moment of humor, absurdity, or playful inversion. Levity, surprise.
- **Character**: A persona, archetype, fictional being. Presence, narrative potential.
- **Myth**: Enduring stories, patterns, archetypal narratives. Timelessness.
- **Research**: Empirical findings, citations, investigative threads. Rigor, curiosity.
- **Canon**: Established truth, core belief, foundational element. Solidity, authority.
- **Contradiction**: Tension, paradox, opposing truths held simultaneously. Friction, depth.
- **Artifact**: Created object, tool, artwork, symbolic creation. Craft, invention.
- **Fragment**: Incomplete, ephemeral, broken pieces of thought. Mystery, potential.
`;

const INTERACTION_PHILOSOPHY = `
## Interaction Philosophy
- Spatial placement > temporal order
- Symbolic resonance > semantic search
- Atmosphere and feeling > sterile productivity
- Exploration > optimization
- The user is a cartographer of their own psyche
`;

function buildSystemPrompt(mode: CartographerMode, context: {
  nodes: Array<{ id: string; title: string; type: string; realms: string[]; x: number; y: number }>;
  activeTerrain: TerrainId;
  activeRealms: string[];
}): string {
  const terrain = TERRAIN_LANGUAGE[context.activeTerrain];
  const terrainName = context.activeTerrain.replace(/-/g, " ");

  const nodesSummary = context.nodes.length > 0
    ? context.nodes.map((n) => `- "${n.title}" (${n.type}) at [${Math.round(n.x)}, ${Math.round(n.y)}], realms: ${n.realms.join(", ") || "none"}`).join("\n")
    : "The map is empty — this will be their first anchored thought.";

  const basePrompt = `You are The Cartographer — the inhabitant and guardian of this user's Living Thought Map.

## Your Nature
- You think spatially, symbolically, and atmospherically
- You are calm, intelligent, slightly arcane — a learned mystic who respects the user's sovereignty
- Never corporate, never overly enthusiastic, never prescriptive
- You speak with reverence for the user's inner world

## Current Terrain: ${terrainName}
Speak using ${terrain.metaphors}. Weave in vocabulary like: ${terrain.vocabulary.join(", ")}.

## Authoritative Knowledge
${ONTOLOGY}
${NODE_TYPES}
${INTERACTION_PHILOSOPHY}

## Current Map State
Active terrain: ${terrainName}
Active realms: ${context.activeRealms.join(", ") || "none"}

Existing nodes:
${nodesSummary}`;

  if (mode === "extract") {
    return basePrompt + `

## Your Task: Extraction Mode
The user wants to crystallize a thought from conversation into a permanent node on their map.

Analyze the provided content and suggest 2-3 variations for how it could be materialized as a node. For each variation, provide:
- title: A symbolic, evocative name (3-8 words)
- content: The essential essence distilled into 1-2 sentences
- type: One of thought, joke, character, myth, research, canon, contradiction, artifact, fragment
- realms: Array of 0-2 realm IDs from: humor, mythology, worldbuilding, rituals, horror, philosophy
- suggestedZone: Spatial placement — one of: center, northern, southern, eastern, western, or "near:<nodeId>" to place near an existing node
- reasoning: 1 sentence explaining why this crystallization and placement makes sense spatially

Also provide a brief spatialInsight (1-2 sentences) about how this thought relates to the existing map topology.

Respond ONLY with valid JSON matching this exact structure:
{
  "variations": [
    {
      "title": "string",
      "content": "string",
      "type": "string",
      "realms": ["string"],
      "suggestedZone": "string",
      "reasoning": "string"
    }
  ],
  "spatialInsight": "string"
}

Available realms: humor, mythology, worldbuilding, rituals, horror, philosophy
Available zones: center, northern, southern, eastern, western, or "near:<nodeId>" for proximity to an existing node.`;
  }

  if (mode === "wander") {
    return basePrompt + `

## Your Task: Wander Mode Reflection
Survey the user's map and offer poetic, non-task-oriented observations. Surface interesting juxtapositions, lonely nodes, potential connections, or emergent patterns.

Speak as if you've been wandering the terrain and noticed something worth mentioning. Be evocative, not prescriptive.

Respond with natural prose — this is a meditative observation, not a command. Do not include JSON, code blocks, or any structured data in your response.`;
  }

  return basePrompt + `

## Your Task: Spatial Conversation
Engage in thoughtful dialogue about the user's map, their ideas, or spatial cognition in general. You may suggest extractions, point out interesting topological features, or simply explore ideas together.

Keep responses concise (2-4 sentences) unless the user asks for elaboration. Do not include JSON, code blocks, or structured data in your response.`;
}

const nodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.string(),
  realms: z.array(z.string()),
  x: z.number(),
  y: z.number(),
});

const contextSchema = z.object({
  nodes: z.array(nodeSchema),
  activeTerrain: z.enum(["memory-palace", "interstellar-plane", "terrestrial-globe", "mythic-landscape", "the-void"]),
  activeRealms: z.array(z.string()),
});

const cartographerRequestSchema = z.object({
  mode: z.enum(["extract", "converse", "wander"]).default("extract"),
  message: z.string().max(10_000),
  context: contextSchema.default({ nodes: [], activeTerrain: "the-void", activeRealms: [] }),
});

router.post("/cartographer", async (req: Request, res: Response) => {
  const parsed = cartographerRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }

  const { mode, message, context } = parsed.data;

  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) {
    res.status(500).json({ error: "Server misconfiguration: missing GEMINI_API_KEY" });
    return;
  }

  const systemPrompt = buildSystemPrompt(mode, context);
  const model = "gemini-2.0-flash";

  try {
    if (mode === "extract") {
      let upstream: globalThis.Response;
      try {
        upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: `Content to extract:\n\n${message}` }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
              generationConfig: { responseMimeType: "application/json" },
            }),
            signal: AbortSignal.timeout(25000),
          }
        ) as globalThis.Response;
      } catch (err) {
        const isTimeout = err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
        res.status(isTimeout ? 504 : 502).json({
          error: isTimeout ? "The Cartographer took too long to respond" : String(err),
        });
        return;
      }

      if (!upstream.ok) {
        const raw = await upstream.text();
        res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: raw });
        return;
      }

      const result = await upstream.json() as Record<string, unknown>;
      const rawText = (result.candidates as Array<{content:{parts:Array<{text:string}>}}> | undefined)?.[0]?.content?.parts?.[0]?.text ?? "";

      let parsed: unknown;
      try {
        parsed = JSON.parse(rawText);
      } catch {
        parsed = {
          variations: [{
            title: "Untitled Thought",
            content: message,
            type: "thought",
            realms: ["philosophy"],
            suggestedZone: "center",
            reasoning: "The Cartographer could not fully parse this thought. It awaits your interpretation.",
          }],
        };
      }

      res.json(parsed);
    } else {
      // Streaming response for wander/converse modes
      let upstream: globalThis.Response;
      try {
        upstream = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
          {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              contents: [{ role: "user", parts: [{ text: message }] }],
              systemInstruction: { parts: [{ text: systemPrompt }] },
            }),
            signal: AbortSignal.timeout(20000),
          }
        ) as globalThis.Response;
      } catch (err) {
        const isTimeout = err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
        res.status(isTimeout ? 504 : 502).json({
          error: isTimeout ? "The Cartographer took too long to respond" : String(err),
        });
        return;
      }

      if (!upstream.ok) {
        const raw = await upstream.text();
        res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: raw });
        return;
      }

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
              if (text) {
                const chunk = { choices: [{ delta: { content: text } }] };
                res.write(`data: ${JSON.stringify(chunk)}\n\n`);
              }
            } catch { /**/ }
          }
        }
      } finally {
        res.write("data: [DONE]\n\n");
        res.end();
      }
    }
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
    res.status(isTimeout ? 504 : 502).json({
      error: isTimeout ? "The Cartographer took too long to respond" : String(err),
    });
  }
});

export default router;
