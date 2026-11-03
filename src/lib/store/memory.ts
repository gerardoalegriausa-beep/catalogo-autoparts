import { randomUUID } from "node:crypto";
import { DEMO_PARTS } from "../../data/demo-catalog";
import { importToPart } from "../parts-csv";
import type { NewOrderInput, Order, OrderStatus, Part } from "../types";
import { newReference, newTrackingToken } from "./ids";
import type { Store } from "./types";

// Modo demostración: piezas de ejemplo y pedidos en memoria. Los pedidos se
// pierden al reiniciar el servidor. Para producción configura Supabase.

const g = globalThis as unknown as { __demoOrders?: Map<string, Order>; __demoParts?: Part[] };
const orders = (g.__demoOrders ??= new Map<string, Order>());
const parts = (g.__demoParts ??= structuredClone(DEMO_PARTS));

const clone = <T>(v: T): T => structuredClone(v);

export const memoryStore: Store = {
  kind: "demo",

  async listParts() {
    return clone(parts.filter((p) => p.active));
  },

  async listAllParts() {
    return clone(parts);
  },

  async upsertParts(items) {
    for (const item of items) {
      const idx = parts.findIndex((p) => p.slug === item.part.slug);
      const id = idx >= 0 ? parts[idx].id : randomUUID();
      const next = importToPart(item, id);
      if (idx >= 0) parts[idx] = { ...next, imageUrl: parts[idx].imageUrl };
      else parts.push(next);
    }
  },

  async createOrder(input: NewOrderInput) {
    const now = new Date().toISOString();
    const order: Order = {
      ...clone(input),
      id: randomUUID(),
      reference: newReference(),
      trackingToken: newTrackingToken(),
      status: "recibido",
      adminNotes: null,
      createdAt: now,
      updatedAt: now,
      events: [{ id: randomUUID(), status: "recibido", note: null, createdAt: now }],
    };
    orders.set(order.id, order);
    return clone(order);
  },

  async getOrderByToken(token) {
    for (const o of orders.values()) if (o.trackingToken === token) return clone(o);
    return null;
  },

  async getOrder(id) {
    const o = orders.get(id);
    return o ? clone(o) : null;
  },

  async listOrders(status?: OrderStatus) {
    return clone(
      [...orders.values()]
        .filter((o) => !status || o.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },

  async setOrderStatus(id, status, note, estimatedDelivery) {
    const o = orders.get(id);
    if (!o) throw new Error("Pedido no encontrado");
    const now = new Date().toISOString();
    o.status = status;
    o.updatedAt = now;
    o.estimatedDelivery = estimatedDelivery;
    o.events.push({ id: randomUUID(), status, note, createdAt: now });
  },

  async setAdminNotes(id, notes) {
    const o = orders.get(id);
    if (!o) throw new Error("Pedido no encontrado");
    o.adminNotes = notes;
    o.updatedAt = new Date().toISOString();
  },
};
