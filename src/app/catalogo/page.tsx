import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PartCard } from "@/components/part-card";
import { filterParts, getParts } from "@/lib/catalog";
import { CATEGORIES, CATEGORY_NAMES, MODELS, MODEL_NAMES } from "@/lib/catalog-labels";
import { parseFilter, type Search } from "@/lib/catalog-filter";

export const metadata: Metadata = { title: "Catálogo" };

export default function CatalogPage({ searchParams }: PageProps<"/catalogo">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Catálogo de repuestos Volvo</h1>
      <Suspense fallback={<p className="mt-6 text-sm text-ink-soft">Cargando catálogo…</p>}>
        <Results searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Results({ searchParams }: { searchParams: Promise<Search> }) {
  const filter = parseFilter(await searchParams);
  await connection(); // la lista de años usa la fecha actual
  const parts = filterParts(await getParts(), filter);
  const years = Array.from({ length: new Date().getFullYear() + 2 - 2016 }, (_, i) => 2016 + i).reverse();

  return (
    <>
      <form className="card mt-5 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto_1.5fr_auto] sm:items-end" action="/catalogo">
        <div>
          <label className="label" htmlFor="modelo">
            Modelo
          </label>
          <select id="modelo" name="modelo" defaultValue={filter.modelId ?? ""} className="field">
            <option value="">Todos</option>
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="categoria">
            Categoría
          </label>
          <select id="categoria" name="categoria" defaultValue={filter.categoryId ?? ""} className="field">
            <option value="">Todas</option>
            {CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="anio">
            Año
          </label>
          <select id="anio" name="anio" defaultValue={filter.year ? String(filter.year) : ""} className="field">
            <option value="">Todos</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="q">
            Buscar
          </label>
          <input id="q" name="q" defaultValue={filter.q ?? ""} placeholder="Ej.: bomba de agua, ABS" className="field" />
        </div>
        <button className="btn-primary" type="submit">
          Filtrar
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        {parts.length === 1 ? "1 repuesto" : `${parts.length} repuestos`}
        {filter.modelId && ` para ${MODEL_NAMES[filter.modelId]}`}
        {filter.year && ` ${filter.year}`}
        {filter.categoryId && ` en ${CATEGORY_NAMES[filter.categoryId]}`}
      </p>

      {parts.length === 0 ? (
        <div className="card mt-4 p-8 text-center">
          <p className="font-semibold">No encontramos repuestos con esos filtros.</p>
          <p className="mt-1 text-sm text-ink-soft">
            Si necesitas una pieza que no está en el catálogo, escríbenos con el VIN y la cotizamos.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {parts.map((p) => (
            <PartCard key={p.id} part={p} />
          ))}
        </div>
      )}
    </>
  );
}
