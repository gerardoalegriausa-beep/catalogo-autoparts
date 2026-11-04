// Parámetros del negocio. Todos se pueden cambiar con variables de entorno
// (en Vercel: Settings → Environment Variables) sin tocar el código.
// Los valores por defecto son SUPUESTOS para arrancar: confírmalos con tu
// forwarder y tu agente de aduanas antes de vender.

function num(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

export type PricingConfig = {
  defaultMarginPct: number; // margen de la LLC sobre el costo del proveedor
  freightUsdPerKg: number; // tarifa del forwarder Miami → Lima
  freightMinUsd: number; // cobro mínimo por envío
  volumetricDivisor: number; // cm³ / divisor = kg volumétrico (aéreo suele ser 5000 o 6000)
  insurancePct: number; // seguro sobre el valor de la mercadería
  defaultDutyPct: number; // arancel ad valorem en Perú
  igvPct: number; // IGV 16% + IPM 2%
  handlingUsd: number; // gestión de aduana y entrega por pedido
  paymentFeePct: number; // comisión de la pasarela (Stripe)
  paymentFeeFixedUsd: number;
};

export function getPricingConfig(): PricingConfig {
  return {
    defaultMarginPct: num("DEFAULT_MARGIN_PCT", 15),
    freightUsdPerKg: num("FREIGHT_USD_PER_KG", 8),
    freightMinUsd: num("FREIGHT_MIN_USD", 25),
    volumetricDivisor: num("VOLUMETRIC_DIVISOR", 5000),
    insurancePct: num("INSURANCE_PCT", 1),
    defaultDutyPct: num("DEFAULT_DUTY_PCT", 6),
    igvPct: num("IGV_PCT", 18),
    handlingUsd: num("HANDLING_USD", 15),
    paymentFeePct: num("PAYMENT_FEE_PCT", 4.4),
    paymentFeeFixedUsd: num("PAYMENT_FEE_FIXED_USD", 0.3),
  };
}

// Días estimados que toma cada etapa, para calcular la fecha prometida.
export type StageDays = {
  vin_verificado: number;
  comprado_usa: number;
  en_miami: number;
  en_aduanas: number;
  entregado: number;
};

export function getStageDays(): StageDays {
  return {
    vin_verificado: num("DAYS_VIN_CHECK", 1),
    comprado_usa: num("DAYS_PURCHASE", 1),
    en_miami: num("DAYS_TO_MIAMI", 4),
    en_aduanas: num("DAYS_MIAMI_TO_LIMA", 4),
    entregado: num("DAYS_CUSTOMS_AND_DELIVERY", 3),
  };
}

export const storeName = process.env.NEXT_PUBLIC_STORE_NAME || "Repuestos Premium";
export const contactWhatsapp = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP || "";
export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
