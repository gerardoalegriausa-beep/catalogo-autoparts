import { isAdmin } from "@/lib/auth";
import { partsToCsv } from "@/lib/parts-csv";
import { getStore } from "@/lib/store";

/** Descarga de la hoja de repuestos actual (solo con sesión del panel). */
export async function GET() {
  if (!(await isAdmin())) return new Response("No autorizado", { status: 401 });
  const parts = await getStore().listAllParts();
  const date = new Date().toISOString().slice(0, 10);
  // El BOM hace que Excel lea bien las tildes.
  return new Response("﻿" + partsToCsv(parts), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="repuestos-${date}.csv"`,
      "cache-control": "no-store",
    },
  });
}
