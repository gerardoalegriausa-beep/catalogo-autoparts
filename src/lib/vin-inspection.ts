import "server-only";
import { checkFitment } from "./fitment";
import { MODEL_NAMES } from "./catalog-labels";
import type { FitmentResult, ModelId, Part, VinDecoded } from "./types";
import { checkVin } from "./vin";
import { decodeVin } from "./vin-decoder";

export type VinInspection = {
  vin: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  vehicle: VinDecoded | null;
  fitment: FitmentResult | null;
  /** El modelo o año que eligió el taller no coincide con lo que dice el VIN. */
  mismatch: string | null;
};

/** Modelo y año que el taller indica en el formulario. */
export type DeclaredVehicle = { modelId?: ModelId | null; year?: number | null };

/** Valida el VIN, lo decodifica y (si se pasa una pieza) revisa la compatibilidad. */
export async function inspectVin(
  raw: string,
  part?: Pick<Part, "fitments">,
  declared: DeclaredVehicle = {},
): Promise<VinInspection> {
  const local = checkVin(raw);
  if (!local.valid) {
    return {
      vin: local.vin,
      valid: false,
      errors: local.errors,
      warnings: local.warnings,
      vehicle: null,
      fitment: null,
      mismatch: null,
    };
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

  // Lo que dice la NHTSA manda; si no lo sabe, se usa lo que eligió el taller y,
  // como último recurso, el año que se lee en la posición 10 del VIN.
  const nhtsaYear = vehicle.source === "nhtsa" ? vehicle.modelYear : null;
  const mismatches: string[] = [];
  if (vehicle.modelId && declared.modelId && vehicle.modelId !== declared.modelId) {
    mismatches.push(`el VIN es de un ${MODEL_NAMES[vehicle.modelId]} y elegiste ${MODEL_NAMES[declared.modelId]}`);
  }
  if (nhtsaYear && declared.year && nhtsaYear !== declared.year) {
    mismatches.push(`el VIN es del año ${nhtsaYear} y elegiste ${declared.year}`);
  }
  const mismatch = mismatches.length ? `No coincide: ${mismatches.join(" y ")}. Revisa el VIN o el vehículo elegido.` : null;

  const merged: VinDecoded = {
    ...vehicle,
    modelId: vehicle.modelId ?? declared.modelId ?? null,
    modelYear: nhtsaYear ?? declared.year ?? local.modelYear,
  };
  const fitment = part ? checkFitment(part, merged) : null;

  // Se guarda lo que dice el VIN, sin mezclar lo que eligió el taller.
  const fromVin: VinDecoded = { ...vehicle, modelYear: nhtsaYear ?? local.modelYear };
  return { vin: local.vin, valid: errors.length === 0, errors, warnings, vehicle: fromVin, fitment, mismatch };
}
