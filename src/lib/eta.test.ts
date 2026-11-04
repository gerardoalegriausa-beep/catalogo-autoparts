import { describe, expect, it } from "vitest";
import type { StageDays } from "./config";
import { buildTimeline, estimatedDelivery, totalLeadDays } from "./eta";

const days: StageDays = { vin_verificado: 1, comprado_usa: 1, en_miami: 4, en_aduanas: 4, entregado: 3 };
const created = "2026-11-02T15:00:00.000Z";

describe("buildTimeline", () => {
  it("estima todas las etapas desde la fecha del pedido", () => {
    const steps = buildTimeline("recibido", [], created, days, new Date(created));
    expect(steps).toHaveLength(6);
    expect(steps[0]).toMatchObject({ status: "recibido", done: true, current: true, estimated: false });
    expect(estimatedDelivery(steps)).toBe("2026-11-15"); // 13 días después
    expect(totalLeadDays(days)).toBe(13);
  });

  it("usa fechas reales de las etapas cumplidas", () => {
    const events = [{ id: "1", status: "vin_verificado" as const, note: null, createdAt: "2026-11-04T15:00:00.000Z" }];
    const steps = buildTimeline("vin_verificado", events, created, days, new Date("2026-11-04T16:00:00.000Z"));
    expect(steps[1]).toMatchObject({ done: true, current: true, date: "2026-11-04T15:00:00.000Z" });
    expect(estimatedDelivery(steps)).toBe("2026-11-16");
  });

  it("si una etapa se atrasa, la estimación parte de hoy", () => {
    const now = new Date("2026-11-10T15:00:00.000Z"); // ya debió verificarse el VIN
    const steps = buildTimeline("recibido", [], created, days, now);
    expect(steps[1].date.slice(0, 10)).toBe("2026-11-10");
    expect(estimatedDelivery(steps)).toBe("2026-11-22");
  });

  it("un pedido cancelado marca solo las etapas que alcanzó, sin etapa actual", () => {
    const events = [
      { id: "1", status: "vin_verificado" as const, note: null, createdAt: "2026-11-03T15:00:00.000Z" },
      { id: "2", status: "cancelado" as const, note: "Sin stock", createdAt: "2026-11-04T15:00:00.000Z" },
    ];
    const steps = buildTimeline("cancelado", events, created, days, new Date(created));
    expect(steps.map((s) => s.done)).toEqual([true, true, false, false, false, false]);
    expect(steps.every((s) => !s.current)).toBe(true);
  });
});

describe("fechas en hora de Lima", () => {
  it("la entrega estimada usa el día de Lima, no el de UTC", async () => {
    const { formatDate } = await import("./format");
    // 03:00 UTC del 16 es todavía 15 en Lima
    const steps = buildTimeline("recibido", [], "2026-11-03T03:00:00.000Z", days, new Date("2026-11-03T03:00:00.000Z"));
    expect(estimatedDelivery(steps)).toBe("2026-11-15");
    expect(formatDate(estimatedDelivery(steps))).toBe(formatDate(steps[5].date));
  });
});
