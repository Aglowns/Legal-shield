export type LegalCategory =
  | "Housing"
  | "Employment"
  | "Family"
  | "Consumer"
  | "Immigration"
  | "General";

export interface RedFlag {
  title: string;
  severity: "low" | "medium" | "high";
  explanation: string;
}

export interface AnalysisResult {
  summary: string;
  riskScore: number;
  complexityScore: number;
  suggestedCategory: LegalCategory;
  keyTermsExplained: Array<{
    term: string;
    plainMeaning: string;
  }>;
  redFlags: RedFlag[];
  disclaimer: string;
}
