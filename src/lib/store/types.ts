import type { PartImport } from "../parts-csv";
import type { NewOrderInput, Order, OrderStatus, Part } from "../types";

export interface Store {
  readonly kind: "supabase" | "demo";
  listParts(): Promise<Part[]>;
  /** Todas las piezas, incluidas las inactivas (para el panel). */
  listAllParts(): Promise<Part[]>;
  /** Crea o actualiza piezas por slug y reemplaza su compatibilidad. */
  upsertParts(items: PartImport[]): Promise<void>;
  createOrder(input: NewOrderInput): Promise<Order>;
  getOrderByToken(token: string): Promise<Order | null>;
  getOrder(id: string): Promise<Order | null>;
  listOrders(status?: OrderStatus): Promise<Order[]>;
  setOrderStatus(id: string, status: OrderStatus, note: string | null, estimatedDelivery: string | null): Promise<void>;
  setAdminNotes(id: string, notes: string | null): Promise<void>;
}
