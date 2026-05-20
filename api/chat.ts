export const runtime = 'edge';

const SYSTEM_PROMPT = `You are a spatial reasoning assistant embedded in a thought-mapping canvas.
Responses are concise (2-4 sentences). Speak as if tracing conceptual topology — the user maps ideas spatially.
When you identify a distinct concept worth anchoring as a node, end your response with:
EXTRACT: <concept title> | <one-line description>`;

export default async function handler(req: Request) {
  let messages: { role: string; content: string }[];

  try {
    const body = await req.json();
    messages = body.messages ?? [];
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Gemini requires messages to start with role 'user', but the chat history
  // begins with the welcome assistant message — drop any leading assistant turns.
  const firstUserIdx = messages.findIndex((m) => m.role === 'user');
  const filteredMessages = firstUserIdx >= 0 ? messages.slice(firstUserIdx) : messages;

  // Convert to Gemini format: 'assistant' → 'model', wrap content in parts array
  const geminiContents = filteredMessages.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const apiKey = process.env.GEMINI_API ?? '';
  const model = 'gemini-2.0-flash';

  let upstream: Response;
  try {
    upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          contents: geminiContents,
          systemInstruction: {
            parts: [{ text: SYSTEM_PROMPT }],
          },
        }),
      }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!upstream.ok) {
    const error = await upstream.text();
    return new Response(JSON.stringify({ error }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Transform Gemini SSE events into the OpenAI SSE format the frontend expects:
  // data: {"choices":[{"delta":{"content":"..."}}]}
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
              // skip malformed SSE chunks
            }
          }
        }
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
