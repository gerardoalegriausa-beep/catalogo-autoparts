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


export type VehicleChoice = { modelId?: ModelId; year?: number };

/** "modelo=xc60&anio=2020" para mantener el vehículo elegido entre páginas. */
export function vehicleQuery(v: VehicleChoice): string {
  const params = new URLSearchParams();
  if (v.modelId) params.set("modelo", v.modelId);
  if (v.year) params.set("anio", String(v.year));
  return params.toString();
}

export function withQuery(path: string, query: string): string {
  return query ? `${path}?${query}` : path;
}

/** Años que se ofrecen en los selectores, del más reciente al más antiguo. */
export function yearOptions(currentYear: number): number[] {
  const from = 2010;
  return Array.from({ length: currentYear + 2 - from }, (_, i) => currentYear + 1 - i);
}
