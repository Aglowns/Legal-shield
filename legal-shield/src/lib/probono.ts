import type { LegalCategory } from "@/types/analysis";
import type { LegalResource } from "@/types/resources";

const PROBONO_BASE_URL = process.env.PROBONO_API_BASE ?? "http://api.probono.net";

const CATEGORY_TO_KEYWORDS: Record<LegalCategory, string[]> = {
  Housing: ["housing", "tenant", "landlord", "eviction"],
  Employment: ["employment", "worker", "labor", "wage"],
  Family: ["family", "custody", "domestic", "child"],
  Consumer: ["consumer", "debt", "loan", "credit"],
  Immigration: ["immigration", "visa", "asylum"],
  General: ["general", "civil"],
};

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function categoryFromText(text: string): LegalCategory[] {
  const normalized = text.toLowerCase();
  const matches = (Object.entries(CATEGORY_TO_KEYWORDS) as Array<[LegalCategory, string[]]>)
    .filter(([, keywords]) => keywords.some((keyword) => normalized.includes(keyword)))
    .map(([category]) => category);

  return matches.length ? matches : ["General"];
}

function parseProBonoEntry(entry: Record<string, unknown>): LegalResource {
  const coverage = entry["pbn:coverage"] as
    | { country?: Array<{ state?: Array<{ id?: string; county?: Array<{ [k: string]: unknown }> }> }> }
    | undefined;
  const states = coverage?.country?.flatMap((country) => country.state ?? []) ?? [];
  const firstState = states[0];
  const counties = firstState?.county?.map((value) => String((value as { "#text"?: string })["#text"] ?? ""))
    .filter(Boolean);

  const legalAreasObj = entry["pbn:legalAreas"] as
    | { legalArea?: Array<{ "#text"?: string }> }
    | undefined;
  const legalAreaText = (legalAreasObj?.legalArea ?? [])
    .map((area) => String(area["#text"] ?? ""))
    .join(" ");

  const categories = categoryFromText(legalAreaText);

  const contact = (entry["pbn:contact"] as Record<string, unknown> | undefined) ?? {};
  const address = (entry["pbn:address"] as Record<string, unknown> | undefined) ?? {};

  const nameRaw = String(entry.title ?? "Unnamed legal organization");
  const id = String(entry.id ?? nameRaw).replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 80);

  return {
    id,
    name: toTitleCase(nameRaw),
    type: "clinic",
    state: String(firstState?.id ?? "US"),
    city: address["city"] ? String(address["city"]) : undefined,
    county: counties?.[0] ? toTitleCase(counties[0]) : undefined,
    phone: contact["phone"] ? String(contact["phone"]) : undefined,
    website: contact["website"] ? String(contact["website"]) : undefined,
    address: address["street"] ? String(address["street"]) : undefined,
    coverage: counties?.length ? counties.map(toTitleCase).join(", ") : undefined,
    categories,
    source: "probono-api",
  };
}

export async function fetchProBonoResources(params: {
  state?: string;
  page?: number;
  limit?: number;
}): Promise<LegalResource[]> {
  const query = new URLSearchParams({
    format: "json",
    listing: "detail",
    page: String(params.page ?? 1),
    limit: String(params.limit ?? 50),
  });

  if (params.state) {
    query.set("state", params.state);
  }

  const response = await fetch(`${PROBONO_BASE_URL}/legalorganizations/current?${query}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Pro Bono API request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as { feed?: { entry?: Record<string, unknown>[] } };
  const entries = payload.feed?.entry ?? [];

  return entries.map(parseProBonoEntry);
}
