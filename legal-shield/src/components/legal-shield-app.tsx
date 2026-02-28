"use client";

import { useState } from "react";
import { Scale, Shield, Users } from "lucide-react";
import { DocumentDropzone } from "@/components/document-dropzone";
import { ResourceMap } from "@/components/resource-map";
import { RiskDashboard } from "@/components/risk-dashboard";
import type { AnalysisResult, LegalCategory } from "@/types/analysis";
import type { LegalResource } from "@/types/resources";

const CATEGORY_OPTIONS: LegalCategory[] = [
  "Housing",
  "Employment",
  "Family",
  "Consumer",
  "Immigration",
  "General",
];

export function LegalShieldApp() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [resources, setResources] = useState<LegalResource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [category, setCategory] = useState<LegalCategory>("General");

  const loadResources = async (nextCategory: LegalCategory) => {
    setResourcesLoading(true);
    try {
      const response = await fetch(`/api/resources?state=NC&category=${encodeURIComponent(nextCategory)}`);
      const payload = (await response.json()) as { resources?: LegalResource[] };
      setResources(payload.resources ?? []);
    } finally {
      setResourcesLoading(false);
    }
  };

  const handleAnalyze = async (payload: { text: string; file: File | null }) => {
    setError(null);
    setAnalysisLoading(true);
    try {
      const formData = new FormData();
      if (payload.file) formData.set("file", payload.file);
      if (payload.text.trim()) formData.set("text", payload.text);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });
      const body = (await response.json()) as { analysis?: AnalysisResult; error?: string };

      if (!response.ok || !body.analysis) {
        throw new Error(body.error ?? "Unable to analyze document.");
      }

      setAnalysis(body.analysis);
      setCategory(body.analysis.suggestedCategory);
      await loadResources(body.analysis.suggestedCategory);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unexpected analysis issue.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const onCategoryChange = async (value: LegalCategory) => {
    setCategory(value);
    await loadResources(value);
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 md:px-6 md:py-10">
      <header className="rounded-2xl bg-[#0f172a] p-6 text-white shadow md:p-8">
        <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium">
          <Shield className="h-3.5 w-3.5" />
          AfroPix 2026 - Local Community Impact
        </p>
        <h1 className="mt-3 text-2xl font-bold tracking-tight md:text-4xl">Legal Shield</h1>
        <p className="mt-2 max-w-3xl text-sm text-blue-100 md:text-base">
          An AI-powered assistant that explains legal documents in plain language, flags risk, and connects users with local legal support.
        </p>
      </header>

      <section className="mt-6 grid gap-4 md:grid-cols-3">
        <article className="rounded-xl border border-blue-100 bg-white p-4">
          <div className="flex items-center gap-2 text-blue-900">
            <Scale className="h-4 w-4" />
            <h2 className="text-sm font-semibold">AI Document Analyzer</h2>
          </div>
          <p className="mt-2 text-xs text-slate-600">Upload a contract or lease and detect red flags fast.</p>
        </article>
        <article className="rounded-xl border border-blue-100 bg-white p-4">
          <div className="flex items-center gap-2 text-blue-900">
            <Shield className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Legal Risk Dashboard</h2>
          </div>
          <p className="mt-2 text-xs text-slate-600">Visual 1-10 scores for complexity and legal risk.</p>
        </article>
        <article className="rounded-xl border border-blue-100 bg-white p-4">
          <div className="flex items-center gap-2 text-blue-900">
            <Users className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Local Impact Connector</h2>
          </div>
          <p className="mt-2 text-xs text-slate-600">Connect with relevant clinics and lawyer referral resources.</p>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <DocumentDropzone onAnalyze={handleAnalyze} loading={analysisLoading} />
        <RiskDashboard analysis={analysis} />
      </section>

      <section className="mt-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-semibold text-blue-950">Match by legal category</h2>
          <select
            className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-slate-900"
            value={category}
            onChange={(event) => onCategoryChange(event.target.value as LegalCategory)}
          >
            {CATEGORY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          The app uses document context to suggest a category, then lists local support that matches that legal issue.
        </p>
      </section>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="mt-6">
        <ResourceMap resources={resources} loading={resourcesLoading} category={category} />
      </section>

      <footer className="mt-6 rounded-xl border border-blue-100 bg-white p-4 text-xs text-slate-600">
        <p>
          Data sources: Legal Services Corporation, LawHelp.org, Pro Bono Net, and North Carolina legal aid directories.
          Legal Shield provides educational insights and is not legal advice.
        </p>
      </footer>
    </main>
  );
}
