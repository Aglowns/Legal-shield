# Legal Shield

Legal Shield is an AI-powered legal assistant built for AfroPix 2026. It helps users understand legal documents in plain language, highlights red-flag clauses, and connects them with local lawyers or legal clinics by category.

## Core Features

- AI Document Analyzer with drag-and-drop upload (PDF/text) and plain-language summary.
- Legal Risk Dashboard showing risk and complexity scores on a 1-10 scale.
- Local Impact Connector that maps users to legal support resources by category.
- Mobile-first trustworthy UI using deep blues, white backgrounds, and accent greens.

## Tech Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- Lucide React icons
- OpenAI SDK (optional, env-based) with heuristic fallback
- Pro Bono Net Legal Organizations API with curated fallback data

## Environment Variables

Create a `.env.local` file in the project root:

```bash
OPENAI_API_KEY=your_key_here
OPENAI_MODEL=gpt-4o-mini
PROBONO_API_BASE=http://api.probono.net
```

If `OPENAI_API_KEY` is missing, Legal Shield automatically uses local heuristic analysis so the demo still works.

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## API Routes

- `POST /api/analyze`
  - Input: `multipart/form-data` with `file` or `text`.
  - Output: `analysis` object with summary, red flags, risk/complexity scores, and suggested category.
- `GET /api/resources?state=NC&category=Housing`
  - Output: matched legal resources from Pro Bono Net API or curated fallback.

## Engineering Complexity Story

- **Modular architecture:** UI, API routes, and domain logic are separated into `components`, `app/api`, `lib`, and `types`.
- **Robust analysis pipeline:** Supports text and PDF ingestion, LLM structured output, and deterministic fallback logic.
- **Category-aware matching:** AI classifies legal issue category, then maps users to category-specific legal support resources.
- **Resilience strategy:** External API and model fallback flows keep the product usable during outages or missing keys.

## Disclaimer

Legal Shield provides educational insights and is not legal advice.
