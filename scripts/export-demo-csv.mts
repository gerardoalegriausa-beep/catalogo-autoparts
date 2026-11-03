// Genera data/repuestos-ejemplo.csv a partir del catálogo de demostración.
//   npm run export-demo-csv
import { writeFileSync } from "node:fs";
import { DEMO_PARTS } from "../src/data/demo-catalog.ts";
import { COLUMNS, toCsv } from "./parts-csv.mjs";

const rows = DEMO_PARTS.map((p) => {
  const values: Record<string, unknown> = {
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
    activo: "si",
    compatibilidad: p.fitments
      .map((f) => `${f.modelId}:${f.yearFrom}-${f.yearTo ?? ""}${f.engine ? `:${f.engine}` : ""}`)
      .join(";"),
  };
  return COLUMNS.map((c) => values[c]);
});

writeFileSync(new URL("../data/repuestos-ejemplo.csv", import.meta.url), toCsv([COLUMNS, ...rows]));
console.log(`data/repuestos-ejemplo.csv: ${rows.length} repuestos`);
