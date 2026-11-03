import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { getStore } from "./store";
import { fitsModelYear } from "./fitment";
import type { Part, PartFilter } from "./types";

export const CATALOG_TAG = "catalog";

/** Todas las piezas activas. Se guarda en caché por horas; el panel puede refrescarla. */
export async function getParts(): Promise<Part[]> {
  "use cache";
  cacheLife("hours");
  cacheTag(CATALOG_TAG);
  return getStore().listParts();
}

export async function getPartBySlug(slug: string): Promise<Part | null> {
  const parts = await getParts();
  return parts.find((p) => p.slug === slug) ?? null;
}

const fold = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

export function filterParts(parts: Part[], filter: PartFilter): Part[] {
  const q = filter.q ? fold(filter.q.trim()) : "";
  return parts.filter((p) => {
    if (filter.categoryId && p.categoryId !== filter.categoryId) return false;
    if (!fitsModelYear(p, filter.modelId, filter.year)) return false;
    if (q) {
      const haystack = fold([p.name, p.description, p.brand, p.oemPartNumber ?? ""].join(" "));
      if (!q.split(/\s+/).every((word) => haystack.includes(word))) return false;
    }
    return true;
  });
}
