import type { Category, CategoryId, ModelId, OrderStatus, PartCondition, VehicleModel } from "./types";

export const MODELS: VehicleModel[] = [
  { id: "xc40", name: "XC40", bodyType: "SUV", sort: 1 },
  { id: "xc60", name: "XC60", bodyType: "SUV", sort: 2 },
  { id: "xc90", name: "XC90", bodyType: "SUV", sort: 3 },
  { id: "s60", name: "S60", bodyType: "Sedán", sort: 4 },
  { id: "s90", name: "S90", bodyType: "Sedán", sort: 5 },
];

export const MODEL_NAMES: Record<ModelId, string> = Object.fromEntries(
  MODELS.map((m) => [m.id, m.name]),
) as Record<ModelId, string>;

export const CATEGORIES: Category[] = [
  {
    id: "sensores-electronica",
    name: "Sensores y electrónica",
    description: "Sensores de presión de combustible, ABS y módulos de gestión.",
    sort: 1,
  },
  {
    id: "motor-refrigeracion",
    name: "Motor y refrigeración",
    description: "Bombas de agua, kits de distribución y fajas de accesorios.",
    sort: 2,
  },
  {
    id: "frenos",
    name: "Frenos",
    description: "Discos y pastillas de medidas grandes para SUV y sedán.",
    sort: 3,
  },
  {
    id: "iluminacion",
    name: "Faros y carrocería",
    description: "Faros LED delanteros y posteriores.",
    sort: 4,
  },
];

export const CATEGORY_NAMES: Record<CategoryId, string> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c.name]),
) as Record<CategoryId, string>;

export const CONDITION_LABELS: Record<PartCondition, string> = {
  nuevo: "Nuevo",
  reconstruido: "Reconstruido",
  usado: "Usado",
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  recibido: "Pedido recibido",
  vin_verificado: "VIN verificado",
  comprado_usa: "Comprado en EE. UU.",
  en_miami: "Recibido en Miami",
  en_aduanas: "En aduanas (Lima)",
  entregado: "Entregado en taller",
  cancelado: "Cancelado",
};

export const STATUS_DESCRIPTIONS: Record<OrderStatus, string> = {
  recibido: "Recibimos tu pedido. Vamos a validar el VIN con el catálogo original.",
  vin_verificado: "Confirmamos que la pieza corresponde a tu vehículo.",
  comprado_usa: "Compramos la pieza al proveedor en Estados Unidos.",
  en_miami: "La pieza llegó al almacén de Miami y pasó la revisión de número de parte.",
  en_aduanas: "La pieza llegó a Lima y está en trámite de aduanas.",
  entregado: "La pieza fue entregada en tu taller.",
  cancelado: "El pedido fue cancelado.",
};
