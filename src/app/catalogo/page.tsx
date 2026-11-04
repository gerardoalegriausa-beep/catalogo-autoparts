import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { PartCard } from "@/components/part-card";
import { VehiclePicker } from "@/components/vehicle-picker";
import { filterParts, getParts, getVehicleYears } from "@/lib/catalog";
import { CATEGORIES, CATEGORY_NAMES, MODEL_NAMES } from "@/lib/catalog-labels";
import { parseFilter, vehicleQuery, withQuery, type Search } from "@/lib/catalog-filter";

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
  const [all, years] = await Promise.all([getParts(), getVehicleYears()]);
  const parts = filterParts(all, filter);
  const vehicle = { modelId: filter.modelId, year: filter.year };
  const vq = vehicleQuery(vehicle);
  const hasVehicle = Boolean(filter.modelId && filter.year);
  const vehicleName = filter.modelId ? `Volvo ${MODEL_NAMES[filter.modelId]}${filter.year ? ` ${filter.year}` : ""}` : null;
  const keep = { categoria: filter.categoryId, q: filter.q };

  return (
    <>
      {/* 1. Vehículo */}
      {hasVehicle ? (
        <section className="card mt-5 flex flex-wrap items-center justify-between gap-3 border-brand/30 p-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-soft">Buscando repuestos para</p>
            <p className="text-lg font-bold text-brand">{vehicleName}</p>
          </div>
          <details className="w-full sm:w-auto">
            <summary className="btn-secondary cursor-pointer list-none">Cambiar vehículo</summary>
            <div className="mt-3 sm:w-[32rem]">
              <VehiclePicker years={years} initial={vehicle} keep={keep} />
              <Link href={withQuery("/catalogo", new URLSearchParams(cleanParams(keep)).toString())} className="mt-2 inline-block text-sm text-accent">
                Ver todos los modelos
              </Link>
            </div>
          </details>
        </section>
      ) : (
        <section className="card mt-5 p-4">
          <p className="font-semibold">¿Para qué vehículo es el repuesto?</p>
          <p className="mb-3 text-sm text-ink-soft">
            Elige modelo y año para ver solo lo que le sirve. También puedes{" "}
            <Link href="/vin" className="font-medium text-accent">
              buscar con el VIN
            </Link>{" "}
            o seguir explorando todo el catálogo.
          </p>
          <VehiclePicker years={years} initial={vehicle} keep={keep} />
        </section>
      )}

      {/* 2. Pieza */}
      <form className="mt-4 grid gap-3 sm:grid-cols-[1fr_1.5fr_auto] sm:items-end" action="/catalogo">
        {filter.modelId && <input type="hidden" name="modelo" value={filter.modelId} />}
        {filter.year && <input type="hidden" name="anio" value={filter.year} />}
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
          <label className="label" htmlFor="q">
            Nombre, marca o N.º de parte
          </label>
          <input id="q" name="q" defaultValue={filter.q ?? ""} placeholder="Ej.: bomba de agua, ABS" className="field" />
        </div>
        <button className="btn-secondary" type="submit">
          Buscar
        </button>
      </form>

      <p className="mt-6 text-sm text-ink-soft">
        {parts.length === 1 ? "1 repuesto" : `${parts.length} repuestos`}
        {vehicleName && ` para ${vehicleName}`}
        {filter.categoryId && ` en ${CATEGORY_NAMES[filter.categoryId]}`}
        {filter.q && ` que coinciden con “${filter.q}”`}
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
            <PartCard key={p.id} part={p} query={vq} />
          ))}
        </div>
      )}
    </>
  );
}

function cleanParams(params: Record<string, string | undefined>): Record<string, string> {
  return Object.fromEntries(Object.entries(params).filter((e): e is [string, string] => Boolean(e[1])));
}
