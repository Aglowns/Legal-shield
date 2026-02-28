import type { LegalCategory } from "@/types/analysis";

export interface LegalResource {
  id: string;
  name: string;
  type: "clinic" | "lawyer-referral" | "law-firm";
  state: string;
  city?: string;
  county?: string;
  phone?: string;
  website?: string;
  address?: string;
  coverage?: string;
  categories: LegalCategory[];
  source: string;
}
