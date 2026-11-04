"use client";

import { useActionState, useState } from "react";
import { STATUS_LABELS } from "@/lib/catalog-labels";
import type { OrderStatus } from "@/lib/types";
import { advanceStatus, type StatusFormState } from "../../actions";

const HINTS: Partial<Record<OrderStatus, string>> = {
  vin_verificado: "Busca el VIN en el catálogo original y confirma que el número de parte coincide antes de avanzar.",
  comprado_usa: "Anota en notas internas el proveedor y el número de orden de compra.",
  en_miami: "Confirma con la foto del almacén que el número de parte de la caja es el correcto.",
  en_aduanas: "Puedes poner el número de guía aérea en la nota.",
};

export function StatusForm({ orderId, next }: { orderId: string; next: OrderStatus | null }) {
  const [state, action, pending] = useActionState<StatusFormState, FormData>(advanceStatus.bind(null, orderId), {
    error: null,
  });
  const [cancelling, setCancelling] = useState(false);
  const target = cancelling ? "cancelado" : next;
  if (!target) return null;

  return (
    <form action={action} className="mt-3 space-y-3">
      <input type="hidden" name="status" value={target} />
      {!cancelling && HINTS[target] && <p className="text-sm text-ink-soft">{HINTS[target]}</p>}
      {!cancelling && target === "vin_verificado" && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="confirmPartNumber" className="mt-0.5 size-4" />
          Revisé el VIN en el catálogo original y el número de parte es correcto.
        </label>
      )}
      <div>
        <label htmlFor="note" className="label">
          {cancelling ? "Motivo de la cancelación (lo verá el taller) *" : "Nota para el taller (opcional)"}
        </label>
        <textarea id="note" name="note" rows={2} className="field" />
      </div>
      {state.error && <p className="text-sm text-bad">{state.error}</p>}
      <div className="flex flex-wrap gap-2">
        {cancelling ? (
          <>
            <button type="submit" className="btn-danger" disabled={pending}>
              Confirmar cancelación
            </button>
            <button type="button" className="btn-secondary" onClick={() => setCancelling(false)}>
              Volver
            </button>
          </>
        ) : (
          <>
            <button type="submit" className="btn-primary" disabled={pending}>
              {pending ? "Guardando…" : `Marcar: ${STATUS_LABELS[target]}`}
            </button>
            <button type="button" className="btn-danger" onClick={() => setCancelling(true)}>
              Cancelar pedido
            </button>
          </>
        )}
      </div>
    </form>
  );
}
