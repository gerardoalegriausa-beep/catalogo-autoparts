import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth";
import { CATEGORY_NAMES } from "@/lib/catalog-labels";
import { getStore, isDemoMode } from "@/lib/store";
import { UploadForm } from "./upload-form";

export const metadata: Metadata = { title: "Repuestos", robots: { index: false } };

const FORMAT: [string, string][] = [
  ["slug", "Identificador único, en minúsculas y con guiones (bomba-agua-drive-e). Si ya existe, la pieza se actualiza."],
  ["categoria", "sensores-electronica, motor-refrigeracion, frenos o iluminacion"],
  ["condicion", "nuevo, reconstruido o usado"],
  ["costo_usd", "Lo que te cobra el proveedor en EE. UU."],
  ["margen_pct / arancel_pct", "Déjalos vacíos para usar los valores por defecto"],
  ["peso_kg, largo_cm, ancho_cm, alto_cm", "De la caja: el flete se cobra por el peso real o el volumétrico, el mayor"],
  ["requiere_numero_parte", "si / no. Con \"si\", el taller debe dar el N.º de parte de la pieza vieja"],
  ["activo", "si / no. Con \"no\", la pieza se oculta del catálogo"],
  ["compatibilidad", "modelo:añoDesde-añoHasta[:motor], separadas por ; (ej.: xc60:2018-;xc90:2016-2020:B4204T)"],
];

export default function PartsAdminPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-8 text-sm text-ink-soft">Cargando…</div>}>
      <PartsAdmin />
    </Suspense>
  );
}

async function PartsAdmin() {
  await requireAdmin();
  const parts = await getStore().listAllParts();
  const active = parts.filter((p) => p.active).length;
  const byCategory = Object.entries(CATEGORY_NAMES).map(([id, name]) => ({
    name,
    count: parts.filter((p) => p.active && p.categoryId === id).length,
  }));

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href="/admin" className="text-sm text-ink-soft hover:text-accent">
        ← Pedidos
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Repuestos</h1>
      <p className="mt-1 text-ink-soft">
        {active} repuestos visibles en el catálogo
        {parts.length > active && ` · ${parts.length - active} ocultos`} ·{" "}
        {byCategory.map((c) => `${c.name}: ${c.count}`).join(" · ")}
      </p>
      {isDemoMode && (
        <p className="mt-3 rounded-lg bg-warn-soft p-3 text-sm text-warn">
          Modo demostración: lo que subas se verá en el catálogo, pero se borra al reiniciar el servidor.
        </p>
      )}

      <section className="card mt-6 p-6">
        <h2 className="font-semibold">1. Descarga la hoja actual</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Ábrela en Google Sheets o Excel, agrega filas o cambia precios y guárdala como CSV. Las columnas tienen que quedar
          con los mismos nombres.
        </p>
        <a href="/admin/repuestos/csv" className="btn-secondary mt-4">
          Descargar hoja de repuestos (.csv)
        </a>
      </section>

      <section className="card mt-6 p-6">
        <h2 className="font-semibold">2. Sube la hoja editada</h2>
        <p className="mt-1 text-sm text-ink-soft">
          Primero verás qué piezas se crean y cuáles cambian. Nada se guarda hasta que confirmes. Subir una hoja nunca
          borra piezas: para ocultar una, pon <code className="font-mono">activo</code> en &quot;no&quot;.
        </p>
        <UploadForm />
      </section>

      <details className="card mt-6 p-6">
        <summary className="cursor-pointer font-semibold">Qué va en cada columna</summary>
        <dl className="mt-4 space-y-3 text-sm">
          {FORMAT.map(([col, text]) => (
            <div key={col}>
              <dt className="font-mono font-medium">{col}</dt>
              <dd className="text-ink-soft">{text}</dd>
            </div>
          ))}
        </dl>
      </details>
    </div>
  );
}
