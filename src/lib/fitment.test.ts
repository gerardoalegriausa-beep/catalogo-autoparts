import { describe, expect, it } from "vitest";
import { checkFitment, fitsModelYear } from "./fitment";
import type { Fitment, VinDecoded } from "./types";

const vehicle = (over: Partial<VinDecoded>): VinDecoded => ({
  make: "VOLVO",
  model: "XC60",
  modelId: "xc60",
  modelYear: 2020,
  engine: null,
  engineCode: null,
  displacementL: null,
  fuel: null,
  bodyClass: null,
  trim: null,
  source: "nhtsa",
  ...over,
});

const f = (over: Partial<Fitment>): Fitment => ({
  modelId: "xc60",
  yearFrom: 2018,
  yearTo: null,
  engine: null,
  notes: null,
  ...over,
});

describe("checkFitment", () => {
  it("compatible cuando coinciden modelo y año", () => {
    expect(checkFitment({ fitments: [f({})] }, vehicle({})).status).toBe("compatible");
  });

  it("incompatible por modelo", () => {
    const r = checkFitment({ fitments: [f({ modelId: "xc90" })] }, vehicle({}));
    expect(r.status).toBe("incompatible");
    expect(r.reason).toContain("XC90");
  });

  it("incompatible por año", () => {
    const r = checkFitment({ fitments: [f({ yearFrom: 2018, yearTo: 2019 })] }, vehicle({ modelYear: 2021 }));
    expect(r.status).toBe("incompatible");
    expect(r.reason).toContain("2018–2019");
  });

  it("sin datos cuando no se pudo leer el modelo", () => {
    expect(checkFitment({ fitments: [f({})] }, vehicle({ modelId: null })).status).toBe("sin_datos");
    expect(checkFitment({ fitments: [f({})] }, null).status).toBe("sin_datos");
  });

  it("exige motor cuando la pieza depende del motor", () => {
    const part = { fitments: [f({ engine: "B4204T" })] };
    expect(checkFitment(part, vehicle({})).status).toBe("sin_datos");
    expect(checkFitment(part, vehicle({ engineCode: "B4204T23" })).status).toBe("compatible");
    expect(checkFitment(part, vehicle({ engineCode: "B5254T" })).status).toBe("incompatible");
  });
});

describe("fitsModelYear", () => {
  it("filtra por modelo y año", () => {
    const part = { fitments: [f({ yearFrom: 2018, yearTo: 2022 })] };
    expect(fitsModelYear(part)).toBe(true);
    expect(fitsModelYear(part, "xc60", 2020)).toBe(true);
    expect(fitsModelYear(part, "xc60", 2023)).toBe(false);
    expect(fitsModelYear(part, "xc90")).toBe(false);
  });
});
