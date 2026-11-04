import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Fitment, NewOrderInput, Order, OrderEvent, OrderStatus, Part } from "../types";
import type { PartImport } from "../parts-csv";
import { newReference, newTrackingToken } from "./ids";
import type { Store } from "./types";

type Row = Record<string, unknown>;

let client: SupabaseClient | null = null;
function db(): SupabaseClient {
  if (!client) {
    client = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}

const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

function toFitment(r: Row): Fitment {
  return {
    modelId: r.model_id as Fitment["modelId"],
    yearFrom: Number(r.year_from),
    yearTo: n(r.year_to),
    engine: (r.engine as string | null) ?? null,
    notes: (r.notes as string | null) ?? null,
  };
}

function toPart(r: Row): Part {
  return {
    id: r.id as string,
    slug: r.slug as string,
    name: r.name as string,
    description: (r.description as string) ?? "",
    categoryId: r.category_id as Part["categoryId"],
    oemPartNumber: (r.oem_part_number as string | null) ?? null,
    brand: r.brand as string,
    condition: r.condition as Part["condition"],
    supplier: (r.supplier as string | null) ?? null,
    supplierCostUsd: Number(r.supplier_cost_usd),
    marginPct: n(r.margin_pct),
    usShippingUsd: Number(r.us_shipping_usd ?? 0),
    weightKg: Number(r.weight_kg),
    lengthCm: Number(r.length_cm),
    widthCm: Number(r.width_cm),
    heightCm: Number(r.height_cm),
    dutyPct: n(r.duty_pct),
    highRisk: Boolean(r.high_risk),
    imageUrl: (r.image_url as string | null) ?? null,
    active: Boolean(r.active),
    fitments: ((r.part_fitments as Row[]) ?? []).map(toFitment),
  };
}

function toEvent(r: Row): OrderEvent {
  return {
    id: r.id as string,
    status: r.status as OrderStatus,
    note: (r.note as string | null) ?? null,
    createdAt: r.created_at as string,
  };
}

function toOrder(r: Row): Order {
  const events = ((r.order_events as Row[]) ?? []).map(toEvent).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return {
    id: r.id as string,
    reference: r.reference as string,
    trackingToken: r.tracking_token as string,
    status: r.status as OrderStatus,
    shopName: r.shop_name as string,
    shopRuc: (r.shop_ruc as string | null) ?? null,
    contactName: r.contact_name as string,
    phone: r.phone as string,
    email: (r.email as string | null) ?? null,
    vin: r.vin as string,
    vehicleModelId: r.vehicle_model_id as Order["vehicleModelId"],
    vehicleYear: Number(r.vehicle_year),
    vinDecoded: (r.vin_decoded as Order["vinDecoded"]) ?? null,
    vinWarnings: (r.vin_warnings as string[]) ?? [],
    fitment: r.fitment as Order["fitment"],
    oldPartNumber: (r.old_part_number as string | null) ?? null,
    quantity: Number(r.quantity),
    partId: r.part_id as string,
    partName: r.part_name as string,
    partNumber: (r.part_number as string | null) ?? null,
    priceBreakdown: r.price_breakdown as Order["priceBreakdown"],
    totalUsd: Number(r.total_usd),
    customerNotes: (r.customer_notes as string | null) ?? null,
    adminNotes: (r.admin_notes as string | null) ?? null,
    estimatedDelivery: (r.estimated_delivery as string | null) ?? null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    events,
  };
}

function check<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(`Supabase: ${res.error.message}`);
  return res.data;
}

const ORDER_SELECT = "*, order_events(*)";

export const supabaseStore: Store = {
  kind: "supabase",

  async listParts() {
    const rows = check(await db().from("parts").select("*, part_fitments(*)").eq("active", true).order("name"));
    return (rows as Row[]).map(toPart);
  },

  async listAllParts() {
    const rows = check(await db().from("parts").select("*, part_fitments(*)").order("name"));
    return (rows as Row[]).map(toPart);
  },

  async upsertParts(items: PartImport[]) {
    if (items.length === 0) return;
    const saved = check(
      await db()
        .from("parts")
        .upsert(
          items.map((i) => i.part),
          { onConflict: "slug" },
        )
        .select("id, slug"),
    ) as { id: string; slug: string }[];
    const idBySlug = new Map(saved.map((r) => [r.slug, r.id]));
    check(await db().from("part_fitments").delete().in("part_id", [...idBySlug.values()]));
    const fitRows = items.flatMap((i) => i.fitments.map((f) => ({ ...f, part_id: idBySlug.get(i.part.slug) })));
    if (fitRows.length) check(await db().from("part_fitments").insert(fitRows));
  },

  async createOrder(input: NewOrderInput) {
    const row = {
      reference: newReference(),
      tracking_token: newTrackingToken(),
      shop_name: input.shopName,
      shop_ruc: input.shopRuc,
      contact_name: input.contactName,
      phone: input.phone,
      email: input.email,
      vin: input.vin,
      vehicle_model_id: input.vehicleModelId,
      vehicle_year: input.vehicleYear,
      vin_decoded: input.vinDecoded,
      vin_warnings: input.vinWarnings,
      fitment: input.fitment,
      old_part_number: input.oldPartNumber,
      quantity: input.quantity,
      part_id: input.partId,
      part_name: input.partName,
      part_number: input.partNumber,
      price_breakdown: input.priceBreakdown,
      total_usd: input.totalUsd,
      customer_notes: input.customerNotes,
      estimated_delivery: input.estimatedDelivery,
    };
    const created = check(await db().from("orders").insert(row).select(ORDER_SELECT).single());
    return toOrder(created as Row);
  },

  async getOrderByToken(token) {
    const row = check(await db().from("orders").select(ORDER_SELECT).eq("tracking_token", token).maybeSingle());
    return row ? toOrder(row as Row) : null;
  },

  async getOrder(id) {
    if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
    const row = check(await db().from("orders").select(ORDER_SELECT).eq("id", id).maybeSingle());
    return row ? toOrder(row as Row) : null;
  },

  async listOrders(status?: OrderStatus) {
    let q = db().from("orders").select(ORDER_SELECT).order("created_at", { ascending: false }).limit(200);
    if (status) q = q.eq("status", status);
    return ((check(await q) as Row[]) ?? []).map(toOrder);
  },

  async setOrderStatus(id, status, note, estimatedDelivery) {
    check(
      await db().rpc("set_order_status", {
        p_order_id: id,
        p_status: status,
        p_note: note,
        p_estimated_delivery: estimatedDelivery,
      }),
    );
  },

  async setAdminNotes(id, notes) {
    check(await db().from("orders").update({ admin_notes: notes, updated_at: new Date().toISOString() }).eq("id", id));
  },
};
