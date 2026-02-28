import { NextResponse } from "next/server";
import OpenAI from "openai";
import { extractTextFromPdf } from "@/lib/pdf-extract";
import { runHeuristicAnalysis } from "@/lib/analysis-heuristics";
import type { AnalysisResult } from "@/types/analysis";

const MAX_TEXT_LENGTH = 12000;

function safeParseLLMResponse(raw: string): AnalysisResult | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AnalysisResult>;
    if (
      !parsed ||
      typeof parsed.summary !== "string" ||
      typeof parsed.riskScore !== "number" ||
      typeof parsed.complexityScore !== "number" ||
      typeof parsed.suggestedCategory !== "string" ||
      !Array.isArray(parsed.redFlags)
    ) {
      return null;
    }

    return {
      summary: parsed.summary,
      riskScore: Math.max(1, Math.min(10, Math.round(parsed.riskScore))),
      complexityScore: Math.max(1, Math.min(10, Math.round(parsed.complexityScore))),
      suggestedCategory: parsed.suggestedCategory as AnalysisResult["suggestedCategory"],
      keyTermsExplained: Array.isArray(parsed.keyTermsExplained) ? parsed.keyTermsExplained : [],
      redFlags: parsed.redFlags.map((flag) => ({
        title: String(flag.title ?? "Untitled risk"),
        severity: flag.severity === "high" || flag.severity === "medium" ? flag.severity : "low",
        explanation: String(flag.explanation ?? ""),
      })),
      disclaimer:
        typeof parsed.disclaimer === "string"
          ? parsed.disclaimer
          : "Legal Shield provides educational insights, not legal advice.",
    };
  } catch {
    return null;
  }
}

async function extractTextFromFormData(formData: FormData): Promise<string> {
  const pastedText = formData.get("text");
  if (typeof pastedText === "string" && pastedText.trim()) {
    return pastedText.trim().slice(0, MAX_TEXT_LENGTH);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    throw new Error("Please provide document text or upload a file.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (isPdf) {
    try {
      const text = await extractTextFromPdf(bytes);
      if (!text.trim()) {
        throw new Error(
          "This PDF appears to be image-based (scanned). Please copy and paste the document text instead.",
        );
      }
      return text.trim().slice(0, MAX_TEXT_LENGTH);
    } catch (pdfError) {
      console.error("[Legal Shield] PDF extraction failed:", pdfError);
      if (pdfError instanceof Error && pdfError.message.includes("image-based")) {
        throw pdfError;
      }
      throw new Error(
        "Could not read this PDF. Please paste the document text into the text box and try again.",
      );
    }
  }

  return bytes.toString("utf8").trim().slice(0, MAX_TEXT_LENGTH);
}

async function analyzeWithLLM(documentText: string): Promise<AnalysisResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const client = new OpenAI({ apiKey });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a legal-document assistant. Return only valid JSON with keys: summary, riskScore (1-10), complexityScore (1-10), suggestedCategory (Housing|Employment|Family|Consumer|Immigration|General), keyTermsExplained (array of {term, plainMeaning}), redFlags (array of {title,severity,explanation}), disclaimer.",
      },
      {
        role: "user",
        content: `Analyze this legal document and identify key risks for community users:\n\n${documentText}`,
      },
    ],
  });

  return safeParseLLMResponse(completion.choices[0]?.message?.content ?? "");
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const text = await extractTextFromFormData(formData);

    if (!text) {
      return NextResponse.json(
        { error: "No readable content was found in the document." },
        { status: 400 },
      );
    }

    const llmResult = await analyzeWithLLM(text);
    const analysis = llmResult ?? runHeuristicAnalysis(text);

    return NextResponse.json({ analysis });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected analysis error.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
