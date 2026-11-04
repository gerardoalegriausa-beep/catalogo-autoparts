#!/usr/bin/env node
// Carga o actualiza repuestos en Supabase desde un CSV.
//
//   node scripts/import-parts.mjs data/repuestos-ejemplo.csv --dry-run   (solo valida)
//   node scripts/import-parts.mjs mis-repuestos.csv                      (sube a Supabase)
//
// Necesita SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY (en .env.local o en el entorno).
// Las piezas se identifican por "slug": si ya existe se actualiza y su
// compatibilidad se reemplaza por la del CSV.

import { readFileSync, existsSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { parseCsv, rowsToParts } from "../src/lib/parts-csv.ts";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const dryRun = args.includes("--dry-run");

if (!file) {
  console.error("Uso: node scripts/import-parts.mjs <archivo.csv> [--dry-run]");
  process.exit(1);
}

if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const { parts, errors } = rowsToParts(parseCsv(readFileSync(file, "utf8")));
if (errors.length) {
  console.error(`Se encontraron ${errors.length} errores. No se subió nada:\n`);
  for (const e of errors) console.error(`  • ${e}`);
  process.exit(1);
}
console.log(`CSV válido: ${parts.length} repuestos.`);
if (dryRun) process.exit(0);

const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Faltan SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}
const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const { data: saved, error } = await db
  .from("parts")
  .upsert(
    parts.map((p) => p.part),
    { onConflict: "slug" },
  )
  .select("id, slug");
if (error) {
  console.error("Error al guardar piezas:", error.message);
  process.exit(1);
}

const idBySlug = new Map(saved.map((r) => [r.slug, r.id]));
const ids = [...idBySlug.values()];
const del = await db.from("part_fitments").delete().in("part_id", ids);
if (del.error) {
  console.error("Error al limpiar compatibilidades:", del.error.message);
  process.exit(1);
}
const fitRows = parts.flatMap((p) => p.fitments.map((f) => ({ ...f, part_id: idBySlug.get(p.part.slug) })));
const ins = await db.from("part_fitments").insert(fitRows);
if (ins.error) {
  console.error("Error al guardar compatibilidades:", ins.error.message);
  process.exit(1);
}

console.log(`Listo: ${saved.length} repuestos y ${fitRows.length} compatibilidades guardados.`);
console.log('Pulsa "Refrescar catálogo" en el panel para verlos en la web de inmediato.');
