import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CategoryIcon } from "@/components/category-icon";
import { PriceBreakdown } from "@/components/price-breakdown";
import { getPartBySlug } from "@/lib/catalog";
import { CATEGORY_NAMES, CONDITION_LABELS, MODEL_NAMES } from "@/lib/catalog-labels";
import { getPricingConfig, getStageDays } from "@/lib/config";
import { totalLeadDays } from "@/lib/eta";
import { parseFilter, vehicleQuery, withQuery, type Search } from "@/lib/catalog-filter";
import { checkFitment, fitmentYears } from "@/lib/fitment";
import { priceBreakdown } from "@/lib/pricing";
import type { ModelId, Part } from "@/lib/types";

export async function generateMetadata({ params }: PageProps<"/repuesto/[slug]">) {
  const part = await getPartBySlug((await params).slug);
  return { title: part?.name ?? "Repuesto" };
}

export default function PartPage({ params, searchParams }: PageProps<"/repuesto/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8 text-sm text-ink-soft">Cargando…</div>}>
      <PartDetail params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function PartDetail({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<Search> }) {
  const part = await getPartBySlug((await params).slug);
  if (!part) notFound();
  const { modelId, year } = parseFilter(await searchParams);
  const vq = vehicleQuery({ modelId, year });
  const price = priceBreakdown(part, getPricingConfig());
  const leadDays = totalLeadDays(getStageDays());

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-sm text-ink-soft">
        <Link href={withQuery("/catalogo", vq)} className="hover:text-accent">
          Catálogo
        </Link>{" "}
        /{" "}
        <Link href={withQuery("/catalogo", [vq, `categoria=${part.categoryId}`].filter(Boolean).join("&"))} className="hover:text-accent">
          {CATEGORY_NAMES[part.categoryId]}
        </Link>
      </nav>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-paper text-brand">
                <CategoryIcon category={part.categoryId} className="size-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold leading-tight">{part.name}</h1>
                <p className="mt-1 text-ink-soft">
                  {part.brand} · {CONDITION_LABELS[part.condition]}
                </p>
              </div>
            </div>
            <p className="mt-5 leading-relaxed">{part.description}</p>
            <dl className="mt-5 grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
              <div>
                <dt className="text-ink-soft">N.º de parte</dt>
                <dd className="font-mono font-medium">{part.oemPartNumber ?? "Se confirma con tu VIN"}</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Peso</dt>
                <dd className="font-medium">{part.weightKg} kg</dd>
              </div>
              <div>
                <dt className="text-ink-soft">Entrega estimada</dt>
                <dd className="font-medium">{leadDays} días</dd>
              </div>
            </dl>
            {part.highRisk && (
              <p className="mt-5 rounded-lg bg-warn-soft p-3 text-sm text-warn">
                Esta pieza es delicada de compatibilidad. Al pedir te pediremos el número de parte de la pieza que vas a
                reemplazar (está en su etiqueta).
              </p>
            )}
          </div>

          <div className="card p-6">
            <h2 className="font-semibold">Compatibilidad</h2>
            <p className="mt-1 text-sm text-ink-soft">
              La compatibilidad final se confirma con el VIN antes de comprar la pieza.
            </p>
            <table className="mt-4 w-full text-left text-sm">
              <thead className="text-ink-soft">
                <tr className="border-b border-line">
                  <th className="py-2 font-medium">Modelo</th>
                  <th className="py-2 font-medium">Años</th>
                  <th className="py-2 font-medium">Motor</th>
                </tr>
              </thead>
              <tbody>
                {part.fitments.map((f, i) => (
                  <tr key={i} className="border-b border-line last:border-0">
                    <td className="py-2 font-medium">{MODEL_NAMES[f.modelId]}</td>
                    <td className="py-2">{fitmentYears(f)}</td>
                    <td className="py-2">{f.engine ?? "Todos"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="card h-fit p-6 lg:sticky lg:top-6">
          {modelId && year && <VehicleFit part={part} modelId={modelId} year={year} />}
          <PriceBreakdown price={price} />
          <Link href={withQuery(`/pedir/${part.slug}`, vq)} className="btn-primary mt-6 w-full">
            Pedir con el VIN del vehículo
          </Link>
          <p className="mt-3 text-center text-xs text-ink-soft">
            No compramos nada hasta validar que la pieza corresponde al vehículo.
          </p>
        </aside>
      </div>
    </div>
  );
}

function VehicleFit({ part, modelId, year }: { part: Part; modelId: ModelId; year: number }) {
  const car = `${MODEL_NAMES[modelId]} ${year}`;
  const result = checkFitment(part, {
    make: "VOLVO",
    model: MODEL_NAMES[modelId],
    modelId,
    modelYear: year,
    engine: null,
    engineCode: null,
    displacementL: null,
    fuel: null,
    bodyClass: null,
    trim: null,
    source: "local",
  });
  if (result.status === "compatible") {
    return (
      <p className="mb-5 rounded-lg border border-ok/30 bg-ok-soft p-3 text-sm text-ok">
        <span className="font-semibold">Sirve para tu {car}.</span> Lo confirmamos con el VIN al pedir.
      </p>
    );
  }
  if (result.status === "incompatible") {
    return (
      <p className="mb-5 rounded-lg border border-bad/30 bg-bad-soft p-3 text-sm text-bad">
        <span className="font-semibold">No sirve para tu {car}.</span>{" "}
        <Link href={withQuery("/catalogo", vehicleQuery({ modelId, year }) + `&categoria=${part.categoryId}`)} className="underline">
          Ver repuestos de {CATEGORY_NAMES[part.categoryId].toLowerCase()} para tu {car}
        </Link>
      </p>
    );
  }
  const engines = [...new Set(part.fitments.filter((f) => f.modelId === modelId && f.engine).map((f) => f.engine))];
  return (
    <p className="mb-5 rounded-lg border border-warn/30 bg-warn-soft p-3 text-sm text-warn">
      <span className="font-semibold">Sirve para tu {car}{engines.length ? ` con motor ${engines.join(" o ")}` : ""}.</span> Con el
      VIN confirmamos el motor antes de comprar.
    </p>
  );
}
