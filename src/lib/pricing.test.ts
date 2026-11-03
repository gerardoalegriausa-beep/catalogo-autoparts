import { describe, expect, it } from "vitest";
import type { PricingConfig } from "./config";
import { chargeableWeightKg, priceBreakdown } from "./pricing";

const config: PricingConfig = {
  defaultMarginPct: 15,
  freightUsdPerKg: 8,
  freightMinUsd: 25,
  volumetricDivisor: 5000,
  insurancePct: 1,
  defaultDutyPct: 6,
  igvPct: 18,
  handlingUsd: 15,
  paymentFeePct: 0,
  paymentFeeFixedUsd: 0,
};

const part = {
  supplierCostUsd: 100,
  marginPct: null,
  usShippingUsd: 0,
  weightKg: 2,
  lengthCm: 10,
  widthCm: 10,
  heightCm: 10,
  dutyPct: null,
};

describe("chargeableWeightKg", () => {
  it("usa el peso volumétrico cuando es mayor", () => {
    // 75×50×40 / 5000 = 30 kg volumétricos contra 6 kg reales
    expect(chargeableWeightKg({ weightKg: 6, lengthCm: 75, widthCm: 50, heightCm: 40 }, 5000)).toBe(30);
    expect(chargeableWeightKg({ weightKg: 2, lengthCm: 10, widthCm: 10, heightCm: 10 }, 5000)).toBe(2);
  });
});

describe("priceBreakdown", () => {
  it("calcula el precio puesto en taller paso a paso", () => {
    const b = priceBreakdown(part, config);
    expect(b.productUsd).toBe(115); // 100 + 15 %
    expect(b.freightUsd).toBe(25); // 2 kg × 8 = 16 → mínimo 25
    expect(b.insuranceUsd).toBe(1.15);
    // CIF = 141.15; arancel 6 % = 8.469; IGV 18 % de 149.619 = 26.93142
    expect(b.dutiesUsd).toBe(8.47);
    expect(b.igvUsd).toBe(26.93);
    expect(b.totalUsd).toBe(191.55); // 141.15 + 8.469 + 26.93142 + 15
  });

  it("respeta margen y arancel propios de la pieza", () => {
    const b = priceBreakdown({ ...part, marginPct: 12, dutyPct: 0 }, config);
    expect(b.productUsd).toBe(112);
    expect(b.dutiesUsd).toBe(0);
  });

  it("agrega la comisión de pago para que el neto cubra el total", () => {
    const withFee = priceBreakdown(part, { ...config, paymentFeePct: 4.4, paymentFeeFixedUsd: 0.3 });
    const net = withFee.totalUsd * (1 - 0.044) - 0.3;
    expect(net).toBeCloseTo(191.55, 1);
    expect(withFee.paymentFeeUsd).toBeGreaterThan(8);
  });

  it("multiplica por cantidad con un solo flete y una sola gestión", () => {
    const one = priceBreakdown({ ...part, weightKg: 5 }, config);
    const two = priceBreakdown({ ...part, weightKg: 5 }, config, 2);
    expect(one.freightUsd).toBe(40);
    expect(two.freightUsd).toBe(80);
    expect(two.handlingUsd).toBe(15);
    expect(two.quantity).toBe(2);
    expect(two.totalUsd).toBeLessThan(one.totalUsd * 2);
  });
});
