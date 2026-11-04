"use server";

import { updateTag } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { fitmentsToText, importToPart, MAX_CSV_BYTES, parseCsv, rowsToParts, type PartImport } from "@/lib/parts-csv";
import { getStore } from "@/lib/store";
import type { Part } from "@/lib/types";

export type CsvPreview = {
  errors: string[];
  total: number;
  created: { slug: string; name: string }[];
  updated: { slug: string; name: string; changes: string[] }[];
  unchanged: number;
};

export type CsvImportResult = { ok: true; created: number; updated: number } | { ok: false; errors: string[] };

function parse(text: string): { parts: PartImport[]; errors: string[] } {
  if (typeof text !== "string" || text.length === 0) return { parts: [], errors: ["El archivo está vacío."] };
  if (text.length > MAX_CSV_BYTES) return { parts: [], errors: ["El archivo es muy grande (máximo unas 3,000 piezas)."] };
  return rowsToParts(parseCsv(text));
}

const LABELS: [keyof Part, string][] = [
  ["name", "nombre"],
  ["description", "descripción"],
  ["categoryId", "categoría"],
  ["oemPartNumber", "N.º de parte"],
  ["brand", "marca"],
  ["condition", "condición"],
  ["supplier", "proveedor"],
  ["supplierCostUsd", "costo"],
  ["marginPct", "margen"],
  ["usShippingUsd", "envío EE. UU."],
  ["weightKg", "peso"],
  ["lengthCm", "medidas"],
  ["widthCm", "medidas"],
  ["heightCm", "medidas"],
  ["dutyPct", "arancel"],
  ["highRisk", "requiere N.º de parte"],
  ["active", "activo"],
];

function diff(before: Part, after: Part): string[] {
  const changes = new Set<string>();
  for (const [key, label] of LABELS) if (before[key] !== after[key]) changes.add(label);
  if (fitmentsToText(before.fitments) !== fitmentsToText(after.fitments)) changes.add("compatibilidad");
  return [...changes];
}

/** Compara la hoja con lo guardado: qué piezas son nuevas, cuáles cambian y cuáles quedan igual. */
async function compare(parts: PartImport[]) {
  const existing = new Map((await getStore().listAllParts()).map((p) => [p.slug, p]));
  const created: PartImport[] = [];
  const updated: { item: PartImport; changes: string[] }[] = [];
  let unchanged = 0;
  for (const item of parts) {
    const before = existing.get(item.part.slug);
    if (!before) {
      created.push(item);
      continue;
    }
    const changes = diff(before, importToPart(item, before.id));
    if (changes.length) updated.push({ item, changes });
    else unchanged++;
  }
  return { created, updated, unchanged };
}

export async function previewPartsCsv(text: string): Promise<CsvPreview> {
  await requireAdmin();
  const { parts, errors } = parse(text);
  if (errors.length) return { errors, total: parts.length, created: [], updated: [], unchanged: 0 };
  const { created, updated, unchanged } = await compare(parts);
  return {
    errors: [],
    total: parts.length,
    created: created.map((i) => ({ slug: i.part.slug, name: i.part.name })),
    updated: updated.map((u) => ({ slug: u.item.part.slug, name: u.item.part.name, changes: u.changes })),
    unchanged,
  };
}

export async function importPartsCsv(text: string): Promise<CsvImportResult> {
  await requireAdmin();
  const { parts, errors } = parse(text);
  if (errors.length) return { ok: false, errors };
  const { created, updated } = await compare(parts);
  // Solo se guardan las piezas nuevas o con cambios.
  try {
    await getStore().upsertParts([...created, ...updated.map((u) => u.item)]);
  } catch (e) {
    return { ok: false, errors: [`No se pudo guardar: ${(e as Error).message}`] };
  }
  updateTag(CATALOG_TAG);
  return { ok: true, created: created.length, updated: updated.length };
}
