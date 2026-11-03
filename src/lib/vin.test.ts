import { describe, expect, it } from "vitest";
import { checkVin, modelIdFromName, modelYearFromVin, normalizeVin, vinCheckDigit } from "./vin";

describe("normalizeVin", () => {
  it("pasa a mayúsculas, quita espacios y corrige O/I/Q", () => {
    expect(normalizeVin(" yv4-a22pk o g1 234567 ")).toBe("YV4A22PK0G1234567");
    expect(normalizeVin("YV1I")).toBe("YV11");
  });
});

describe("vinCheckDigit", () => {
  it("calcula el dígito del ejemplo estándar 1M8GDM9AXKP042788", () => {
    expect(vinCheckDigit("1M8GDM9AXKP042788")).toBe("X");
  });
  it("calcula el dígito de un VIN numérico", () => {
    expect(vinCheckDigit("11111111111111111")).toBe("1");
  });
});

describe("modelYearFromVin", () => {
  it("lee el año de la posición 10 eligiendo el ciclo más reciente", () => {
    expect(modelYearFromVin("YV4A22PK0G1234567", 2026)).toBe(2016);
    expect(modelYearFromVin("YV4A22PK0T1234567", 2026)).toBe(2026);
    expect(modelYearFromVin("YV4A22PK0V1234567", 2026)).toBe(2027);
    // 'W' sería 2028: todavía no existe en 2026, así que es 1998
    expect(modelYearFromVin("YV4A22PK0W1234567", 2026)).toBe(1998);
  });
});

describe("checkVin", () => {
  it("rechaza largo incorrecto", () => {
    const r = checkVin("YV4A22PK");
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/17 caracteres/);
  });

  it("acepta un Volvo y solo advierte por el dígito verificador", () => {
    const r = checkVin("YV4A22PK0G1234567", 2026);
    expect(r.valid).toBe(true);
    expect(r.isVolvoCar).toBe(true);
    expect(r.modelYear).toBe(2016);
    expect(r.warnings.some((w) => w.includes("dígito verificador"))).toBe(true);
  });

  it("no advierte cuando el dígito verificador coincide", () => {
    const base = "YV4A22PK0G1234567";
    const fixed = base.slice(0, 8) + vinCheckDigit(base) + base.slice(9);
    expect(checkVin(fixed, 2026).warnings).toEqual([]);
  });

  it("rechaza camiones Volvo", () => {
    const r = checkVin("YV2A22PK0G1234567");
    expect(r.valid).toBe(false);
    expect(r.isVolvoCar).toBe(false);
  });

  it("deja pasar fabricantes desconocidos con advertencia", () => {
    const r = checkVin("WBA3A5C50CF256985");
    expect(r.valid).toBe(true);
    expect(r.isVolvoCar).toBeNull();
    expect(r.warnings[0]).toMatch(/fabricante/);
  });
});

describe("modelIdFromName", () => {
  it("convierte nombres de la NHTSA", () => {
    expect(modelIdFromName("XC60")).toBe("xc60");
    expect(modelIdFromName("S60 Cross Country")).toBe("s60");
    expect(modelIdFromName("XC 90")).toBe("xc90");
    expect(modelIdFromName("V60")).toBeNull();
    expect(modelIdFromName(null)).toBeNull();
  });
});
