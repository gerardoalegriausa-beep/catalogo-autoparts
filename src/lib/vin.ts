// Validación y lectura local del VIN (sin red). Se usa tanto en el navegador
// como en el servidor. La decodificación completa (modelo, motor) está en
// vin-decoder.ts y consulta la API gratuita de la NHTSA.

import type { ModelId } from "./types";

export const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

/** Mayúsculas, sin espacios ni guiones. Cambia O→0 e I→1, errores típicos al tipear. */
export function normalizeVin(raw: string): string {
  return raw
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/O/g, "0")
    .replace(/[IQ]/g, (c) => (c === "I" ? "1" : "0"));
}

const TRANSLIT: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8,
  J: 1, K: 2, L: 3, M: 4, N: 5, P: 7, R: 9,
  S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};
const WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];

/** Dígito verificador (posición 9). Obligatorio en Norteamérica, opcional en otros mercados. */
export function vinCheckDigit(vin: string): string {
  let sum = 0;
  for (let i = 0; i < 17; i++) {
    const c = vin[i];
    const value = /\d/.test(c) ? Number(c) : TRANSLIT[c] ?? 0;
    sum += value * WEIGHTS[i];
  }
  const rem = sum % 11;
  return rem === 10 ? "X" : String(rem);
}

const YEAR_CODES = "ABCDEFGHJKLMNPRSTVWXY123456789";

/** Año modelo según la posición 10. Devuelve el año más reciente posible. */
export function modelYearFromVin(vin: string, currentYear = new Date().getFullYear()): number | null {
  const idx = YEAR_CODES.indexOf(vin[9]);
  if (idx < 0) return null;
  let year = 1980 + idx;
  while (year + 30 <= currentYear + 1) year += 30;
  return year;
}

// Códigos de fabricante (WMI, primeras 3 letras) de autos Volvo.
const VOLVO_CAR_WMI: Record<string, string> = {
  YV1: "Volvo Cars (Suecia/Bélgica)",
  YV4: "Volvo Cars SUV (Suecia/Bélgica)",
  LYV: "Volvo Cars (China)",
  "7JR": "Volvo Cars (EE. UU.)",
};
const VOLVO_HEAVY_WMI = ["YV2", "YV3", "4V4", "4V5", "4V6"];

export type VinCheck = {
  vin: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  isVolvoCar: boolean | null; // null = no se sabe solo con el WMI
  manufacturer: string | null;
  modelYear: number | null;
};

export function checkVin(raw: string, currentYear?: number): VinCheck {
  const vin = normalizeVin(raw);
  const errors: string[] = [];
  const warnings: string[] = [];

  if (vin.length !== 17) {
    errors.push(`El VIN debe tener 17 caracteres (tiene ${vin.length}).`);
  } else if (!VIN_PATTERN.test(vin)) {
    errors.push("El VIN tiene caracteres no válidos.");
  }

  if (errors.length > 0) {
    return { vin, valid: false, errors, warnings, isVolvoCar: null, manufacturer: null, modelYear: null };
  }

  const wmi = vin.slice(0, 3);
  let isVolvoCar: boolean | null = null;
  let manufacturer: string | null = null;
  if (VOLVO_CAR_WMI[wmi]) {
    isVolvoCar = true;
    manufacturer = VOLVO_CAR_WMI[wmi];
  } else if (VOLVO_HEAVY_WMI.includes(wmi)) {
    isVolvoCar = false;
    errors.push("Este VIN es de un camión o bus Volvo. El catálogo es solo para autos.");
  } else {
    warnings.push("No reconocemos el fabricante por el VIN. Lo revisaremos a mano.");
  }

  if (vinCheckDigit(vin) !== vin[8]) {
    warnings.push(
      "El dígito verificador del VIN no coincide. Es normal en autos de fuera de Norteamérica, pero revisa que esté bien escrito.",
    );
  }

  return {
    vin,
    valid: errors.length === 0,
    errors,
    warnings,
    isVolvoCar,
    manufacturer,
    modelYear: modelYearFromVin(vin, currentYear),
  };
}

/** Convierte el nombre de modelo de la NHTSA ("XC60", "S60 Cross Country"...) al id del catálogo. */
export function modelIdFromName(name: string | null | undefined): ModelId | null {
  if (!name) return null;
  const n = name.toUpperCase().replace(/[\s-]/g, "");
  for (const id of ["XC40", "XC60", "XC90", "S60", "S90"] as const) {
    if (n.startsWith(id)) return id.toLowerCase() as ModelId;
  }
  return null;
}
