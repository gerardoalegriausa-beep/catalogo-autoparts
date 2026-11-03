import "server-only";
import { checkFitment } from "./fitment";
import type { FitmentResult, Part, VinDecoded } from "./types";
import { checkVin } from "./vin";
import { decodeVin } from "./vin-decoder";

export type VinInspection = {
  vin: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  vehicle: VinDecoded | null;
  fitment: FitmentResult | null;
};

/** Valida el VIN, lo decodifica y (si se pasa una pieza) revisa la compatibilidad. */
export async function inspectVin(raw: string, part?: Pick<Part, "fitments">): Promise<VinInspection> {
  const local = checkVin(raw);
  if (!local.valid) {
    return { vin: local.vin, valid: false, errors: local.errors, warnings: local.warnings, vehicle: null, fitment: null };
  }
  const vehicle = await decodeVin(local.vin);
  const errors: string[] = [];
  const warnings = [...local.warnings];

  const make = vehicle.make?.toUpperCase();
  if (vehicle.source === "nhtsa" && make && make !== "VOLVO") {
    errors.push(`Este VIN es de un ${vehicle.make}. El catálogo es solo para Volvo.`);
  } else if (local.isVolvoCar === null && make === "VOLVO") {
    // El WMI no estaba en la lista, pero la NHTSA confirma que es Volvo.
    const idx = warnings.findIndex((w) => w.includes("fabricante"));
    if (idx >= 0) warnings.splice(idx, 1);
  }
  if (vehicle.source === "local") {
    warnings.push("No pudimos consultar la base de datos de VIN. Validaremos el vehículo a mano.");
  } else if (vehicle.model && !vehicle.modelId) {
    warnings.push(`El modelo ${vehicle.model} no está en nuestro catálogo (XC40, XC60, XC90, S60, S90).`);
  }

  // Si la NHTSA no da el año, usamos el que se lee en el VIN.
  const withYear: VinDecoded = { ...vehicle, modelYear: vehicle.modelYear ?? local.modelYear };
  const fitment = part ? checkFitment(part, withYear) : null;

  return { vin: local.vin, valid: errors.length === 0, errors, warnings, vehicle: withYear, fitment };
}
