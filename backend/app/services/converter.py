from __future__ import annotations

import asyncio
import base64
import io
import logging
import mimetypes
import tempfile
from pathlib import Path

from markitdown import MarkItDown

logger = logging.getLogger(__name__)

SUPPORTED_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".txt",
    ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff", ".tif",
}
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".tiff", ".tif"}
MAX_TEXT_LENGTH = 12_000

_md = MarkItDown()


class UnsupportedFileError(Exception):
    pass


def _extract_text_from_image_via_openai(file_bytes: bytes, ext: str) -> str:
    """Use OpenAI GPT-4o-mini vision to read text from an image."""
    from app.config import settings

    if not settings.openai_api_key:
        return ""

    try:
        from openai import OpenAI
    except ImportError:
        return ""

    content_type = mimetypes.guess_type(f"file{ext}")[0] or "image/png"
    b64 = base64.b64encode(file_bytes).decode("utf-8")
    data_uri = f"data:{content_type};base64,{b64}"

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Extract ALL text from this image exactly as written. "
                                "Preserve the original formatting, paragraphs, and line breaks. "
                                "Do not summarize, paraphrase, or add commentary. "
                                "Only output the text that appears in the image."
                            ),
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": data_uri},
                        },
                    ],
                }
            ],
            max_tokens=4096,
        )
        text = response.choices[0].message.content or ""
        return text.strip()
    except Exception as e:
        logger.warning("OpenAI vision text extraction failed: %s", e)
        return ""


def _ocr_image_sync(file_bytes: bytes) -> str:
    """Tesseract OCR fallback. Returns empty string if unavailable or no text found."""
    try:
        import pytesseract
        from PIL import Image, ImageEnhance, ImageOps
    except ImportError:
        return ""

    try:
        img = Image.open(io.BytesIO(file_bytes))
        img = ImageOps.exif_transpose(img)
        if img.mode not in ("L", "RGB"):
            img = img.convert("RGB")
        if img.mode == "RGB":
            img = img.convert("L")
        w, h = img.size
        if min(w, h) > 0 and min(w, h) < 300:
            scale = 300 / min(w, h)
            img = img.resize((int(w * scale), int(h * scale)))
        try:
            img = ImageEnhance.Contrast(img).enhance(1.2)
        except Exception:
            pass
        text = pytesseract.image_to_string(img, config="--psm 6") or ""
        if text.strip():
            return text.strip()
        return (pytesseract.image_to_string(img, config="--psm 3") or "").strip()
    except Exception as e:
        logger.debug("Tesseract OCR failed (may not be installed): %s", e)
        return ""


def _convert_file_sync(file_bytes: bytes, filename: str) -> str:
    ext = Path(filename).suffix.lower()

    if ext not in SUPPORTED_EXTENSIONS:
        raise UnsupportedFileError(
            f"Unsupported file type '{ext}'. Accepted: {', '.join(sorted(SUPPORTED_EXTENSIONS))}"
        )

    if ext == ".txt":
        text = file_bytes.decode("utf-8", errors="replace")
        return text.strip()[:MAX_TEXT_LENGTH]

    if ext in IMAGE_EXTENSIONS:
        # 1) OpenAI vision — most reliable, no system deps
        text = _extract_text_from_image_via_openai(file_bytes, ext)
        if text and len(text) >= 20:
            return text[:MAX_TEXT_LENGTH]

        # 2) Tesseract OCR — works offline if installed
        text = _ocr_image_sync(file_bytes)
        if text and len(text) >= 20:
            return text[:MAX_TEXT_LENGTH]

        # 3) Markitdown metadata — last resort
        with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
            tmp.write(file_bytes)
            tmp.flush()
            tmp_path = tmp.name
        try:
            result = _md.convert(tmp_path)
            text = (result.text_content or "").strip()
            if text and len(text) >= 80:
                return text[:MAX_TEXT_LENGTH]
        except Exception as e:
            logger.debug("Markitdown image conversion failed: %s", e)
        finally:
            Path(tmp_path).unlink(missing_ok=True)

        raise ValueError(
            "Could not extract text from this image. "
            "Paste the document text above or upload a PDF/DOCX file instead."
        )

    # Documents (PDF, DOCX, DOC): markitdown
    with tempfile.NamedTemporaryFile(suffix=ext, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp.flush()
        tmp_path = tmp.name

    try:
        result = _md.convert(tmp_path)
        text = result.text_content or ""
    finally:
        Path(tmp_path).unlink(missing_ok=True)

    text = text.strip()
    if not text:
        raise ValueError(
            "Could not extract readable text from this file. "
            "Try pasting the text instead."
        )

    return text[:MAX_TEXT_LENGTH]


async def convert_file(file_bytes: bytes, filename: str) -> str:
    """Run the blocking conversion in a background thread."""
    return await asyncio.to_thread(_convert_file_sync, file_bytes, filename)
