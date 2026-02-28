# Legal Shield — Python Backend

FastAPI backend for Legal Shield. Converts uploaded documents to markdown, classifies them with a small LLM, analyzes legal documents with OpenAI, and returns risk-tiered results with matching legal resources.

## Quick Start

```bash
cd backend
source .venv/bin/activate
cp .env.example .env        # then edit .env and add your keys
python -m uvicorn app.main:app --reload --port 8000
```

API docs at `http://localhost:8000/docs`.

## First-Time Setup

```bash
cd backend
/opt/homebrew/bin/python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Edit `.env` and set:
- `OPENAI_API_KEY` — your OpenAI key (for the main analysis)
- `OPENROUTER_API_KEY` — your OpenRouter key (for document classification)

### Document Classifier

The classifier determines if an uploaded document is legal and extracts its type, jurisdiction, and category. It tries these in order:

1. **OpenRouter** (`sourceful/riverflow-v2-fast`) — if `OPENROUTER_API_KEY` is set. Fast, no local model needed.
2. **Local Phi-3 GGUF** — if a GGUF model file exists at `CLASSIFIER_MODEL_PATH`. No API key needed.
3. **Keyword heuristics** — always available as a last resort.

### Image OCR (optional)

Uploaded images (e.g. photos of contracts) use **Tesseract** for text extraction:

```bash
brew install tesseract
```

### Local Classifier Model (optional)

Only needed if you want to skip OpenRouter:

```bash
huggingface-cli download microsoft/Phi-3-mini-4k-instruct-gguf \
  Phi-3-mini-4k-instruct-q4.gguf --local-dir models/
```
