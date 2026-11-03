import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OrderTimeline } from "@/components/order-timeline";
import { PriceBreakdown } from "@/components/price-breakdown";
import { FitmentBadge, StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { MODEL_NAMES, STATUS_LABELS } from "@/lib/catalog-labels";
import { getStageDays } from "@/lib/config";
import { buildTimeline, estimatedDelivery } from "@/lib/eta";
import { formatDate, formatDateTime, whatsappLink } from "@/lib/format";
import { getStore } from "@/lib/store";
import { ORDER_STATUSES, type Order } from "@/lib/types";
import { saveAdminNotes } from "../../actions";
import { StatusForm } from "./status-form";

export const metadata: Metadata = { title: "Pedido", robots: { index: false } };

export default function AdminOrderPage({ params }: PageProps<"/admin/pedidos/[id]">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8 text-sm text-ink-soft">Cargando pedido…</div>}>
      <AdminOrder params={params} />
    </Suspense>
  );
}

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

function whatsappMessage(order: Order, trackingUrl: string): string {
  const status = STATUS_LABELS[order.status];
  return [
    `Hola ${order.contactName}, le escribimos por su pedido ${order.reference} (${order.partName}).`,
    `Estado: ${status}.`,
    order.estimatedDelivery && order.status !== "entregado" && order.status !== "cancelado"
      ? `Entrega estimada: ${formatDate(order.estimatedDelivery)}.`
      : null,
    `Puede ver el avance aquí: ${trackingUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}

async function AdminOrder({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const order = await getStore().getOrder(id);
  if (!order) notFound();

  const trackingUrl = `${await origin()}/pedido/${order.trackingToken}`;
  const steps = buildTimeline(order.status, order.events, order.createdAt, getStageDays(), new Date());
  const car = order.vinDecoded;
  const idx = ORDER_STATUSES.indexOf(order.status as (typeof ORDER_STATUSES)[number]);
  const next = idx >= 0 && idx < ORDER_STATUSES.length - 1 ? ORDER_STATUSES[idx + 1] : null;
  const closed = order.status === "entregado" || order.status === "cancelado";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <Link href="/admin" className="text-sm text-ink-soft hover:text-accent">
        ← Pedidos
      </Link>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">
            {order.reference} · {order.partName}
          </h1>
          <p className="mt-1 text-sm text-ink-soft">Recibido el {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge status={order.status} />
          <FitmentBadge fitment={order.fitment} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section className="card p-6">
            <h2 className="font-semibold">Validación del VIN</h2>
            <p className="mt-3 font-mono text-lg tracking-wider">{order.vin}</p>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <Info label="Vehículo" value={car ? [car.make, car.modelId ? MODEL_NAMES[car.modelId] : car.model].filter(Boolean).join(" ") : null} />
              <Info label="Año" value={car?.modelYear ? String(car.modelYear) : null} />
              <Info label="Motor" value={car?.engine ?? null} />
              <Info label="Versión" value={car?.trim ?? null} />
              <Info label="Fuente" value={car?.source === "nhtsa" ? "NHTSA" : "Solo lectura local"} />
              <Info label="N.º de parte anterior" value={order.oldPartNumber} mono />
            </dl>
            <p className="mt-4 text-sm">{order.fitment.reason}</p>
            {order.vinWarnings.map((w) => (
              <p key={w} className="mt-2 text-sm text-warn">
                {w}
              </p>
            ))}
            {order.customerNotes && (
              <p className="mt-4 rounded-lg bg-paper p-3 text-sm">
                <span className="font-medium">Notas del taller:</span> {order.customerNotes}
              </p>
            )}
          </section>

          <section className="card p-6">
            <h2 className="font-semibold">Actualizar estado</h2>
            {closed ? (
              <p className="mt-2 text-sm text-ink-soft">Este pedido está cerrado ({STATUS_LABELS[order.status]}).</p>
            ) : (
              <StatusForm orderId={order.id} next={next} />
            )}
            <a
              href={whatsappLink(order.phone, whatsappMessage(order, trackingUrl))}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary mt-4"
            >
              Avisar al taller por WhatsApp
            </a>
          </section>

          <section className="card p-6">
            <h2 className="mb-5 font-semibold">Línea de tiempo</h2>
            <OrderTimeline steps={steps} events={order.events} cancelled={order.status === "cancelado"} />
            {!closed && <p className="mt-4 text-sm text-ink-soft">Entrega estimada: {formatDate(estimatedDelivery(steps))}</p>}
          </section>
        </div>

        <div className="space-y-6">
          <section className="card p-6 text-sm">
            <h2 className="mb-3 font-semibold">Taller</h2>
            <p className="font-medium">{order.shopName}</p>
            {order.shopRuc && <p className="text-ink-soft">RUC {order.shopRuc}</p>}
            <p className="mt-2">{order.contactName}</p>
            <p className="text-ink-soft">{order.phone}</p>
            {order.email && <p className="text-ink-soft">{order.email}</p>}
            <p className="mt-3 break-all text-xs text-ink-soft">
              Enlace de seguimiento:{" "}
              <a href={trackingUrl} className="text-accent" target="_blank" rel="noopener noreferrer">
                {trackingUrl}
              </a>
            </p>
          </section>
          <section className="card p-6">
            <h2 className="mb-3 font-semibold">Precio cobrado</h2>
            {order.partNumber && (
              <p className="mb-3 text-sm text-ink-soft">
                N.º de parte del catálogo: <span className="font-mono text-ink">{order.partNumber}</span>
              </p>
            )}
            <PriceBreakdown price={order.priceBreakdown} />
          </section>
          <section className="card p-6">
            <h2 className="mb-3 font-semibold">Notas internas</h2>
            <form action={saveAdminNotes.bind(null, order.id)} className="space-y-3">
              <textarea
                name="adminNotes"
                defaultValue={order.adminNotes ?? ""}
                rows={4}
                className="field"
                placeholder="Proveedor, N.º de orden de compra, tracking de Miami… (el taller no lo ve)"
              />
              <button type="submit" className="btn-secondary">
                Guardar notas
              </button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, mono = false }: { label: string; value: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-ink-soft">{label}</dt>
      <dd className={`font-medium ${mono ? "font-mono" : ""}`}>{value || "—"}</dd>
    </div>
  );
}
