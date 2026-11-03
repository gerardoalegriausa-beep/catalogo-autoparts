import type { NewOrderInput, Order, OrderStatus, Part } from "../types";

export interface Store {
  readonly kind: "supabase" | "demo";
  listParts(): Promise<Part[]>;
  createOrder(input: NewOrderInput): Promise<Order>;
  getOrderByToken(token: string): Promise<Order | null>;
  getOrder(id: string): Promise<Order | null>;
  listOrders(status?: OrderStatus): Promise<Order[]>;
  setOrderStatus(id: string, status: OrderStatus, note: string | null, estimatedDelivery: string | null): Promise<void>;
  setAdminNotes(id: string, notes: string | null): Promise<void>;
}
