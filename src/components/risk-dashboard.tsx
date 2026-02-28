"use client";

import { AlertTriangle, CheckCircle, Info, ShieldCheck } from "lucide-react";
import type { AnalysisResult, DealPoint } from "@/types/analysis";

interface RiskDashboardProps {
  analysis: AnalysisResult | null;
}

function DealPointCard({
  point,
  variant,
}: {
  point: DealPoint;
  variant: "good" | "mid" | "high";
}) {
  const styles = {
    good: "border-emerald-100 bg-emerald-50 text-emerald-900",
    mid: "border-amber-100 bg-amber-50 text-amber-900",
    high: "border-red-100 bg-red-50 text-red-900",
  };
  const icons = {
    good: <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />,
    mid: <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />,
    high: <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />,
  };

  return (
    <article className={`rounded-lg border px-3 py-2 ${styles[variant]}`}>
      <div className="flex items-start gap-2">
        {icons[variant]}
        <div>
          <p className="text-sm font-semibold">{point.title}</p>
          <p className="mt-1 text-xs">{point.explanation}</p>
          {point.clause_reference ? (
            <p className="mt-1 text-[11px] opacity-70">Ref: {point.clause_reference}</p>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function RiskSection({
  title,
  points,
  variant,
}: {
  title: string;
  points: DealPoint[];
  variant: "good" | "mid" | "high";
}) {
  if (points.length === 0) return null;

  const headingColors = {
    good: "text-emerald-800",
    mid: "text-amber-800",
    high: "text-red-800",
  };

  return (
    <div className="mt-4">
      <h3 className={`text-sm font-semibold ${headingColors[variant]}`}>{title}</h3>
      <div className="mt-2 grid gap-2">
        {points.map((point, index) => (
          <DealPointCard key={`${variant}-${point.title}-${index}`} point={point} variant={variant} />
        ))}
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
          Run an analysis to see good, mid-risk, and high-risk parts of your document.
        </p>
      </section>
    );
  }

  const riskScore =
    analysis.risk_score ??
    Math.max(
      0,
      100 - analysis.mid_risk_parts.length * 5 - analysis.high_risk_parts.length * 10,
    );
  const scoreLabel =
    riskScore >= 80 ? "Low risk" : riskScore >= 50 ? "Medium risk" : "High risk";
  const scoreColor =
    riskScore >= 80
      ? "bg-emerald-100 text-emerald-800 border-emerald-200"
      : riskScore >= 50
        ? "bg-amber-100 text-amber-800 border-amber-200"
        : "bg-red-100 text-red-800 border-red-200";

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-blue-950">Legal Risk Dashboard</h2>
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${scoreColor}`}
            title="100 − 5×mid-risk − 10×high-risk"
          >
            Risk score: {riskScore}/100
          </span>
          <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-800">
            {analysis.category}
          </span>
          {analysis.jurisdiction ? (
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
              {analysis.jurisdiction}
            </span>
          ) : null}
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
            {analysis.document_type}
          </span>
        </div>
      </div>

      <p className="mt-2 text-xs text-slate-600">
        {scoreLabel} — based on {analysis.mid_risk_parts.length} mid-risk (−5% each) and{" "}
        {analysis.high_risk_parts.length} high-risk (−10% each) items.
      </p>

      <div className="mt-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 h-4 w-4 text-emerald-700" />
          <p className="text-sm text-emerald-900">{analysis.summary}</p>
        </div>
      </div>

      <RiskSection title="Good Parts of the Deal" points={analysis.good_parts} variant="good" />
      <RiskSection title="Mid-Risk Parts" points={analysis.mid_risk_parts} variant="mid" />
      <RiskSection title="High-Risk Parts" points={analysis.high_risk_parts} variant="high" />

      <p className="mt-4 text-[11px] text-slate-500">{analysis.disclaimer}</p>
    </section>
  );
}
