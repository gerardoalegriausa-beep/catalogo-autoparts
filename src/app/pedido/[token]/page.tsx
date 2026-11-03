import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { OrderTimeline } from "@/components/order-timeline";
import { PriceBreakdown } from "@/components/price-breakdown";
import { MODEL_NAMES, STATUS_LABELS } from "@/lib/catalog-labels";
import { contactWhatsapp, getStageDays } from "@/lib/config";
import { buildTimeline, estimatedDelivery } from "@/lib/eta";
import { formatDate, whatsappLink } from "@/lib/format";
import { getStore } from "@/lib/store";

export const metadata: Metadata = { title: "Seguimiento del pedido", robots: { index: false } };

export default function TrackingPage({ params, searchParams }: PageProps<"/pedido/[token]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-4xl px-4 py-8 text-sm text-ink-soft">Cargando pedido…</div>}>
      <Tracking params={params} searchParams={searchParams} />
    </Suspense>
  );
}

async function Tracking({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await connection();
  const { token } = await params;
  const isNew = (await searchParams).nuevo === "1";
  const order = await getStore().getOrderByToken(token);
  if (!order) notFound();

  const cancelled = order.status === "cancelado";
  const steps = buildTimeline(order.status, order.events, order.createdAt, getStageDays(), new Date());
  const eta = estimatedDelivery(steps);
  const car = order.vinDecoded;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {isNew && (
        <div className="mb-6 rounded-xl border border-ok/30 bg-ok-soft p-4 text-ok">
          <p className="font-semibold">¡Pedido recibido!</p>
          <p className="mt-1 text-sm">
            Guarda este enlace para ver el avance. Te escribiremos por WhatsApp cuando validemos el VIN.
          </p>
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-ink-soft">Pedido {order.reference}</p>
          <h1 className="text-2xl font-bold">{order.partName}</h1>
          <p className="mt-1 text-ink-soft">
            {order.shopName}
            {order.quantity > 1 && ` · ${order.quantity} unidades`}
          </p>
        </div>
        <div className="text-right">
          {cancelled ? (
            <span className="chip bg-bad-soft text-bad">{STATUS_LABELS.cancelado}</span>
          ) : order.status === "entregado" ? (
            <span className="chip bg-ok-soft text-ok">Entregado</span>
          ) : (
            <>
              <p className="text-sm text-ink-soft">Entrega estimada</p>
              <p className="text-xl font-bold">{formatDate(eta)}</p>
            </>
          )}
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1.3fr_1fr]">
        <section className="card p-6">
          <h2 className="mb-5 font-semibold">Estado del pedido</h2>
          {cancelled && (
            <p className="mb-5 rounded-lg bg-bad-soft p-3 text-sm text-bad">
              {order.events.findLast((e) => e.status === "cancelado")?.note || "Este pedido fue cancelado."}
            </p>
          )}
          <OrderTimeline steps={steps} events={order.events} cancelled={cancelled} />
        </section>

        <div className="space-y-6">
          <section className="card p-6 text-sm">
            <h2 className="mb-3 font-semibold">Vehículo</h2>
            <p className="font-mono tracking-wider">{order.vin}</p>
            {car && (car.modelId || car.model) && (
              <p className="mt-1 text-ink-soft">
                {[car.make, car.modelId ? MODEL_NAMES[car.modelId] : car.model, car.modelYear].filter(Boolean).join(" ")}
              </p>
            )}
            {order.oldPartNumber && (
              <p className="mt-3 text-ink-soft">
                N.º de parte anterior: <span className="font-mono text-ink">{order.oldPartNumber}</span>
              </p>
            )}
          </section>
          <section className="card p-6">
            <h2 className="mb-3 font-semibold">Total</h2>
            <PriceBreakdown price={order.priceBreakdown} />
          </section>
          {contactWhatsapp && (
            <a
              href={whatsappLink(contactWhatsapp, `Hola, consulto por el pedido ${order.reference}.`)}
              className="btn-secondary w-full"
              target="_blank"
              rel="noopener noreferrer"
            >
              Consultar por WhatsApp
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
