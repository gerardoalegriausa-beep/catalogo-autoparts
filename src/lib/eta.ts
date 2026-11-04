import type { StageDays } from "./config";
import { limaDate } from "./format";
import { ORDER_STATUSES, type OrderEvent, type OrderStatus } from "./types";

export type TimelineStep = {
  status: (typeof ORDER_STATUSES)[number];
  done: boolean;
  current: boolean;
  date: string; // ISO; real si done, estimada si no
  estimated: boolean;
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Línea de tiempo del pedido: fechas reales de las etapas cumplidas y fechas
 * estimadas para las pendientes, contando desde la última etapa cumplida
 * (o desde hoy, si esa etapa ya debería haberse completado).
 */
export function buildTimeline(
  status: OrderStatus,
  events: OrderEvent[],
  createdAt: string,
  stageDays: StageDays,
  now: Date,
): TimelineStep[] {
  const reachedAt = new Map<string, string>();
  reachedAt.set("recibido", createdAt);
  for (const e of events) {
    if (e.status !== "cancelado") reachedAt.set(e.status, e.createdAt);
  }
  // En un pedido cancelado se marcan como cumplidas las etapas que alcanzó.
  const cancelled = status === "cancelado";
  const currentIdx = cancelled
    ? Math.max(...ORDER_STATUSES.map((s, i) => (reachedAt.has(s) ? i : 0)))
    : ORDER_STATUSES.indexOf(status);

  let cursor = new Date(createdAt).getTime();
  const steps: TimelineStep[] = [];
  ORDER_STATUSES.forEach((s, idx) => {
    const done = currentIdx >= idx;
    if (done) {
      const at = reachedAt.get(s) ?? new Date(cursor).toISOString();
      cursor = new Date(at).getTime();
      steps.push({ status: s, done, current: !cancelled && idx === currentIdx, date: at, estimated: false });
      return;
    }
    // Si la etapa anterior lleva más tiempo que lo previsto, la estimación parte de hoy.
    const days = stageDays[s as keyof StageDays] ?? 0;
    const base = idx === currentIdx + 1 ? Math.max(cursor, now.getTime() - days * DAY) : cursor;
    cursor = base + days * DAY;
    steps.push({ status: s, done, current: false, date: new Date(cursor).toISOString(), estimated: true });
  });
  return steps;
}

export function estimatedDelivery(steps: TimelineStep[]): string {
  return limaDate(steps[steps.length - 1].date);
}

/** Total de días estimados desde el pedido hasta la entrega. */
export function totalLeadDays(stageDays: StageDays): number {
  return Object.values(stageDays).reduce((a, b) => a + b, 0);
}
