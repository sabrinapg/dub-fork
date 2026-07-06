// ============================================================
// dub — /api/generate-brand
//
// Vercel Serverless Function. Runs server-side only.
// Reads ANTHROPIC_API_KEY from environment variables (never
// from the request body or frontend code).
//
// POST body: { imageUrl: string, vibe: string }
// Returns:   { palette: string[], typeface: string, note: string }
// ============================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed. Use POST.' });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server misconfigured: ANTHROPIC_API_KEY is not set.' });
    return;
  }

  const { imageUrl, vibe } = req.body || {};

  if (!imageUrl) {
    res.status(400).json({ error: 'Missing imageUrl in request body.' });
    return;
  }

  try {
    // Fetch the doodle image and convert to base64, since Claude's
    // vision input requires base64-encoded image data, not a URL.
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error(`Could not fetch doodle image (status ${imageResponse.status})`);
    }
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageArrayBuffer).toString('base64');
    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    const systemPrompt = `You are a brand identity assistant. You will be shown a doodle image and a requested "vibe". Analyze the doodle's visual characteristics (form, movement, density, repetition) and translate them into a brand direction.

Respond ONLY with valid JSON, no markdown formatting, no code fences, no preamble. The JSON must match this exact shape:
{
  "palette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "typeface": "a real, well-known typeface name that fits the vibe",
  "note": "one or two sentences describing why this direction fits the doodle and vibe"
}`;

    const userPrompt = `Requested vibe: "${vibe || 'no vibe specified, use your best judgment'}". Analyze the attached doodle and generate a brand direction.`;

    const anthropicResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: contentType,
                  data: imageBase64,
                },
              },
              { type: 'text', text: userPrompt },
            ],
          },
        ],
      }),
    });

    if (!anthropicResponse.ok) {
      const errText = await anthropicResponse.text();
      throw new Error(`Anthropic API error (${anthropicResponse.status}): ${errText}`);
    }

    const anthropicData = await anthropicResponse.json();
    const rawText = anthropicData.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();

    // Strip accidental markdown code fences, just in case.
    const cleanText = rawText.replace(/```json|```/g, '').trim();

    let result;
    try {
      result = JSON.parse(cleanText);
    } catch (parseErr) {
      throw new Error(`Could not parse model response as JSON: ${cleanText}`);
    }

    res.status(200).json(result);
  } catch (err) {
    console.error('generate-brand error:', err);
    res.status(500).json({ error: err.message || 'Unknown error generating brand direction.' });
  }
}
