import { AlertTriangle, Scale, ShieldCheck } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";

interface RiskDashboardProps {
  analysis: AnalysisResult | null;
}

function severityColor(level: "low" | "medium" | "high"): string {
  if (level === "high") return "text-red-700 bg-red-50 border-red-100";
  if (level === "medium") return "text-amber-700 bg-amber-50 border-amber-100";
  return "text-emerald-700 bg-emerald-50 border-emerald-100";
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-600">
        <span>{label}</span>
        <span>{score}/10</span>
      </div>
      <div className="h-2 rounded-full bg-slate-200">
        <div
          className="h-2 rounded-full bg-blue-900 transition-all"
          style={{ width: `${Math.max(10, score * 10)}%` }}
        />
      </div>
    </div>
  );
}

export function RiskDashboard({ analysis }: RiskDashboardProps) {
  if (!analysis) {
    return (
      <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-semibold text-blue-950">Legal Risk Dashboard</h2>
        <p className="mt-2 text-sm text-slate-600">
          Run an analysis to see risk level, complexity, and red-flag clauses.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-blue-950">Legal Risk Dashboard</h2>
        <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
          Suggested category: {analysis.suggestedCategory}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-blue-100 p-4">
          <div className="mb-2 flex items-center gap-2 text-blue-900">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-semibold">Overall Risk</span>
          </div>
          <ScoreBar score={analysis.riskScore} label="Risk score" />
        </div>
        <div className="rounded-xl border border-blue-100 p-4">
          <div className="mb-2 flex items-center gap-2 text-blue-900">
            <Scale className="h-4 w-4" />
            <span className="text-sm font-semibold">Document Complexity</span>
          </div>
          <ScoreBar score={analysis.complexityScore} label="Complexity score" />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-700" />
          <p className="text-sm text-emerald-900">{analysis.summary}</p>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-sm font-semibold text-blue-950">Red Flags</h3>
        <div className="mt-2 grid gap-2">
          {analysis.redFlags.map((flag, index) => (
            <article key={`${flag.title}-${index}`} className={`rounded-lg border px-3 py-2 ${severityColor(flag.severity)}`}>
              <p className="text-sm font-semibold">{flag.title}</p>
              <p className="mt-1 text-xs">{flag.explanation}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
