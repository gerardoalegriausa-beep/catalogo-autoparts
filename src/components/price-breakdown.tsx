import { formatUsd } from "@/lib/format";
import type { PriceBreakdown as Breakdown } from "@/lib/types";

export function PriceBreakdown({ price }: { price: Breakdown }) {
  const rows: [string, number, string?][] = [
    [price.quantity > 1 ? `Repuesto (${price.quantity} × ${formatUsd(price.productUsd)})` : "Repuesto", price.productUsd * price.quantity],
    ["Flete Miami → Lima", price.freightUsd, `${price.chargeableKg} kg cobrables por unidad`],
    ["Seguro", price.insuranceUsd],
    ["Arancel (ad valorem)", price.dutiesUsd],
    ["IGV + IPM", price.igvUsd],
    ["Gestión de aduana y entrega", price.handlingUsd],
    ["Comisión de pago", price.paymentFeeUsd],
  ];
  return (
    <dl className="space-y-2 text-sm">
      {rows
        .filter(([, value]) => value > 0)
        .map(([label, value, hint]) => (
          <div key={label} className="flex justify-between gap-4">
            <dt className="text-ink-soft">
              {label}
              {hint && <span className="block text-xs text-ink-soft/70">{hint}</span>}
            </dt>
            <dd className="tabular-nums">{formatUsd(value)}</dd>
          </div>
        ))}
      <div className="flex justify-between gap-4 border-t border-line pt-2 text-base font-bold">
        <dt>Total puesto en tu taller</dt>
        <dd className="tabular-nums">{formatUsd(price.totalUsd)}</dd>
      </div>
    </dl>
  );
}
