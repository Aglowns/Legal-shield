import { ExternalLink, Landmark, MapPin, Phone, Scale } from "lucide-react";
import type { LegalCategory } from "@/types/analysis";
import type { LegalResource } from "@/types/resources";
import type { ResourceGroup } from "@/components/legal-shield-app";

interface ResourceMapProps {
  groups: ResourceGroup[];
  loading: boolean;
  category: LegalCategory;
  requireDocument?: boolean;
}

function resourceTypeLabel(type: LegalResource["type"]): string {
  if (type === "lawyer-referral") return "Lawyer referral";
  if (type === "law-firm") return "Law firm";
  return "Legal clinic";
}

function sourceLabel(source: ResourceGroup["source"]): string {
  return source === "document" ? "from document" : "your location";
}

function ResourceCard({ resource }: { resource: LegalResource }) {
  return (
    <article className="rounded-xl border border-blue-100 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-blue-950">{resource.name}</h3>
          <p className="mt-1 text-xs text-slate-600">{resourceTypeLabel(resource.type)}</p>
        </div>
        <Landmark className="h-4 w-4 text-blue-700" />
      </div>

      <div className="mt-3 space-y-1 text-xs text-slate-700">
        {resource.city ? <p>{resource.city}, {resource.state}</p> : <p>{resource.state}</p>}
        {resource.coverage ? <p>Coverage: {resource.coverage}</p> : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {resource.categories.map((item) => (
          <span key={`${resource.id}-${item}`} className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] text-blue-800">
            {item}
          </span>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-xs">
        {resource.phone ? (
          <a className="inline-flex items-center gap-1 text-emerald-700 hover:text-emerald-600" href={`tel:${resource.phone}`}>
            <Phone className="h-3.5 w-3.5" />
            Call
          </a>
        ) : null}
        {resource.website ? (
          <a
            className="inline-flex items-center gap-1 text-blue-800 hover:text-blue-700"
            href={resource.website}
            target="_blank"
            rel="noreferrer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Website
          </a>
        ) : null}
        <span className="inline-flex items-center gap-1 text-slate-500">
          <Scale className="h-3.5 w-3.5" />
          Source: {resource.source}
        </span>
      </div>
    </article>
  );
}

export function ResourceMap({ groups, loading, category, requireDocument }: ResourceMapProps) {
  const totalResources = groups.reduce((sum, g) => sum + g.resources.length, 0);

  return (
    <section className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-blue-950">Local Impact Connector</h2>
        <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
          {category} support
        </span>
      </div>

      <p className="mt-2 text-sm text-slate-600">
        Connect with local lawyers, referral services, and legal clinics that match the document category.
      </p>

      {requireDocument ? (
        <p className="mt-4 text-sm text-slate-600">
          Analyze a document above to see resources for your location and category.
        </p>
      ) : loading ? (
        <p className="mt-4 text-sm text-slate-600">Loading local resources...</p>
      ) : totalResources === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          No direct matches were found. Try switching to General category or checking statewide directories.
        </p>
      ) : (
        <div className="mt-4 space-y-6">
          {groups.map((group) => (
            <div key={`${group.stateCode}-${group.source}`}>
              <div className="mb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-700" />
                <h3 className="text-sm font-semibold text-blue-950">
                  {group.stateName}
                </h3>
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-700">
                  {sourceLabel(group.source)}
                </span>
                <span className="text-xs text-slate-500">
                  {group.resources.length} {group.resources.length === 1 ? "resource" : "resources"}
                </span>
              </div>

              {group.resources.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No {category} resources found in {group.stateName}.
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {group.resources.map((resource) => (
                    <ResourceCard key={resource.id} resource={resource} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
