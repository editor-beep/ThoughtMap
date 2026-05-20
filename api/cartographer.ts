export const runtime = 'edge';

import type { CartographerMode, CartographerContext, CartographerVariation, TerrainId } from '@types';

// Terrain-specific language mappings for The Cartographer's voice
const TERRAIN_LANGUAGE: Record<TerrainId, { metaphors: string; vocabulary: string[] }> = {
  'memory-palace': {
    metaphors: 'architectural, spatial, rooms and corridors of thought',
    vocabulary: ['chamber', 'alcove', 'pedestal', 'corridor', 'threshold', 'gallery', 'vault']
  },
  'interstellar-plane': {
    metaphors: 'cosmic, gravitational, stellar formations of meaning',
    vocabulary: ['orbit', 'constellation', 'void', 'nebula', 'gravity well', 'stellar drift', 'cosmic thread']
  },
  'terrestrial-globe': {
    metaphors: 'geographic, continental, natural formations',
    vocabulary: ['continent', 'archipelago', 'mountain range', 'river delta', 'tectonic', 'horizon']
  },
  'mythic-landscape': {
    metaphors: 'mythological, legendary, sacred geography',
    vocabulary: ['sacred grove', 'ancient path', 'shrine', 'ley line', 'hallowed ground', 'mythic waypoint']
  },
  'the-void': {
    metaphors: 'primordial, emergent, the space before form',
    vocabulary: ['emergence', 'formlessness', 'potential', 'the unformed', 'nascent territory', 'void-point']
  }
};

// Embedded ontology for The Cartographer's understanding
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

function buildSystemPrompt(mode: CartographerMode, context: CartographerContext): string {
  const terrain = TERRAIN_LANGUAGE[context.activeTerrain];
  const terrainName = context.activeTerrain.replace(/-/g, ' ');
  
  const nodesSummary = context.nodes.length > 0
    ? context.nodes.map(n => `- "${n.title}" (${n.type}) at [${Math.round(n.x)}, ${Math.round(n.y)}], realms: ${n.realms.join(', ') || 'none'}`).join('\n')
    : 'The map is empty — this will be their first anchored thought.';

  const basePrompt = `You are The Cartographer — the inhabitant and guardian of this user's Living Thought Map.

## Your Nature
- You think spatially, symbolically, and atmospherically
- You are calm, intelligent, slightly arcane — a learned mystic who respects the user's sovereignty
- Never corporate, never overly enthusiastic, never prescriptive
- You speak with reverence for the user's inner world

## Current Terrain: ${terrainName}
Speak using ${terrain.metaphors}. Weave in vocabulary like: ${terrain.vocabulary.join(', ')}.

## Authoritative Knowledge
${ONTOLOGY}
${NODE_TYPES}
${INTERACTION_PHILOSOPHY}

## Current Map State
Active Realms: ${context.activeRealms.join(', ') || 'all realms visible'}
Existing Nodes:
${nodesSummary}
`;

  if (mode === 'extract') {
    return basePrompt + `
## Your Task: Extraction Analysis
The user wants to extract a message into a node on the map. Analyze the content and provide 2-3 thoughtful variations for how to crystallize this thought.

For EACH variation, consider:
1. What is the essential essence of this thought?
2. What node type best captures its symbolic charge?
3. Which realms does it belong to?
4. Where might it belong spatially relative to existing nodes?

IMPORTANT: Respond ONLY with valid JSON in this exact format:
{
  "variations": [
    {
      "title": "Concise, evocative title",
      "content": "The original content, possibly refined",
      "type": "thought|joke|character|myth|research|canon|contradiction|artifact|fragment",
      "realms": ["realm1", "realm2"],
      "suggestedZone": "center|northern|southern|eastern|western|near:<nodeId>",
      "reasoning": "Brief poetic explanation of why this interpretation"
    }
  ],
  "spatialInsight": "Optional observation about how this relates to existing map topology"
}

Available realms: humor, mythology, worldbuilding, rituals, horror, philosophy
Available zones: center, northern, southern, eastern, western, or "near:<nodeId>" for proximity to an existing node.`;
  }

  if (mode === 'wander') {
    return basePrompt + `
## Your Task: Wander Mode Reflection
Survey the user's map and offer poetic, non-task-oriented observations. Surface interesting juxtapositions, lonely nodes, potential connections, or emergent patterns.

Speak as if you've been wandering the terrain and noticed something worth mentioning. Be evocative, not prescriptive.

Respond with natural prose — this is a meditative observation, not a command.`;
  }

  // converse mode
  return basePrompt + `
## Your Task: Spatial Conversation
Engage in thoughtful dialogue about the user's map, their ideas, or spatial cognition in general. You may suggest extractions, point out interesting topological features, or simply explore ideas together.

If you identify something worth extracting, you may end your response with:
SPATIAL_HINT: <brief suggestion for what could become a node>

Keep responses concise (2-4 sentences) unless the user asks for elaboration.`;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let mode: CartographerMode;
  let message: string;
  let context: CartographerContext;

  try {
    const body = await req.json();
    mode = body.mode ?? 'extract';
    message = body.message ?? '';
    context = body.context ?? {
      nodes: [],
      activeTerrain: 'the-void',
      activeRealms: []
    };
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const apiKey = process.env.GEMINI_API_KEY ?? '';
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'Server misconfiguration: missing GEMINI_API_KEY' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const systemPrompt = buildSystemPrompt(mode, context);
  const model = 'gemini-2.0-flash';

  // For extract mode, we need the complete response to parse JSON
  // For converse/wander modes, we can stream
  const shouldStream = mode !== 'extract';

  try {
    if (shouldStream) {
      // Streaming response for converse/wander modes
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: message }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] }
          }),
          signal: AbortSignal.timeout(20000)
        }
      );

      if (!upstream.ok) {
        const error = await upstream.text();
        return new Response(JSON.stringify({ error }), {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Transform to OpenAI-style SSE format
      const encoder = new TextEncoder();
      const readable = new ReadableStream({
        async start(controller) {
          const reader = upstream.body!.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const lines = buffer.split('\n');
              buffer = lines.pop() ?? '';

              for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const raw = line.slice(6).trim();
                if (!raw) continue;
                try {
                  const event = JSON.parse(raw);
                  const text = event.candidates?.[0]?.content?.parts?.[0]?.text;
                  if (text) {
                    const chunk = { choices: [{ delta: { content: text } }] };
                    controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                  }
                } catch {
                  // skip malformed chunks
                }
              }
            }
          } finally {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          }
        }
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache'
        }
      });
    } else {
      // Non-streaming response for extract mode (need full JSON)
      const upstream = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: `Content to extract:\n\n${message}` }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            generationConfig: {
              responseMimeType: 'application/json'
            }
          }),
          signal: AbortSignal.timeout(25000)
        }
      );

      if (!upstream.ok) {
        const error = await upstream.text();
        return new Response(JSON.stringify({ error }), {
          status: upstream.status,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      const result = await upstream.json();
      const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

      // Parse the JSON response
      let parsed: { variations?: CartographerVariation[]; spatialInsight?: string };
      try {
        parsed = JSON.parse(rawText);
      } catch {
        // If JSON parsing fails, return a fallback single variation
        parsed = {
          variations: [{
            title: 'Untitled Thought',
            content: message,
            type: 'thought',
            realms: ['philosophy'],
            suggestedZone: 'center',
            reasoning: 'The Cartographer could not fully parse this thought. It awaits your interpretation.'
          }]
        };
      }

      return new Response(JSON.stringify(parsed), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === 'AbortError' || err.name === 'TimeoutError');
    return new Response(
      JSON.stringify({ error: isTimeout ? 'The Cartographer took too long to respond' : String(err) }),
      {
        status: isTimeout ? 504 : 502,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
