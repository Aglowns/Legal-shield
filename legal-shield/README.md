# Legal Shield (Frontend)

Legal Shield is an AI-assisted legal and contract document explainer. Users can upload or paste legal text, get plain-language analysis, review risk by clause, and find legal support resources by state and category.

This README covers the Next.js frontend in `legal-shield/` and how it connects to the FastAPI backend in `../backend`.

## Features

- **AI Document Analyzer**: upload PDF, DOC/DOCX, TXT, or images (PNG/JPG/GIF/WEBP/BMP/TIFF), or paste text.
- **Risk Dashboard**: shows summary, good parts, mid-risk parts, high-risk parts, and a computed `risk_score` (0–100).
- **Resource Connector**: fetches legal resources by category and state (document state + user-selected state).
- **API proxy routes**: frontend routes under `/api/*` forward requests to backend, simplifying browser-side calls.

## Architecture

- `src/components/*` renders the UI (`document-dropzone`, `risk-dashboard`, `resource-map`).
- `src/app/api/analyze/route.ts` forwards multipart analysis requests to backend `/api/analyze`.
- `src/app/api/resources/route.ts` forwards resource lookups to backend `/api/resources`.
- `src/types/*` defines analysis/resource types used across UI components.

## Prerequisites

- **Node.js** 20+
- **npm** 10+
- Backend service running from `../backend` (Python/FastAPI)

## Environment Variables (Frontend)

Create `legal-shield/.env.local`:

```env
# Backend base URL used by Next.js API route handlers
BACKEND_URL=http://localhost:8000

# Optional: browser-side base URL used in client fetches
# Leave blank to use same-origin (recommended for local dev)
NEXT_PUBLIC_API_URL=
```

Notes:
- `BACKEND_URL` is read on the server by Next.js route handlers.
- If `NEXT_PUBLIC_API_URL` is empty, client requests use relative paths (for example `/api/analyze`).

## Quick Start (Recommended)

From repository root:

```bash
npm install
npm run dev
```

This uses root scripts to run the frontend in `legal-shield/`.

Open `http://localhost:3000`.

## Run Frontend Only

```bash
cd legal-shield
npm install
npm run dev
```

## Start Backend (Required for analysis/resources)

The frontend depends on backend endpoints at `http://localhost:8000` by default.

### Windows (PowerShell)

```powershell
cd backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

### macOS/Linux

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python -m uvicorn app.main:app --reload --port 8000
```

Backend docs: `http://localhost:8000/docs`

## Backend Environment Variables (Summary)

Set these in `backend/.env`:

- `OPENAI_API_KEY` (required for document analysis)
- `OPENAI_MODEL` (default: `gpt-4o-mini`)
- `OPENROUTER_API_KEY` (optional, for classifier)
- `OPENROUTER_MODEL` (default: `sourceful/riverflow-v2-fast`)
- `ALLOWED_ORIGINS` (default: `http://localhost:3000`)

If `OPENAI_API_KEY` is missing, backend analysis will return an error for `/api/analyze`.

## API Contract (Frontend-Facing)

### `POST /api/analyze`

- **Content-Type**: `multipart/form-data`
- **Fields**:
  - `file` (optional): uploaded document
  - `text` (optional): pasted text
- **Success**: analysis payload including:
  - `summary`, `document_type`, `jurisdiction`, `state`, `category`
  - `good_parts`, `mid_risk_parts`, `high_risk_parts`
  - `risk_score`, `resources`, `disclaimer`
- **Errors**:
  - `400`: missing/unsupported/unreadable input
  - `422`: document classified as non-legal
  - `503`: backend AI configuration failure (for example missing/invalid OpenAI key)

### `GET /api/resources?state=NC&category=Housing`

- **Success**: `{ resources, meta }`
- `meta` includes `state`, `category`, `count`

## Available Scripts

In `legal-shield/package.json`:

- `npm run dev` – start development server
- `npm run build` – production build
- `npm run start` – run built app
- `npm run lint` – run ESLint

## Troubleshooting

- **`/api/analyze` fails with 503**: check `backend/.env` has a valid `OPENAI_API_KEY`.
- **CORS issues**: ensure backend `ALLOWED_ORIGINS` includes frontend origin.
- **Cannot connect to backend**: verify `BACKEND_URL` in `legal-shield/.env.local` and backend is running on port `8000`.
- **Image text extraction weak**: install Tesseract for improved OCR in backend.

## Disclaimer

Legal Shield provides educational insights and is not legal advice. Consult a licensed attorney for legal decisions.
