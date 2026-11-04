import type { Fitment, FitmentResult, Part, VinDecoded } from "./types";
import { MODEL_NAMES } from "./catalog-labels";

export function fitmentYears(f: Fitment): string {
  return f.yearTo ? `${f.yearFrom}–${f.yearTo}` : `${f.yearFrom} en adelante`;
}

/**
 * Compara la pieza con el vehículo decodificado del VIN.
 * - compatible: modelo y año dentro de algún rango (y motor, si la pieza lo exige)
 * - incompatible: el VIN dice claramente otro modelo, año o motor
 * - sin_datos: no se pudo leer el modelo o el año; lo valida una persona
 */
export function checkFitment(part: Pick<Part, "fitments">, vehicle: VinDecoded | null): FitmentResult {
  if (part.fitments.length === 0) {
    return { status: "sin_datos", reason: "La pieza aún no tiene compatibilidades cargadas." };
  }
  if (!vehicle || !vehicle.modelId) {
    return {
      status: "sin_datos",
      reason: "No pudimos leer el modelo desde el VIN. Lo validaremos a mano antes de comprar.",
    };
  }

  const sameModel = part.fitments.filter((f) => f.modelId === vehicle.modelId);
  if (sameModel.length === 0) {
    const models = [...new Set(part.fitments.map((f) => MODEL_NAMES[f.modelId]))].join(", ");
    return {
      status: "incompatible",
      reason: `Tu VIN corresponde a un ${MODEL_NAMES[vehicle.modelId]} y esta pieza es para ${models}.`,
    };
  }

  if (vehicle.modelYear === null) {
    return { status: "sin_datos", reason: "No pudimos leer el año del VIN. Lo validaremos a mano." };
  }
  const year = vehicle.modelYear;
  const inYears = sameModel.filter((f) => year >= f.yearFrom && (f.yearTo === null || year <= f.yearTo));
  if (inYears.length === 0) {
    const ranges = sameModel.map(fitmentYears).join(", ");
    return {
      status: "incompatible",
      reason: `Tu ${MODEL_NAMES[vehicle.modelId]} es ${year} y esta pieza es para los años ${ranges}.`,
    };
  }

  const anyEngine = inYears.some((f) => f.engine === null);
  if (anyEngine) {
    return { status: "compatible", reason: `Compatible con ${MODEL_NAMES[vehicle.modelId]} ${year}.` };
  }
  if (!vehicle.engineCode) {
    return {
      status: "sin_datos",
      reason: `Esta pieza depende del motor (${inYears.map((f) => f.engine).join(", ")}) y el VIN no lo indica. Lo validaremos a mano.`,
    };
  }
  const code = vehicle.engineCode;
  const engineMatch = inYears.some((f) => f.engine && code.startsWith(f.engine.toUpperCase()));
  return engineMatch
    ? { status: "compatible", reason: `Compatible con ${MODEL_NAMES[vehicle.modelId]} ${year}, motor ${code}.` }
    : {
        status: "incompatible",
        reason: `Tu motor es ${code} y esta pieza es para ${inYears.map((f) => f.engine).join(", ")}.`,
      };
}

/** ¿La pieza sirve para este modelo/año? (para filtrar el catálogo) */
export function fitsModelYear(part: Pick<Part, "fitments">, modelId?: string, year?: number): boolean {
  if (!modelId && !year) return true;
  return part.fitments.some(
    (f) =>
      (!modelId || f.modelId === modelId) &&
      (!year || (year >= f.yearFrom && (f.yearTo === null || year <= f.yearTo))),
  );
}
