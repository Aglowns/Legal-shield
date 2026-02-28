import { NextResponse } from "next/server";
import type { LegalCategory } from "@/types/analysis";
import type { LegalResource } from "@/types/resources";
import { fallbackResources } from "@/lib/resource-fallback";
import { fetchProBonoResources } from "@/lib/probono";

const CATEGORIES: LegalCategory[] = [
  "Housing",
  "Employment",
  "Family",
  "Consumer",
  "Immigration",
  "General",
];

function normalizeCategory(category: string | null): LegalCategory {
  if (!category) return "General";
  return (CATEGORIES.find((item) => item.toLowerCase() === category.toLowerCase()) ?? "General") as LegalCategory;
}

function filterByCategory(resources: LegalResource[], category: LegalCategory): LegalResource[] {
  if (category === "General") return resources;
  return resources.filter((resource) => resource.categories.includes(category));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const state = (searchParams.get("state") ?? "NC").toUpperCase();
  const category = normalizeCategory(searchParams.get("category"));

  try {
    const useFallback = searchParams.get("source") === "fallback";
    const apiResources = useFallback ? [] : await fetchProBonoResources({ state, limit: 50 });

    const resources = (apiResources.length ? apiResources : fallbackResources).filter(
      (item) => item.state === state || item.state === "US",
    );

    return NextResponse.json({
      resources: filterByCategory(resources, category).slice(0, 20),
      meta: {
        state,
        category,
        source: apiResources.length ? "probono-api" : "fallback",
      },
    });
  } catch {
    const resources = fallbackResources.filter((item) => item.state === state || item.state === "US");
    return NextResponse.json({
      resources: filterByCategory(resources, category).slice(0, 20),
      meta: {
        state,
        category,
        source: "fallback",
      },
    });
  }
}
