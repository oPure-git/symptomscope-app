# SymptomScope

AI-powered symptom analyzer built with the Claude API and Netlify Functions.

Enter your symptoms (text + optional photos) and get a ranked list of 8 possible conditions with likelihood scores, causes, treatments, and urgency ratings.

## Local development

### Prerequisites
- Node.js 18+
- An [Anthropic API key](https://console.anthropic.com/)

### Setup

```bash
cp .env.example .env
# Add your ANTHROPIC_API_KEY to .env

npm install
npm run dev
```

Open http://localhost:8888

## Project structure

```
public/
  index.html        HTML structure
  css/main.css      Styles
  js/app.js         Frontend logic

src/lib/
  redFlags.js       Emergency symptom detection (also used client-side)
  rateLimit.js      Per-IP rate limiting
  wikiImage.js      Wikipedia image fetching

netlify/functions/
  analyze.js        Serverless API handler

tests/
  redFlags.test.js
  rateLimit.test.js
```

## Running tests

```bash
npm test
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Your Anthropic API key |

## Deployment

Connect your GitHub repo to Netlify. Set `ANTHROPIC_API_KEY` in **Site Settings → Environment Variables**.
