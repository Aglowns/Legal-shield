"use client";

import { useState } from "react";
import { Scale, Shield, Users } from "lucide-react";
import { DocumentDropzone } from "@/components/document-dropzone";
import { ResourceMap } from "@/components/resource-map";
import { RiskDashboard } from "@/components/risk-dashboard";
import type { AnalysisResult, LegalCategory } from "@/types/analysis";
import type { LegalResource } from "@/types/resources";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

const CATEGORY_OPTIONS: LegalCategory[] = [
  "Housing",
  "Employment",
  "Family",
  "Consumer",
  "Immigration",
  "General",
];

const US_STATES: { code: string; name: string }[] = [
  { code: "AL", name: "Alabama" }, { code: "AK", name: "Alaska" }, { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" }, { code: "CA", name: "California" }, { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" }, { code: "DE", name: "Delaware" }, { code: "FL", name: "Florida" },
  { code: "GA", name: "Georgia" }, { code: "HI", name: "Hawaii" }, { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" }, { code: "IN", name: "Indiana" }, { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" }, { code: "KY", name: "Kentucky" }, { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" }, { code: "MD", name: "Maryland" }, { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" }, { code: "MN", name: "Minnesota" }, { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" }, { code: "MT", name: "Montana" }, { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" }, { code: "NH", name: "New Hampshire" }, { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" }, { code: "NY", name: "New York" }, { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" }, { code: "OH", name: "Ohio" }, { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" }, { code: "PA", name: "Pennsylvania" }, { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" }, { code: "SD", name: "South Dakota" }, { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas" }, { code: "UT", name: "Utah" }, { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" }, { code: "WA", name: "Washington" }, { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" }, { code: "WY", name: "Wyoming" },
];

function stateCodeToName(code: string): string {
  return US_STATES.find((s) => s.code === code)?.name ?? code;
}

export interface ResourceGroup {
  stateCode: string;
  stateName: string;
  source: "document" | "your location";
  resources: LegalResource[];
}

async function fetchResources(stateCode: string, cat: LegalCategory): Promise<LegalResource[]> {
  const response = await fetch(
    `${API_BASE}/api/resources?state=${encodeURIComponent(stateCode.toUpperCase())}&category=${encodeURIComponent(cat)}`,
  );
  const payload = (await response.json()) as { resources?: LegalResource[] };
  return payload.resources ?? [];
}

export function LegalShieldApp() {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [resourceGroups, setResourceGroups] = useState<ResourceGroup[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [resourcesLoading, setResourcesLoading] = useState(false);
  const [category, setCategory] = useState<LegalCategory>("General");
  const [userState, setUserState] = useState<string>("NC");
  const [documentState, setDocumentState] = useState<string | null>(null);

  const loadAllResources = async (cat: LegalCategory, uState: string, dState: string | null) => {
    setResourcesLoading(true);
    try {
      const groups: ResourceGroup[] = [];

      if (dState && dState.toUpperCase() !== uState.toUpperCase()) {
        const [docRes, userRes] = await Promise.all([
          fetchResources(dState, cat),
          fetchResources(uState, cat),
        ]);
        groups.push({
          stateCode: dState,
          stateName: stateCodeToName(dState),
          source: "document",
          resources: docRes,
        });
        groups.push({
          stateCode: uState,
          stateName: stateCodeToName(uState),
          source: "your location",
          resources: userRes,
        });
      } else {
        const stateCode = dState ?? uState;
        const source: "document" | "your location" = dState ? "document" : "your location";
        const res = await fetchResources(stateCode, cat);
        groups.push({
          stateCode,
          stateName: stateCodeToName(stateCode),
          source,
          resources: res,
        });
      }

      setResourceGroups(groups);
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

      const response = await fetch(`${API_BASE}/api/analyze`, {
        method: "POST",
        body: formData,
      });
      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.detail ?? body.error ?? "Unable to analyze document.");
      }

      const result = body as AnalysisResult;
      setAnalysis(result);
      const cat = (result.category ?? "General") as LegalCategory;
      setCategory(cat);
      const docState = result.state ?? null;
      setDocumentState(docState);

      await loadAllResources(cat, userState, docState);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unexpected analysis issue.");
    } finally {
      setAnalysisLoading(false);
    }
  };

  const onCategoryChange = async (value: LegalCategory) => {
    setCategory(value);
    if (!analysis) return;
    await loadAllResources(value, userState, documentState);
  };

  const onLocationChange = async (value: string) => {
    setUserState(value);
    if (!analysis) return;
    await loadAllResources(category, value, documentState);
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
          <p className="mt-2 text-xs text-slate-600">Upload a contract or lease and get a risk breakdown fast.</p>
        </article>
        <article className="rounded-xl border border-blue-100 bg-white p-4">
          <div className="flex items-center gap-2 text-blue-900">
            <Shield className="h-4 w-4" />
            <h2 className="text-sm font-semibold">Legal Risk Dashboard</h2>
          </div>
          <p className="mt-2 text-xs text-slate-600">See good, mid-risk, and high-risk parts of your deal.</p>
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
        <div className="flex flex-wrap items-center gap-4">
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
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-semibold text-blue-950">Your location</h2>
            <select
              className="rounded-lg border border-blue-200 px-3 py-1.5 text-sm text-slate-900"
              value={userState}
              onChange={(event) => onLocationChange(event.target.value)}
            >
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-600">
          Resources are shown for both your location and the document location (when they differ).
        </p>
      </section>

      {error ? (
        <p className="mt-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      ) : null}

      <section className="mt-6">
        <ResourceMap
          groups={analysis ? resourceGroups : []}
          loading={resourcesLoading}
          category={category}
          requireDocument={!analysis}
        />
      </section>

      <footer className="mt-6 rounded-xl border border-blue-100 bg-white p-4 text-xs text-slate-600">
        <p>
          Data sources: Legal Services Corporation, LawHelp.org, Pro Bono Net, and state legal aid directories.
          Legal Shield provides educational insights and is not legal advice.
        </p>
      </footer>
    </main>
  );
}
