import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { FitmentBadge, StatusBadge } from "@/components/status-badge";
import { requireAdmin } from "@/lib/auth";
import { first } from "@/lib/catalog-filter";
import { formatDate, formatDateTime, formatUsd } from "@/lib/format";
import { getStore } from "@/lib/store";
import type { OrderStatus } from "@/lib/types";
import { logout, refreshCatalog } from "./actions";

export const metadata: Metadata = { title: "Pedidos", robots: { index: false } };

const TABS: { id: string; label: string; statuses: OrderStatus[] }[] = [
  { id: "por-validar", label: "Por validar", statuses: ["recibido"] },
  { id: "en-curso", label: "En curso", statuses: ["vin_verificado", "comprado_usa", "en_miami", "en_aduanas"] },
  { id: "entregados", label: "Entregados", statuses: ["entregado"] },
  { id: "cancelados", label: "Cancelados", statuses: ["cancelado"] },
];

export default function AdminPage({ searchParams }: PageProps<"/admin">) {
  return (
    <Suspense fallback={<div className="mx-auto max-w-6xl px-4 py-8 text-sm text-ink-soft">Cargando pedidos…</div>}>
      <Orders searchParams={searchParams} />
    </Suspense>
  );
}

async function Orders({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdmin();
  const tabId = first((await searchParams).vista) || "por-validar";
  const tab = TABS.find((t) => t.id === tabId) ?? TABS[0];
  const all = await getStore().listOrders();
  const orders = all.filter((o) => tab.statuses.includes(o.status));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">Pedidos</h1>
        <div className="flex gap-2">
          <form action={refreshCatalog}>
            <button className="btn-secondary" type="submit" title="Vuelve a leer las piezas desde la base de datos">
              Refrescar catálogo
            </button>
          </form>
          <form action={logout}>
            <button className="btn-secondary" type="submit">
              Salir
            </button>
          </form>
        </div>
      </div>

      <nav className="mt-6 flex flex-wrap gap-2">
        {TABS.map((t) => {
          const count = all.filter((o) => t.statuses.includes(o.status)).length;
          const active = t.id === tab.id;
          return (
            <Link
              key={t.id}
              href={`/admin?vista=${t.id}`}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${active ? "bg-brand text-white" : "bg-white text-ink hover:bg-paper border border-line"}`}
            >
              {t.label} <span className={active ? "text-white/70" : "text-ink-soft"}>({count})</span>
            </Link>
          );
        })}
      </nav>

      {orders.length === 0 ? (
        <p className="card mt-6 p-8 text-center text-ink-soft">No hay pedidos en “{tab.label}”.</p>
      ) : (
        <div className="card mt-6 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-line text-ink-soft">
              <tr>
                <th className="px-4 py-3 font-medium">Pedido</th>
                <th className="px-4 py-3 font-medium">Taller</th>
                <th className="px-4 py-3 font-medium">Pieza</th>
                <th className="px-4 py-3 font-medium">VIN</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 text-right font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/pedidos/${o.id}`} className="font-semibold text-accent">
                      {o.reference}
                    </Link>
                    <p className="text-xs text-ink-soft">{formatDateTime(o.createdAt)}</p>
                  </td>
                  <td className="px-4 py-3">
                    {o.shopName}
                    <p className="text-xs text-ink-soft">{o.contactName}</p>
                  </td>
                  <td className="px-4 py-3">
                    {o.partName}
                    {o.quantity > 1 && <span className="text-ink-soft"> × {o.quantity}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <FitmentBadge fitment={o.fitment} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={o.status} />
                    {o.estimatedDelivery && o.status !== "entregado" && o.status !== "cancelado" && (
                      <p className="mt-1 text-xs text-ink-soft">Entrega: {formatDate(o.estimatedDelivery)}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatUsd(o.totalUsd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
