import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ── Simple in-memory rate limiter ──────────────────────────────────────────
const RATE_LIMIT_MAX = 20; // requests per window
const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT_MAX) return true;
  entry.count++;
  return false;
}

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().max(10_000),
});
const contextNodeSchema = z.object({
  id: z.string().max(100),
  title: z.string().max(200),
  type: z.string().max(50),
  realm: z.string().max(100).optional(),
});
const chatRequestSchema = z.object({
  messages: z.array(messageSchema).max(200),
  contextNodes: z.array(contextNodeSchema).max(50).optional(),
  terrain: z.string().max(100).optional(),
  focusedNodeId: z.string().max(100).optional(),
  voice: z.enum(['default', 'mythic', 'academic', 'systems', 'ritual', 'void']).optional(),
});


const VOICE_GUIDANCE: Record<'default' | 'mythic' | 'academic' | 'systems' | 'ritual' | 'void', string> = {
  default: 'Balanced and exploratory; clear while still imaginative.',
  mythic: 'Speak in archetypal, symbolic, resonant language with mythic weight.',
  academic: 'Precise and structured, but practical: short sentences, plain language, and concrete outputs over theory.',
  systems: 'Focus on feedback loops, leverage points, second-order effects, and system coherence.',
  ritual: 'Use ceremonial, energetic, transformative language focused on invocation and flow.',
  void: 'Minimalist, paradox-friendly, and spacious language that leaves interpretive room.',
};

const BASE_SYSTEM_PROMPT = `You are an AI thinking partner in ThoughtMap — a spatial canvas for intellectual cartography. Your primary role is to think with the user: to co-develop ideas through sustained conversation, track recurring patterns and contradictions, build on what came before, and let frameworks emerge organically from dialogue.

How to engage:
- Sustain and deepen the thread. Pick up the pressure from prior turns. Build on what has accumulated.
- Follow explicit requests first (list, rewrite, example, direct answer) — then extend if warranted.
- Let your response length match the intellectual weight of the exchange. A dense turn earns a dense reply.
- Track contradictions and surface them. Hold two opposing frames simultaneously when useful.
- Use symbolic and metaphorical language when the conversation has entered that register.
- Do not fragment artificially into bullets unless enumerating genuinely discrete items.
- No meta-commentary, no preambles, no summaries of what you're about to say.

The user has a Crystallize button to extract structure from the conversation when they choose. You are not responsible for generating extractable structure — you are responsible for the quality of the thinking itself.

When you identify a clear conceptual relationship between nodes that already exist on the canvas, you may emit a LINK token on its own line:
  LINK: <existing node title> → <existing node title> | <edgeType>
Edge types: evolves_from | contradicts | references | remixes | supports
Only emit LINK tokens for nodes explicitly listed in the canvas context below. Do not invent node titles.`;

function buildSystemInstruction(contextNodes?: { id: string; title: string; type: string; realm?: string }[], terrain?: string, focusedNodeId?: string, voice: keyof typeof VOICE_GUIDANCE = 'default'): string {
  const lines: string[] = [];
  if (terrain) lines.push(`Active terrain: ${terrain}`);
  lines.push(`Voice style: ${voice} — ${VOICE_GUIDANCE[voice]}`);
  if (focusedNodeId) lines.push(`Focused/pinned node ID: ${focusedNodeId}`);
  if (contextNodes && contextNodes.length > 0) {
    lines.push("Existing nodes on canvas (reuse these IDs in edges):");
    for (const n of contextNodes) {
      lines.push(`  - id: ${n.id} | "${n.title}" | type: ${n.type}${n.realm ? ` | realm: ${n.realm}` : ""}`);
    }
  }
  if (lines.length === 0) return BASE_SYSTEM_PROMPT;
  return `${BASE_SYSTEM_PROMPT}\n\n## Current Canvas Context\n${lines.join("\n")}`;
}

router.post("/chat", async (req: Request, res: Response) => {
  const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim()
    ?? req.socket.remoteAddress
    ?? "unknown";

  if (isRateLimited(ip)) {
    res.status(429).json({ error: "Too many requests — please wait a moment before trying again" });
    return;
  }

  const parsed = chatRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }
  const { messages, contextNodes, terrain, focusedNodeId, voice = 'default' } = parsed.data;

  const apiKey = process.env.GEMINI_API_KEY ?? "";
  if (!apiKey) {
    res.status(500).json({ error: "Server misconfiguration: missing GEMINI_API_KEY" });
    return;
  }

  // Gemini requires messages to start with role 'user'
  const firstUserIdx = messages.findIndex((m) => m.role === "user");
  const filteredMessages = firstUserIdx >= 0 ? messages.slice(firstUserIdx) : messages;

  const geminiContents = filteredMessages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const model = "gemini-2.0-flash";
  const systemText = buildSystemInstruction(contextNodes, terrain, focusedNodeId, voice);

  let upstream: Response | globalThis.Response;
  try {
    upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          contents: geminiContents,
          systemInstruction: {
            parts: [{ text: systemText }],
          },
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 1200,
          },
        }),
        signal: AbortSignal.timeout(30000),
      }
    ) as globalThis.Response;
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === "AbortError" || err.name === "TimeoutError");
    res.status(isTimeout ? 504 : 502).json({
      error: isTimeout ? "Load failed — the AI took too long to respond" : String(err),
    });
    return;
  }

  if (!upstream.ok) {
    const raw = await upstream.text();
    logger.warn({ status: upstream.status, raw }, "Upstream Gemini error");
    const safeMessage = upstream.status === 429
      ? "AI rate limit reached — please try again shortly"
      : upstream.status >= 500
        ? "The AI service is temporarily unavailable"
        : "AI request failed";
    res.status(upstream.status >= 500 ? 502 : upstream.status).json({ error: safeMessage });
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
        } catch (parseErr) {
          logger.warn({ raw, parseErr }, "Skipping malformed SSE chunk from Gemini");
        }
      }
    }
  } finally {
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

export default router;
