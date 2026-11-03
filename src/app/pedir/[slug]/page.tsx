import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PriceBreakdown } from "@/components/price-breakdown";
import { getPartBySlug } from "@/lib/catalog";
import { getPricingConfig } from "@/lib/config";
import { priceBreakdown } from "@/lib/pricing";
import { OrderForm } from "./order-form";

export const metadata: Metadata = { title: "Hacer pedido" };

export default function OrderPage({ params }: PageProps<"/pedir/[slug]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-5xl px-4 py-8 text-sm text-ink-soft">Cargando…</div>}>
      <OrderPageContent params={params} />
    </Suspense>
  );
}

async function OrderPageContent({ params }: { params: Promise<{ slug: string }> }) {
  const part = await getPartBySlug((await params).slug);
  if (!part) notFound();
  const price = priceBreakdown(part, getPricingConfig());

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <Link href={`/repuesto/${part.slug}`} className="text-sm text-ink-soft hover:text-accent">
        ← Volver al repuesto
      </Link>
      <h1 className="mt-3 text-2xl font-bold">Pedir: {part.name}</h1>
      <p className="mt-1 text-ink-soft">
        El VIN es obligatorio: con él confirmamos que la pieza corresponde al vehículo antes de comprarla.
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <OrderForm slug={part.slug} highRisk={part.highRisk} />
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
