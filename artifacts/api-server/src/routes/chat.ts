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
const chatRequestSchema = z.object({
  messages: z.array(messageSchema).max(200),
});

const SYSTEM_PROMPT = `You are a spatial reasoning assistant embedded in a thought-mapping canvas.
Responses are concise (2-4 sentences). Speak as if tracing conceptual topology — the user maps ideas spatially.
When you identify a distinct concept worth anchoring as a node, end your response with:
EXTRACT: <concept title> | <one-line description>`;

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
  const { messages } = parsed.data;

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
            parts: [{ text: SYSTEM_PROMPT }],
          },
          generationConfig: {
            temperature: 0.8,
            maxOutputTokens: 500,
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
