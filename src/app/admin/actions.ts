"use server";

import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { endAdminSession, passwordMatches, requireAdmin, startAdminSession } from "@/lib/auth";
import { CATALOG_TAG } from "@/lib/catalog";
import { getStageDays } from "@/lib/config";
import { buildTimeline, estimatedDelivery } from "@/lib/eta";
import { getStore } from "@/lib/store";
import { ORDER_STATUSES, type OrderStatus } from "@/lib/types";

export async function login(_prev: string | null, form: FormData): Promise<string | null> {
  // Pequeña pausa para frenar intentos repetidos.
  await new Promise((r) => setTimeout(r, 400));
  if (!passwordMatches(String(form.get("password") ?? ""))) return "Contraseña incorrecta.";
  await startAdminSession();
  redirect("/admin");
}

export async function logout(): Promise<void> {
  await endAdminSession();
  redirect("/admin/login");
}

export type StatusFormState = { error: string | null };

export async function advanceStatus(orderId: string, _prev: StatusFormState, form: FormData): Promise<StatusFormState> {
  await requireAdmin();
  const store = getStore();
  const order = await store.getOrder(orderId);
  if (!order) return { error: "Pedido no encontrado." };

  const target = String(form.get("status") ?? "") as OrderStatus;
  const note = String(form.get("note") ?? "").trim().slice(0, 500) || null;
  const currentIdx = ORDER_STATUSES.indexOf(order.status as (typeof ORDER_STATUSES)[number]);

  if (target === "cancelado") {
    if (order.status === "entregado" || order.status === "cancelado") return { error: "Este pedido ya no se puede cancelar." };
    if (!note) return { error: "Escribe el motivo de la cancelación (lo verá el taller)." };
  } else {
    const targetIdx = ORDER_STATUSES.indexOf(target as (typeof ORDER_STATUSES)[number]);
    if (targetIdx !== currentIdx + 1) return { error: "Solo se puede avanzar al siguiente estado." };
    if (target === "vin_verificado" && form.get("confirmPartNumber") !== "on") {
      return { error: "Confirma que revisaste el número de parte en el catálogo original con el VIN." };
    }
  }

  const now = new Date();
  const events = [...order.events, { id: "next", status: target, note, createdAt: now.toISOString() }];
  const eta =
    target === "cancelado"
      ? order.estimatedDelivery
      : estimatedDelivery(buildTimeline(target, events, order.createdAt, getStageDays(), now));

  await store.setOrderStatus(orderId, target, note, eta);
  refresh();
  return { error: null };
}

export async function saveAdminNotes(orderId: string, form: FormData): Promise<void> {
  await requireAdmin();
  const notes = String(form.get("adminNotes") ?? "").trim().slice(0, 2000) || null;
  await getStore().setAdminNotes(orderId, notes);
  refresh();
}

export async function refreshCatalog(): Promise<void> {
  await requireAdmin();
  updateTag(CATALOG_TAG);
}
