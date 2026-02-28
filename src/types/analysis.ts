export type LegalCategory =
  | "Housing"
  | "Employment"
  | "Family"
  | "Consumer"
  | "Immigration"
  | "General";

export interface DealPoint {
  title: string;
  explanation: string;
  clause_reference?: string | null;
}

export interface AnalysisResult {
  summary: string;
  document_type: string;
  jurisdiction: string | null;
  state?: string | null; // 2-letter state code from document
  category: LegalCategory;
  good_parts: DealPoint[];
  mid_risk_parts: DealPoint[];
  high_risk_parts: DealPoint[];
  risk_score?: number; // 0–100: 100 − 5×mid − 10×high
  resources: import("@/types/resources").LegalResource[];
  disclaimer: string;
}
