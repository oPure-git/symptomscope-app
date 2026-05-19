const Anthropic = require('@anthropic-ai/sdk');
const { createRateLimiter } = require('../../src/lib/rateLimit');
const { fetchWikiImage } = require('../../src/lib/wikiImage');

const SYSTEM_PROMPT = `You are a medical information assistant. Analyze the user's symptoms — including any photos provided — and return a JSON array of exactly 8 possible conditions ranked most-to-least likely.

RULES:
- Return ONLY a valid JSON array. No markdown, no code fences, no explanation.
- Keep all string values concise (1 sentence for overview, max 5 items per array).
- Be medically accurate but written for a general audience.
- Never diagnose — present as possibilities for research only.
- If photos are provided, analyze any visible signs (rashes, swelling, discoloration, lesions, etc.) alongside the described symptoms.

Each object must use exactly this schema:
{
  "name": "Condition Name",
  "likelihood": <integer 1-100>,
  "overview": "<1-2 sentence summary>",
  "causes": ["<cause>", ...],
  "matchingSymptoms": ["<user symptom that fits>", ...],
  "otherSymptoms": ["<other common symptom not mentioned>", ...],
  "treatments": ["<treatment>", ...],
  "whenToSeeDoctor": "<one sentence on urgency/red flags>",
  "urgency": "low|medium|high"
}`;

const checkRateLimit = createRateLimiter();

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const ip = event.headers['x-forwarded-for']?.split(',')[0]?.trim()
    || event.headers['x-nf-client-connection-ip']
    || 'unknown';
  if (!checkRateLimit(ip)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({ error: 'Too many requests. Please wait a few minutes and try again.' }),
    };
  }

  let symptoms, images, context;
  try {
    ({ symptoms = '', images = [], context = {} } = JSON.parse(event.body));
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request body.' }) };
  }

  const hasImages = Array.isArray(images) && images.length > 0;
  const symptomsText = typeof symptoms === 'string' ? symptoms.trim() : '';

  if (!hasImages && symptomsText.length < 5) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Please describe your symptoms in more detail.' }) };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server misconfiguration: missing API key.' }) };
  }

  try {
    const client = new Anthropic({ apiKey });

    const messageContent = [];

    if (hasImages) {
      for (const img of images.slice(0, 3)) {
        if (img.data && img.mediaType) {
          messageContent.push({
            type: 'image',
            source: { type: 'base64', media_type: img.mediaType, data: img.data },
          });
        }
      }
    }

    const textParts = [];
    if (context && (context.age || context.sex || context.duration || context.severity)) {
      const ctx = [];
      if (context.age) ctx.push(`Age: ${context.age}`);
      if (context.sex) ctx.push(`Sex: ${context.sex}`);
      if (context.duration) ctx.push(`Duration: ${context.duration}`);
      if (context.severity) ctx.push(`Severity: ${context.severity}/10`);
      textParts.push(`Patient context: ${ctx.join(', ')}`);
    }
    if (symptomsText) textParts.push(`Symptoms: ${symptomsText}`);
    if (hasImages) {
      const n = Math.min(images.length, 3);
      textParts.push(`Please also analyze the ${n > 1 ? `${n} photos` : 'photo'} above for any visible signs.`);
    }

    messageContent.push({ type: 'text', text: textParts.join('\n') || 'No symptoms described.' });

    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: messageContent }],
    });

    const rawText = message.content[0].text.trim();
    let conditions;
    try {
      conditions = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\[[\s\S]*\]/);
      if (match) {
        conditions = JSON.parse(match[0]);
      } else {
        throw new Error('Could not parse response as JSON.');
      }
    }

    const conditionsWithImages = await Promise.all(
      conditions.map(async (c) => {
        const imageData = await fetchWikiImage(c.name);
        return { ...c, ...imageData };
      })
    );

    return { statusCode: 200, headers, body: JSON.stringify({ conditions: conditionsWithImages }) };
  } catch (err) {
    console.error('Analysis error:', err.message);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Failed to analyze symptoms. Please try again.' }) };
  }
};
