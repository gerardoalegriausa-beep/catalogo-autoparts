// Lectura, validación y escritura de la hoja de repuestos (CSV), sin dependencias.
// La usan el panel (/admin/repuestos) y el script scripts/import-parts.mjs,
// por eso este archivo no usa alias "@/" ni importa nada del servidor.
//
// Formato de la columna "compatibilidad": entradas separadas por ";" con
//   modelo:añoDesde-añoHasta[:motor]
// Ejemplos: "xc60:2018-"  "xc90:2016-2020:B4204T;s90:2017-"

import type { CategoryId, Fitment, ModelId, Part, PartCondition } from "./types";

export const CSV_MODELS: ModelId[] = ["xc40", "xc60", "xc90", "s60", "s90"];
export const CSV_CATEGORIES: CategoryId[] = ["sensores-electronica", "motor-refrigeracion", "frenos", "iluminacion"];
export const CSV_CONDITIONS: PartCondition[] = ["nuevo", "reconstruido", "usado"];

/** Límite de tamaño de la hoja que se sube desde el panel (≈ 3,000 piezas). */
export const MAX_CSV_BYTES = 900_000;

export const COLUMNS = [
  "slug",
  "nombre",
  "descripcion",
  "categoria",
  "numero_parte",
  "marca",
  "condicion",
  "proveedor",
  "costo_usd",
  "margen_pct",
  "envio_eeuu_usd",
  "peso_kg",
  "largo_cm",
  "ancho_cm",
  "alto_cm",
  "arancel_pct",
  "requiere_numero_parte",
  "activo",
  "compatibilidad",
] as const;

/** Fila de pieza tal como se guarda en la tabla "parts" de Supabase. */
export type PartRow = {
  slug: string;
  name: string;
  description: string;
  category_id: CategoryId;
  oem_part_number: string | null;
  brand: string;
  condition: PartCondition;
  supplier: string | null;
  supplier_cost_usd: number;
  margin_pct: number | null;
  us_shipping_usd: number;
  weight_kg: number;
  length_cm: number;
  width_cm: number;
  height_cm: number;
  duty_pct: number | null;
  high_risk: boolean;
  active: boolean;
};

export type FitmentRow = { model_id: ModelId; year_from: number; year_to: number | null; engine: string | null };

export type PartImport = { part: PartRow; fitments: FitmentRow[] };

/** Excel en español guarda los CSV con ";" en vez de ",". Se detecta por la primera línea. */
export function detectDelimiter(text: string): "," | ";" {
  const firstLine = text.replace(/^﻿/, "").split(/\r?\n/, 1)[0] ?? "";
  const count = (ch: string) => firstLine.split(ch).length - 1;
  return count(";") > count(",") ? ";" : ",";
}

/** Parser CSV con comillas ("a, b"), comillas dobles escapadas ("") y saltos de línea dentro de comillas. */
export function parseCsv(text: string, delimiter: "," | ";" = detectDelimiter(text)): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === delimiter) {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

export function toCsv(rows: unknown[][]): string {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
}

const truthy = (v: string) => ["si", "sí", "true", "1", "x", "yes"].includes(v.trim().toLowerCase());

function number(value: string, required = false): number | null {
  const s = value.trim().replace(",", ".");
  if (s === "") return required ? NaN : null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
}

export function parseFitments(value: string): { fitments: FitmentRow[]; errors: string[] } {
  const errors: string[] = [];
  const fitments: FitmentRow[] = [];
  for (const raw of value.split(";").map((s) => s.trim()).filter(Boolean)) {
    const m = raw.match(/^([a-z0-9]+)\s*:\s*(\d{4})\s*-\s*(\d{4})?\s*(?::\s*([A-Za-z0-9]+))?$/i);
    if (!m) {
      errors.push(`compatibilidad "${raw}" no tiene el formato modelo:2018-2022[:motor]`);
      continue;
    }
    const [, model, from, to, engine] = m;
    const modelId = model.toLowerCase() as ModelId;
    if (!CSV_MODELS.includes(modelId)) {
      errors.push(`modelo "${model}" no existe (usa ${CSV_MODELS.join(", ")})`);
      continue;
    }
    const yearFrom = Number(from);
    const yearTo = to ? Number(to) : null;
    if (yearTo !== null && yearTo < yearFrom) {
      errors.push(`compatibilidad "${raw}": el año final es menor que el inicial`);
      continue;
    }
    fitments.push({ model_id: modelId, year_from: yearFrom, year_to: yearTo, engine: engine ? engine.toUpperCase() : null });
  }
  if (fitments.length === 0 && errors.length === 0) errors.push("falta la compatibilidad");
  return { fitments, errors };
}

const NUMBER_LABELS: Record<string, string> = {
  supplier_cost_usd: "costo_usd",
  margin_pct: "margen_pct",
  us_shipping_usd: "envio_eeuu_usd",
  weight_kg: "peso_kg",
  length_cm: "largo_cm",
  width_cm: "ancho_cm",
  height_cm: "alto_cm",
  duty_pct: "arancel_pct",
};

/** Convierte las filas del CSV en piezas listas para guardar. Devuelve los errores por fila. */
export function rowsToParts(rows: string[][]): { parts: PartImport[]; errors: string[] } {
  if (rows.length === 0) return { parts: [], errors: ["El archivo está vacío."] };
  const [header, ...data] = rows;
  const cols = header.map((h) => h.trim().toLowerCase());
  const missing = COLUMNS.filter((c) => !cols.includes(c));
  if (missing.length) return { parts: [], errors: [`Faltan columnas: ${missing.join(", ")}`] };
  if (data.length === 0) return { parts: [], errors: ["El archivo no tiene repuestos (solo encabezados)."] };

  const parts: PartImport[] = [];
  const errors: string[] = [];
  const slugs = new Set<string>();
  data.forEach((values, i) => {
    const line = i + 2;
    const get = (c: string) => (values[cols.indexOf(c)] ?? "").trim();
    const rowErrors: string[] = [];

    const slug = get("slug").toLowerCase();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) rowErrors.push("slug inválido (solo minúsculas, números y guiones)");
    else if (slugs.has(slug)) rowErrors.push(`slug "${slug}" repetido`);
    slugs.add(slug);

    const category = get("categoria") as CategoryId;
    if (!CSV_CATEGORIES.includes(category)) rowErrors.push(`categoría "${category}" no existe`);
    const condition = (get("condicion") || "nuevo") as PartCondition;
    if (!CSV_CONDITIONS.includes(condition)) rowErrors.push(`condición "${condition}" no existe`);
    if (!get("nombre")) rowErrors.push("falta el nombre");
    if (!get("marca")) rowErrors.push("falta la marca");

    const nums = {
      supplier_cost_usd: number(get("costo_usd"), true),
      margin_pct: number(get("margen_pct")),
      us_shipping_usd: number(get("envio_eeuu_usd")) ?? 0,
      weight_kg: number(get("peso_kg"), true),
      length_cm: number(get("largo_cm"), true),
      width_cm: number(get("ancho_cm"), true),
      height_cm: number(get("alto_cm"), true),
      duty_pct: number(get("arancel_pct")),
    };
    for (const [k, v] of Object.entries(nums)) {
      if (Number.isNaN(v)) rowErrors.push(`${NUMBER_LABELS[k]} no es un número válido`);
    }

    const { fitments, errors: fitErrors } = parseFitments(get("compatibilidad"));
    rowErrors.push(...fitErrors);

    if (rowErrors.length) {
      errors.push(`Fila ${line}${slug ? ` (${slug})` : ""}: ${rowErrors.join("; ")}`);
      return;
    }
    parts.push({
      part: {
        slug,
        name: get("nombre"),
        description: get("descripcion"),
        category_id: category,
        oem_part_number: get("numero_parte") || null,
        brand: get("marca"),
        condition,
        supplier: get("proveedor") || null,
        supplier_cost_usd: nums.supplier_cost_usd!,
        margin_pct: nums.margin_pct,
        us_shipping_usd: nums.us_shipping_usd,
        weight_kg: nums.weight_kg!,
        length_cm: nums.length_cm!,
        width_cm: nums.width_cm!,
        height_cm: nums.height_cm!,
        duty_pct: nums.duty_pct,
        high_risk: truthy(get("requiere_numero_parte")),
        active: get("activo") === "" ? true : truthy(get("activo")),
      },
      fitments,
    });
  });
  return { parts, errors };
}

export function fitmentsToText(fitments: Fitment[]): string {
  return fitments.map((f) => `${f.modelId}:${f.yearFrom}-${f.yearTo ?? ""}${f.engine ? `:${f.engine}` : ""}`).join(";");
}

/** Piezas del catálogo → filas del CSV (para descargar, editar y volver a subir). */
export function partsToCsv(parts: Part[]): string {
  const rows = parts.map((p) => {
    const values: Record<(typeof COLUMNS)[number], unknown> = {
      slug: p.slug,
      nombre: p.name,
      descripcion: p.description,
      categoria: p.categoryId,
      numero_parte: p.oemPartNumber ?? "",
      marca: p.brand,
      condicion: p.condition,
      proveedor: p.supplier ?? "",
      costo_usd: p.supplierCostUsd,
      margen_pct: p.marginPct ?? "",
      envio_eeuu_usd: p.usShippingUsd || "",
      peso_kg: p.weightKg,
      largo_cm: p.lengthCm,
      ancho_cm: p.widthCm,
      alto_cm: p.heightCm,
      arancel_pct: p.dutyPct ?? "",
      requiere_numero_parte: p.highRisk ? "si" : "no",
      activo: p.active ? "si" : "no",
      compatibilidad: fitmentsToText(p.fitments),
    };
    return COLUMNS.map((c) => values[c]);
  });
  return toCsv([[...COLUMNS], ...rows]);
}

/** Fila importada → pieza del catálogo (lo usa el modo demostración). */
export function importToPart(item: PartImport, id: string): Part {
  const r = item.part;
  return {
    id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    categoryId: r.category_id,
    oemPartNumber: r.oem_part_number,
    brand: r.brand,
    condition: r.condition,
    supplier: r.supplier,
    supplierCostUsd: r.supplier_cost_usd,
    marginPct: r.margin_pct,
    usShippingUsd: r.us_shipping_usd,
    weightKg: r.weight_kg,
    lengthCm: r.length_cm,
    widthCm: r.width_cm,
    heightCm: r.height_cm,
    dutyPct: r.duty_pct,
    highRisk: r.high_risk,
    imageUrl: null,
    active: r.active,
    fitments: item.fitments.map((f) => ({
      modelId: f.model_id,
      yearFrom: f.year_from,
      yearTo: f.year_to,
      engine: f.engine,
      notes: null,
    })),
  };
}
