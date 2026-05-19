export const runtime = 'edge';

const SYSTEM_PROMPT = `You are a spatial reasoning assistant embedded in a thought-mapping canvas.
Responses are concise (2-4 sentences). Speak as if tracing conceptual topology — the user maps ideas spatially.
When you identify a distinct concept worth anchoring as a node, end your response with:
EXTRACT: <concept title> | <one-line description>`;

export default async function handler(req: Request) {
  const { messages } = await req.json();

  const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      stream: true,
      messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
    }),
  });

  if (!upstream.ok) {
    const error = await upstream.text();
    return new Response(JSON.stringify({ error }), {
      status: upstream.status,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
