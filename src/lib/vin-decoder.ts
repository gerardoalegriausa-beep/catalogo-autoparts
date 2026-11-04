import "server-only";
import { cacheLife } from "next/cache";
import type { VinDecoded } from "./types";
import { checkVin, modelIdFromName } from "./vin";

// VIN_DECODER_URL solo se usa para pruebas con un servidor simulado.
const NHTSA_URL = process.env.VIN_DECODER_URL || "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVinValues";

type NhtsaRow = Record<string, string | null | undefined>;

const clean = (v: string | null | undefined) => {
  const s = (v ?? "").trim();
  return s === "" || s.toLowerCase() === "not applicable" ? null : s;
};

export function mapNhtsa(row: NhtsaRow): VinDecoded {
  const model = clean(row.Model);
  const engineModel = clean(row.EngineModel);
  const displacement = clean(row.DisplacementL);
  const cylinders = clean(row.EngineCylinders);
  const year = Number(clean(row.ModelYear));
  const engineParts = [
    engineModel,
    displacement ? `${Number(displacement).toFixed(1)} L` : null,
    cylinders ? `${cylinders} cil.` : null,
    clean(row.OtherEngineInfo),
  ].filter(Boolean);
  return {
    make: clean(row.Make),
    model,
    modelId: modelIdFromName(model),
    modelYear: Number.isFinite(year) && year > 0 ? year : null,
    engine: engineParts.length ? engineParts.join(" · ") : null,
    engineCode: engineModel && /^B\d{4}/i.test(engineModel) ? engineModel.toUpperCase() : null,
    displacementL: displacement,
    fuel: clean(row.FuelTypePrimary),
    bodyClass: clean(row.BodyClass),
    trim: clean(row.Trim),
    source: "nhtsa",
  };
}

async function fetchNhtsa(vin: string): Promise<VinDecoded> {
  "use cache";
  cacheLife("days");
  const res = await fetch(`${NHTSA_URL}/${vin}?format=json`, {
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`NHTSA respondió ${res.status}`);
  const body = (await res.json()) as { Results?: NhtsaRow[] };
  const row = body.Results?.[0];
  if (!row) throw new Error("NHTSA sin resultados");
  const decoded = mapNhtsa(row);
  if (!decoded.make && !decoded.model) throw new Error("NHTSA no reconoce el VIN");
  return decoded;
}

/** Decodifica el VIN con la NHTSA; si no responde, usa solo lo que se lee localmente. */
export async function decodeVin(vin: string): Promise<VinDecoded> {
  try {
    return await fetchNhtsa(vin);
  } catch {
    const local = checkVin(vin);
    return {
      make: local.isVolvoCar ? "VOLVO" : null,
      model: null,
      modelId: null,
      modelYear: local.modelYear,
      engine: null,
      engineCode: null,
      displacementL: null,
      fuel: null,
      bodyClass: null,
      trim: null,
      source: "local",
    };
  }
}
