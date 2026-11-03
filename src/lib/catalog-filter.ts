import { CATEGORY_NAMES, MODEL_NAMES } from "./catalog-labels";
import type { CategoryId, ModelId, PartFilter } from "./types";

export type Search = Record<string, string | string[] | undefined>;

export const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseFilter(sp: Search): PartFilter {
  const modelo = first(sp.modelo);
  const categoria = first(sp.categoria);
  const anio = Number(first(sp.anio));
  return {
    modelId: modelo in MODEL_NAMES ? (modelo as ModelId) : undefined,
    categoryId: categoria in CATEGORY_NAMES ? (categoria as CategoryId) : undefined,
    year: Number.isInteger(anio) && anio >= 2000 && anio <= 2100 ? anio : undefined,
    q: first(sp.q).slice(0, 80) || undefined,
  };
}

