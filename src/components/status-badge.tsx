import { STATUS_LABELS } from "@/lib/catalog-labels";
import type { FitmentResult, OrderStatus } from "@/lib/types";

const STATUS_TONE: Record<OrderStatus, string> = {
  recibido: "bg-warn-soft text-warn",
  vin_verificado: "bg-paper text-brand",
  comprado_usa: "bg-paper text-brand",
  en_miami: "bg-paper text-brand",
  en_aduanas: "bg-paper text-brand",
  entregado: "bg-ok-soft text-ok",
  cancelado: "bg-bad-soft text-bad",
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`chip ${STATUS_TONE[status]}`}>{STATUS_LABELS[status]}</span>;
}

const FITMENT: Record<FitmentResult["status"], [string, string]> = {
  compatible: ["VIN compatible", "bg-ok-soft text-ok"],
  incompatible: ["VIN incompatible", "bg-bad-soft text-bad"],
  sin_datos: ["Revisar VIN a mano", "bg-warn-soft text-warn"],
};

export function FitmentBadge({ fitment }: { fitment: FitmentResult }) {
  const [label, tone] = FITMENT[fitment.status];
  return <span className={`chip ${tone}`}>{label}</span>;
}
