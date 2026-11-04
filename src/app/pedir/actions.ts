"use server";

import { redirect } from "next/navigation";
import { getPartBySlug } from "@/lib/catalog";
import { getPricingConfig, getStageDays } from "@/lib/config";
import { buildTimeline, estimatedDelivery } from "@/lib/eta";
import { priceBreakdown } from "@/lib/pricing";
import { getStore } from "@/lib/store";
import { MODEL_NAMES } from "@/lib/catalog-labels";
import type { ModelId } from "@/lib/types";
import { inspectVin, type DeclaredVehicle, type VinInspection } from "@/lib/vin-inspection";

export type OrderFormState = {
  errors: Partial<Record<OrderField, string>>;
  message: string | null;
  values: Partial<Record<OrderField, string>>;
};

type OrderField =
  | "shopName"
  | "shopRuc"
  | "contactName"
  | "phone"
  | "email"
  | "vin"
  | "vehicleModel"
  | "vehicleYear"
  | "oldPartNumber"
  | "quantity"
  | "customerNotes";

const FIELDS: OrderField[] = [
  "shopName",
  "shopRuc",
  "contactName",
  "phone",
  "email",
  "vin",
  "vehicleModel",
  "vehicleYear",
  "oldPartNumber",
  "quantity",
  "customerNotes",
];

/** Vista previa: lo que el sistema lee del VIN y si la pieza es compatible. */
export async function previewVin(
  slug: string,
  vin: string,
  modelId: string,
  year: string,
): Promise<VinInspection | { error: string }> {
  const part = await getPartBySlug(slug);
  if (!part) return { error: "La pieza ya no está disponible." };
  return inspectVin(String(vin).slice(0, 30), part, parseDeclared(modelId, year));
}

function parseDeclared(modelId: string, year: string): DeclaredVehicle {
  const y = Number(year);
  return {
    modelId: modelId in MODEL_NAMES ? (modelId as ModelId) : null,
    year: Number.isInteger(y) && y >= 2000 && y <= 2100 ? y : null,
  };
}

export async function createOrder(slug: string, _prev: OrderFormState, form: FormData): Promise<OrderFormState> {
  const values = Object.fromEntries(
    FIELDS.map((f) => [f, String(form.get(f) ?? "").trim()]),
  ) as Record<OrderField, string>;
  const errors: OrderFormState["errors"] = {};
  const fail = (message: string | null = null): OrderFormState => ({ errors, message, values });

  // Campo trampa para bots: los humanos no lo ven.
  if (String(form.get("website") ?? "") !== "") return fail("No se pudo enviar el pedido.");

  const part = await getPartBySlug(slug);
  if (!part) return fail("La pieza ya no está disponible.");

  if (values.shopName.length < 2) errors.shopName = "Escribe el nombre del taller.";
  if (values.shopRuc && !/^\d{11}$/.test(values.shopRuc)) errors.shopRuc = "El RUC tiene 11 dígitos.";
  if (values.contactName.length < 2) errors.contactName = "Escribe el nombre de contacto.";
  const phoneDigits = values.phone.replace(/\D/g, "");
  if (phoneDigits.length < 9 || phoneDigits.length > 15) errors.phone = "Escribe un celular válido (9 dígitos).";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) errors.email = "Revisa el correo.";
  const quantity = Number(values.quantity || "1");
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 10) errors.quantity = "Cantidad entre 1 y 10.";
  if (part.highRisk && values.oldPartNumber.length < 4) {
    errors.oldPartNumber = "Para esta pieza necesitamos el número de parte de la pieza que vas a reemplazar.";
  }
  if (values.customerNotes.length > 500) errors.customerNotes = "Máximo 500 caracteres.";

  const declared = parseDeclared(values.vehicleModel, values.vehicleYear);
  if (!declared.modelId) errors.vehicleModel = "Elige el modelo.";
  if (!declared.year) errors.vehicleYear = "Elige el año.";

  const vin = await inspectVin(values.vin, part, declared);
  values.vin = vin.vin;
  if (!vin.valid) {
    errors.vin = vin.errors.join(" ");
  } else if (vin.mismatch) {
    errors.vin = vin.mismatch;
  } else if (vin.fitment?.status === "incompatible") {
    errors.vin = `${vin.fitment.reason} Revisa el VIN o elige otra pieza.`;
  }

  if (Object.keys(errors).length > 0) return fail("Revisa los campos marcados.");

  const price = priceBreakdown(part, getPricingConfig(), quantity);
  const now = new Date();
  const eta = estimatedDelivery(buildTimeline("recibido", [], now.toISOString(), getStageDays(), now));

  const order = await getStore().createOrder({
    shopName: values.shopName,
    shopRuc: values.shopRuc || null,
    contactName: values.contactName,
    phone: phoneDigits,
    email: values.email || null,
    vin: vin.vin,
    vehicleModelId: declared.modelId!,
    vehicleYear: declared.year!,
    vinDecoded: vin.vehicle,
    vinWarnings: vin.warnings,
    fitment: vin.fitment ?? { status: "sin_datos", reason: "Sin revisar" },
    oldPartNumber: values.oldPartNumber || null,
    quantity,
    partId: part.id,
    partName: part.name,
    partNumber: part.oemPartNumber,
    priceBreakdown: price,
    totalUsd: price.totalUsd,
    customerNotes: values.customerNotes || null,
    estimatedDelivery: eta,
  });

  redirect(`/pedido/${order.trackingToken}?nuevo=1`);
}
