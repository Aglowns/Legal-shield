# Legal Shield — Backend

FastAPI backend for **Legal Shield**. Converts uploaded documents to markdown (MarkItDown), classifies them as legal or not (OpenRouter, local Phi-3 GGUF, or heuristics), analyzes legal documents with OpenAI, and returns risk-tiered results. Used by the Next.js frontend for analysis and for the Local Impact Connector (legal resources).

For the full project overview, setup, and project story, see the [root README](../README.md).

---

## Quick start

```bash
cd backend
source .venv/bin/activate
cp .env.example .env   # then edit .env and add your keys
python -m uvicorn app.main:app --reload --port 8000
```

API docs: **http://localhost:8000/docs**

---

## First-time setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and set:

- **`OPENAI_API_KEY`** — Your OpenAI key (required for document analysis).
- **`OPENROUTER_API_KEY`** — (Optional) OpenRouter key for document classification. If unset, the backend uses a local Phi-3 GGUF model or keyword heuristics.

---

## Document classifier

The classifier decides whether an upload is a legal document and extracts type, jurisdiction, and category. It tries, in order:

1. **OpenRouter** (`sourceful/riverflow-v2-fast`) — if `OPENROUTER_API_KEY` is set. No local model needed.
2. **Local Phi-3 GGUF** — if a GGUF model exists at `CLASSIFIER_MODEL_PATH`. No API key needed.
3. **Keyword heuristics** — always available as fallback.

Non-legal or spam uploads are rejected with a clear “we can’t provide this service” response.

### Local classifier model (optional)

Only needed if you want to avoid using OpenRouter:

```bash
mkdir -p models
huggingface-cli download microsoft/Phi-3-mini-4k-instruct-gguf \
  Phi-3-mini-4k-instruct-q4.gguf --local-dir models/
```

Set `CLASSIFIER_MODEL_PATH` in `.env` if your filename or path differs from the default.

---

## Image OCR (optional)

Uploaded images (e.g. photos of contracts) use **Tesseract** for text extraction. Install if you need it:

```bash
brew install tesseract   # macOS
```

---

## Environment variables

| Variable             | Purpose |
|----------------------|--------|
| `OPENAI_API_KEY`     | Required for analysis (e.g. GPT-4o-mini). |
| `OPENAI_MODEL`       | Model name (default `gpt-4o-mini`). |
| `OPENROUTER_API_KEY` | Optional; used for classification when set. |
| `OPENROUTER_MODEL`   | OpenRouter model (default `sourceful/riverflow-v2-fast`). |
| `CLASSIFIER_MODEL_PATH` | Path to local GGUF model (optional). |
| `CLASSIFIER_THREADS` | Threads for local LLM (default `4`). |
| `ALLOWED_ORIGINS`   | CORS origins (default `http://localhost:3000`). |

---

## Deploying (for use with Vercel)

Deploy this backend to [Railway](https://railway.app), [Render](https://render.com), or [Fly.io]. In your Vercel project (frontend), set:

- **Name:** `BACKEND_URL`
- **Value:** Your backend URL (e.g. `https://your-app.railway.app`)

Redeploy the frontend after setting `BACKEND_URL`.
