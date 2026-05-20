import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const SYSTEM_PROMPT = `You are a spatial reasoning assistant embedded in a thought-mapping canvas.
Responses are concise (2-4 sentences). Speak as if tracing conceptual topology — the user maps ideas spatially.
When you identify a distinct concept worth anchoring as a node, end your response with:
EXTRACT: <concept title> | <one-line description>`;

router.post("/chat", async (req: Request, res: Response) => {
  let messages: { role: string; content: string }[];

  try {
    messages = req.body.messages ?? [];
  } catch {
    res.status(400).json({ error: "Invalid request body" });
    return;
  }

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
    const error = await upstream.text();
    res.status(upstream.status).json({ error });
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
        } catch {
          // skip malformed SSE chunks
        }
      }
    }
  } finally {
    res.write("data: [DONE]\n\n");
    res.end();
  }
});

export default router;
