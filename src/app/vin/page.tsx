import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { PartCard } from "@/components/part-card";
import { VinSearch } from "@/components/vin-search";
import { filterParts, getParts } from "@/lib/catalog";
import { first } from "@/lib/catalog-filter";
import { MODEL_NAMES } from "@/lib/catalog-labels";
import { checkFitment } from "@/lib/fitment";
import { inspectVin } from "@/lib/vin-inspection";

export const metadata: Metadata = { title: "Buscar por VIN" };

export default function VinPage({ searchParams }: PageProps<"/vin">) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="text-2xl font-bold">Buscar repuestos por VIN</h1>
      <p className="mt-1 text-ink-soft">Escribe el VIN y te mostramos las piezas que corresponden al vehículo.</p>
      <Suspense fallback={<p className="mt-6 text-sm text-ink-soft">Leyendo el VIN…</p>}>
        <VinResults searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function VinResults({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const raw = first((await searchParams).vin).slice(0, 30);
  await connection(); // el año del VIN se calcula con la fecha actual

  if (!raw) {
    return (
      <div className="card mt-6 max-w-2xl p-5">
        <VinSearch />
      </div>
    );
  }

  const result = await inspectVin(raw);
  const car = result.vehicle;
  const all = await getParts();
  const parts =
    result.valid && car?.modelId
      ? filterParts(all, { modelId: car.modelId, year: car.modelYear ?? undefined }).filter(
          (p) => checkFitment(p, car).status !== "incompatible",
        )
      : [];

  return (
    <>
      <div className="card mt-6 max-w-2xl p-5">
        <VinSearch initial={result.vin} />
      </div>

      <section className="card mt-6 p-5">
        <p className="font-mono text-sm tracking-wider text-ink-soft">{result.vin}</p>
        {result.valid && car ? (
          <h2 className="mt-1 text-xl font-bold">
            {[car.make ?? "Vehículo", car.modelId ? MODEL_NAMES[car.modelId] : car.model, car.modelYear]
              .filter(Boolean)
              .join(" ")}
          </h2>
        ) : (
          <h2 className="mt-1 text-xl font-bold text-bad">No podemos usar este VIN</h2>
        )}
        {car?.engine && <p className="text-sm text-ink-soft">Motor: {car.engine}</p>}
        {result.errors.map((e) => (
          <p key={e} className="mt-2 text-sm text-bad">
            {e}
          </p>
        ))}
        {result.warnings.map((w) => (
          <p key={w} className="mt-2 text-sm text-warn">
            {w}
          </p>
        ))}
      </section>

      {result.valid && !car?.modelId && (
        <p className="mt-6 text-sm text-ink-soft">
          No pudimos identificar el modelo con este VIN. Busca la pieza en el{" "}
          <a href="/catalogo" className="font-semibold text-accent">
            catálogo
          </a>{" "}
          y al pedir validaremos el VIN a mano.
        </p>
      )}

      {result.valid && car?.modelId && (
        <>
          <h2 className="mt-8 text-lg font-bold">
            {parts.length} {parts.length === 1 ? "repuesto compatible" : "repuestos compatibles"}
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {parts.map((p) => (
              <PartCard key={p.id} part={p} />
            ))}
          </div>
        </>
      )}
    </>
  );
}
