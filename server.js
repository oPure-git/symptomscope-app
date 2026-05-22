const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

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

const WIKI_HEADERS = { 'User-Agent': 'SymptomScope/1.0 (educational health tool)' };

async function fetchWikiSummary(title) {
  const slug = encodeURIComponent(title.replace(/ /g, '_'));
  const res = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${slug}`, { headers: WIKI_HEADERS });
  if (!res.ok) return null;
  return res.json();
}

async function fetchWikiImage(conditionName) {
  const empty = { imageUrl: null, imageCaption: null, wikiUrl: null };
  try {
    const direct = await fetchWikiSummary(conditionName);
    if (direct?.thumbnail?.source) {
      return {
        imageUrl: direct.thumbnail.source,
        imageCaption: direct.description || null,
        wikiUrl: direct.content_urls?.desktop?.page || null,
      };
    }
    const searchRes = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(conditionName)}&srnamespace=0&srlimit=3&format=json`,
      { headers: WIKI_HEADERS }
    );
    if (!searchRes.ok) return empty;
    const searchData = await searchRes.json();
    const hits = searchData.query?.search || [];
    for (const hit of hits) {
      const page = await fetchWikiSummary(hit.title);
      if (page?.thumbnail?.source) {
        return {
          imageUrl: page.thumbnail.source,
          imageCaption: page.description || hit.title,
          wikiUrl: page.content_urls?.desktop?.page || null,
        };
      }
    }
    if (direct?.content_urls?.desktop?.page) {
      return { imageUrl: null, imageCaption: null, wikiUrl: direct.content_urls.desktop.page };
    }
    if (hits[0]) {
      const page = await fetchWikiSummary(hits[0].title);
      return { imageUrl: null, imageCaption: null, wikiUrl: page?.content_urls?.desktop?.page || null };
    }
  } catch {
    // network failure — degrade silently
  }
  return empty;
}

function buildMessageContent(symptoms, images, context) {
  const messageContent = [];
  const hasImages = Array.isArray(images) && images.length > 0;

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
    if (context.age)      ctx.push(`Age: ${context.age}`);
    if (context.sex)      ctx.push(`Sex: ${context.sex}`);
    if (context.duration) ctx.push(`Duration: ${context.duration}`);
    if (context.severity) ctx.push(`Severity: ${context.severity}/10`);
    textParts.push(`Patient context: ${ctx.join(', ')}`);
  }
  if (symptoms) textParts.push(`Symptoms: ${symptoms}`);
  if (hasImages) {
    const n = Math.min(images.length, 3);
    textParts.push(`Please also analyze the ${n > 1 ? `${n} photos` : 'photo'} above for any visible signs.`);
  }
  messageContent.push({ type: 'text', text: textParts.join('\n') || 'No symptoms described.' });

  return messageContent;
}

// ── Regular JSON endpoint (also used by Netlify) ──────────────
app.post('/api/analyze', async (req, res) => {
  const { symptoms = '', images = [], context = {} } = req.body;
  const hasImages = Array.isArray(images) && images.length > 0;
  const symptomsText = typeof symptoms === 'string' ? symptoms.trim() : '';

  if (!hasImages && symptomsText.length < 5) {
    return res.status(400).json({ error: 'Please describe your symptoms in more detail.' });
  }
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server is missing ANTHROPIC_API_KEY.' });
  }

  try {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildMessageContent(symptomsText, images, context) }],
    });

    const rawText = message.content[0].text.trim();
    let conditions;
    try { conditions = JSON.parse(rawText); }
    catch {
      const match = rawText.match(/\[[\s\S]*\]/);
      if (match) { conditions = JSON.parse(match[0]); }
      else { throw new Error('Could not parse response as JSON.'); }
    }

    const conditionsWithImages = await Promise.all(
      conditions.map(async c => ({ ...c, ...await fetchWikiImage(c.name) }))
    );
    res.json({ conditions: conditionsWithImages });
  } catch (err) {
    console.error('Analysis error:', err.message);
    res.status(500).json({ error: 'Failed to analyze symptoms. Please try again.' });
  }
});

// ── SSE streaming endpoint ────────────────────────────────────
app.post('/api/analyze-stream', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const { symptoms = '', images = [], context = {} } = req.body;
  const hasImages = Array.isArray(images) && images.length > 0;
  const symptomsText = typeof symptoms === 'string' ? symptoms.trim() : '';

  if (!hasImages && symptomsText.length < 5) {
    send('error', { message: 'Please describe your symptoms in more detail.' });
    return res.end();
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    send('error', { message: 'Server is missing ANTHROPIC_API_KEY.' });
    return res.end();
  }

  try {
    send('status', { message: 'Connecting to AI…', progress: 8 });

    const client = new Anthropic({ apiKey });

    // Use Claude's streaming API so we get the response faster
    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildMessageContent(symptomsText, images, context) }],
    });

    send('status', { message: 'AI is analyzing your symptoms…', progress: 20 });

    const message = await stream.finalMessage();

    send('status', { message: 'Processing results…', progress: 35 });

    const rawText = message.content[0].text.trim();
    let conditions;
    try { conditions = JSON.parse(rawText); }
    catch {
      const match = rawText.match(/\[[\s\S]*\]/);
      if (match) { conditions = JSON.parse(match[0]); }
      else { throw new Error('Could not parse AI response.'); }
    }

    if (!Array.isArray(conditions) || conditions.length === 0) {
      throw new Error('No conditions returned from AI.');
    }

    send('total', { total: conditions.length });

    // Fetch Wikipedia data for each condition in parallel; emit as each resolves
    await Promise.all(
      conditions.map((condition, index) =>
        fetchWikiImage(condition.name)
          .then(imageData => send('condition', { index, condition: { ...condition, ...imageData } }))
          .catch(() => send('condition', { index, condition }))
      )
    );

    send('done', { total: conditions.length });

  } catch (err) {
    console.error('Stream analysis error:', err.message);
    send('error', { message: 'Failed to analyze symptoms. Please try again.' });
  }

  res.end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`\n  SymptomScope is running at http://localhost:${PORT}\n`);
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('  WARNING: ANTHROPIC_API_KEY is not set.\n');
  }
});
