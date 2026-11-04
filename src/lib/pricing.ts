import type { Part, PriceBreakdown } from "./types";
import type { PricingConfig } from "./config";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Peso cobrable: el mayor entre el peso real y el volumétrico. */
export function chargeableWeightKg(
  part: Pick<Part, "weightKg" | "lengthCm" | "widthCm" | "heightCm">,
  volumetricDivisor: number,
): number {
  const volumetric = (part.lengthCm * part.widthCm * part.heightCm) / volumetricDivisor;
  return round2(Math.max(part.weightKg, volumetric));
}

/**
 * Precio final puesto en el taller (DDP), en dólares.
 *
 * 1. Producto  = costo proveedor × (1 + margen) + envío dentro de EE. UU.
 * 2. Flete     = máx(mínimo, kg cobrables × tarifa)   (Miami → Lima)
 * 3. Seguro    = % sobre el producto
 * 4. Valor CIF = producto + flete + seguro
 * 5. Arancel   = CIF × ad valorem
 * 6. IGV + IPM = (CIF + arancel) × 18 %
 * 7. Gestión de aduana y entrega (fijo por pedido)
 * 8. Comisión de pago calculada para que el neto cubra todo lo anterior
 */
export function priceBreakdown(
  part: Pick<
    Part,
    | "supplierCostUsd"
    | "marginPct"
    | "usShippingUsd"
    | "weightKg"
    | "lengthCm"
    | "widthCm"
    | "heightCm"
    | "dutyPct"
  >,
  config: PricingConfig,
  quantity = 1,
): PriceBreakdown {
  const qty = Math.max(1, Math.floor(quantity));
  const margin = (part.marginPct ?? config.defaultMarginPct) / 100;
  const duty = (part.dutyPct ?? config.defaultDutyPct) / 100;

  const productUsd = round2(part.supplierCostUsd * (1 + margin) + part.usShippingUsd);
  const chargeableKg = chargeableWeightKg(part, config.volumetricDivisor);

  // Flete y gestión se calculan por pedido (todas las unidades viajan juntas).
  const freightTotal = Math.max(config.freightMinUsd, chargeableKg * qty * config.freightUsdPerKg);
  const productTotal = productUsd * qty;
  const insuranceTotal = productTotal * (config.insurancePct / 100);
  const cif = productTotal + freightTotal + insuranceTotal;
  const dutiesTotal = cif * duty;
  const igvTotal = (cif + dutiesTotal) * (config.igvPct / 100);
  const beforeFee = cif + dutiesTotal + igvTotal + config.handlingUsd;
  const pct = config.paymentFeePct / 100;
  const withFee = pct < 1 ? (beforeFee + config.paymentFeeFixedUsd) / (1 - pct) : beforeFee;
  const feeTotal = withFee - beforeFee;

  const totalUsd = round2(withFee);
  return {
    productUsd,
    freightUsd: round2(freightTotal),
    chargeableKg,
    insuranceUsd: round2(insuranceTotal),
    dutiesUsd: round2(dutiesTotal),
    igvUsd: round2(igvTotal),
    handlingUsd: round2(config.handlingUsd),
    paymentFeeUsd: round2(feeTotal),
    unitTotalUsd: round2(totalUsd / qty),
    quantity: qty,
    totalUsd,
  };
}
