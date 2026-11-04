import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PriceBreakdown } from "@/components/price-breakdown";
import { getPartBySlug, getVehicleYears } from "@/lib/catalog";
import { parseFilter, vehicleQuery, withQuery, type Search } from "@/lib/catalog-filter";
import { getPricingConfig } from "@/lib/config";
import { priceBreakdown } from "@/lib/pricing";
import { OrderForm } from "./order-form";

export const metadata: Metadata = { title: "Hacer pedido" };

export default function OrderPage({ params, searchParams }: PageProps<"/pedir/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-8 text-sm text-ink-soft">Cargando…</div>}>
      <OrderPageContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function OrderPageContent({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Search>;
}) {
  const part = await getPartBySlug((await params).slug);
  if (!part) notFound();
  const { modelId, year } = parseFilter(await searchParams);
  const years = await getVehicleYears();
  const price = priceBreakdown(part, getPricingConfig());

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href={withQuery(`/repuesto/${part.slug}`, vehicleQuery({ modelId, year }))} className="text-sm text-ink-soft hover:text-accent">
        ← Volver al repuesto
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Pedir: {part.name}</h1>
      <p className="mt-1 text-ink-soft">
        Antes de enviar el pedido necesitamos el VIN, el modelo y el año: con ellos confirmamos que la pieza corresponde
        al vehículo antes de comprarla.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <OrderForm slug={part.slug} highRisk={part.highRisk} years={years} initialModel={modelId} initialYear={year} />
        <aside className="card h-fit p-6">
          <h2 className="mb-4 font-semibold">Precio por unidad</h2>
          <PriceBreakdown price={price} />
          <p className="mt-4 text-xs text-ink-soft">
            Si pides más de una unidad, el flete se calcula por el peso total y la gestión de aduana se cobra una sola vez.
          </p>
        </aside>
      </div>
    </div>
  );
}
