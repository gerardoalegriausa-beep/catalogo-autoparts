// Tipos compartidos del catálogo. Los nombres de columnas siguen el esquema
// de supabase/migrations/0001_init.sql.

export type ModelId = "xc40" | "xc60" | "xc90" | "s60" | "s90";

export type VehicleModel = {
  id: ModelId;
  name: string;
  bodyType: "SUV" | "Sedán";
  sort: number;
};

export type CategoryId =
  | "sensores-electronica"
  | "motor-refrigeracion"
  | "frenos"
  | "iluminacion";

export type Category = {
  id: CategoryId;
  name: string;
  description: string;
  sort: number;
};

export type PartCondition = "nuevo" | "reconstruido" | "usado";

export type Fitment = {
  modelId: ModelId;
  yearFrom: number;
  yearTo: number | null; // null = hasta la fecha
  engine: string | null; // código de motor, p. ej. "B4204T23"; null = cualquiera
  notes: string | null;
};

export type Part = {
  id: string;
  slug: string;
  name: string;
  description: string;
  categoryId: CategoryId;
  oemPartNumber: string | null;
  brand: string;
  condition: PartCondition;
  supplier: string | null;
  supplierCostUsd: number;
  marginPct: number | null; // null = margen por defecto
  usShippingUsd: number; // envío del proveedor al almacén de Miami
  weightKg: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  dutyPct: number | null; // null = arancel por defecto
  highRisk: boolean; // exige número de parte de la pieza antigua
  imageUrl: string | null;
  active: boolean;
  fitments: Fitment[];
};

export const ORDER_STATUSES = [
  "recibido",
  "vin_verificado",
  "comprado_usa",
  "en_miami",
  "en_aduanas",
  "entregado",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number] | "cancelado";

export type PriceBreakdown = {
  productUsd: number; // costo proveedor + margen + envío dentro de EE. UU.
  freightUsd: number; // Miami → Lima
  chargeableKg: number;
  insuranceUsd: number;
  dutiesUsd: number; // ad valorem
  igvUsd: number; // IGV + IPM
  handlingUsd: number; // gestión de aduana / entrega
  paymentFeeUsd: number;
  unitTotalUsd: number;
  quantity: number;
  totalUsd: number;
};

export type VinDecoded = {
  make: string | null;
  model: string | null;
  modelId: ModelId | null;
  modelYear: number | null;
  engine: string | null; // descripción legible
  engineCode: string | null;
  displacementL: string | null;
  fuel: string | null;
  bodyClass: string | null;
  trim: string | null;
  source: "nhtsa" | "local";
};

export type FitmentResult = {
  status: "compatible" | "incompatible" | "sin_datos";
  reason: string;
};

export type OrderEvent = {
  id: string;
  status: OrderStatus;
  note: string | null;
  createdAt: string;
};

export type Order = {
  id: string;
  reference: string; // código corto visible, p. ej. "VP-7K3M9Q"
  trackingToken: string;
  status: OrderStatus;
  shopName: string;
  shopRuc: string | null;
  contactName: string;
  phone: string;
  email: string | null;
  vin: string;
  vehicleModelId: ModelId; // modelo que eligió el taller
  vehicleYear: number; // año que eligió el taller
  vinDecoded: VinDecoded | null;
  vinWarnings: string[];
  fitment: FitmentResult;
  oldPartNumber: string | null;
  quantity: number;
  partId: string;
  partName: string;
  partNumber: string | null;
  priceBreakdown: PriceBreakdown;
  totalUsd: number;
  customerNotes: string | null;
  adminNotes: string | null;
  estimatedDelivery: string | null; // fecha ISO (YYYY-MM-DD)
  createdAt: string;
  updatedAt: string;
  events: OrderEvent[];
};

export type NewOrderInput = Omit<
  Order,
  "id" | "reference" | "trackingToken" | "status" | "adminNotes" | "createdAt" | "updatedAt" | "events"
>;

export type PartFilter = {
  modelId?: ModelId;
  categoryId?: CategoryId;
  year?: number;
  q?: string;
};
