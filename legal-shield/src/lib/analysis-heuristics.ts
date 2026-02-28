import type { AnalysisResult, LegalCategory } from "@/types/analysis";

const CATEGORY_PATTERNS: Array<{ category: LegalCategory; patterns: RegExp[] }> = [
  {
    category: "Housing",
    patterns: [
      /\blease\b/i,
      /\brent\b/i,
      /\blandlord\b/i,
      /\btenant\b/i,
      /\beviction\b/i,
      /\bsecurity deposit\b/i,
    ],
  },
  {
    category: "Employment",
    patterns: [
      /\bemployment\b/i,
      /\bnon-compete\b/i,
      /\bovertime\b/i,
      /\bwages?\b/i,
      /\btermination\b/i,
    ],
  },
  {
    category: "Family",
    patterns: [/\bcustody\b/i, /\bdivorce\b/i, /\bchild support\b/i, /\bspouse\b/i],
  },
  {
    category: "Consumer",
    patterns: [/\bloan\b/i, /\binterest rate\b/i, /\bpenalty fee\b/i, /\bdebt\b/i],
  },
  {
    category: "Immigration",
    patterns: [/\bvisa\b/i, /\bgreen card\b/i, /\bdeportation\b/i, /\bimmigration\b/i],
  },
];

const RED_FLAG_RULES: Array<{
  test: RegExp;
  title: string;
  severity: "low" | "medium" | "high";
  explanation: string;
}> = [
  {
    test: /\blate fee\b/i,
    title: "Late fee language",
    severity: "medium",
    explanation: "Late fee clauses can become costly if the amount or timeline is vague.",
  },
  {
    test: /\bautomatic renewal\b/i,
    title: "Automatic renewal clause",
    severity: "medium",
    explanation: "Auto-renewal can lock users into terms unless cancellation rules are clear.",
  },
  {
    test: /\bwaive\b.*\bright\b/i,
    title: "Waiver of rights",
    severity: "high",
    explanation: "A waiver clause may remove legal protections and should be reviewed carefully.",
  },
  {
    test: /\bnon-refundable\b/i,
    title: "Non-refundable payments",
    severity: "high",
    explanation: "Non-refundable fee terms may indicate one-sided financial risk.",
  },
];

function pickCategory(text: string): LegalCategory {
  const scores = new Map<LegalCategory, number>();

  for (const { category } of CATEGORY_PATTERNS) {
    scores.set(category, 0);
  }

  for (const { category, patterns } of CATEGORY_PATTERNS) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        scores.set(category, (scores.get(category) ?? 0) + 1);
      }
    }
  }

  let best: LegalCategory = "General";
  let max = 0;

  for (const [category, score] of scores) {
    if (score > max) {
      best = category;
      max = score;
    }
  }

  return max > 0 ? best : "General";
}

function clampScore(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

export function runHeuristicAnalysis(documentText: string): AnalysisResult {
  const normalized = documentText.trim();
  const category = pickCategory(normalized);
  const redFlags = RED_FLAG_RULES.filter((rule) => rule.test.test(normalized)).map((rule) => ({
    title: rule.title,
    severity: rule.severity,
    explanation: rule.explanation,
  }));

  const wordCount = normalized.split(/\s+/).filter(Boolean).length;
  const sentenceCount = normalized.split(/[.!?]+/).filter(Boolean).length || 1;
  const avgSentenceLength = wordCount / sentenceCount;
  const complexityScore = clampScore(avgSentenceLength / 3.2);
  const riskScore = clampScore(3 + redFlags.length * 1.8 + (category === "Housing" ? 1 : 0));

  return {
    summary:
      "This is an automated first-pass review. It highlights potentially risky language and the core obligations in plain language.",
    riskScore,
    complexityScore,
    suggestedCategory: category,
    keyTermsExplained: [
      {
        term: "Obligations",
        plainMeaning: "What each side is required to do under the agreement.",
      },
      {
        term: "Penalty",
        plainMeaning: "A financial or legal consequence if terms are broken.",
      },
    ],
    redFlags:
      redFlags.length > 0
        ? redFlags
        : [
            {
              title: "No major trigger phrase detected",
              severity: "low",
              explanation:
                "No high-risk clause keywords were detected, but a legal professional should still review the full document.",
            },
          ],
    disclaimer:
      "Legal Shield provides educational insights, not legal advice. Contact a qualified lawyer or clinic for legal guidance.",
  };
}
