import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEMO_PARTS } from "../data/demo-catalog";
import { COLUMNS, detectDelimiter, importToPart, parseCsv, parseFitments, partsToCsv, rowsToParts, toCsv } from "./parts-csv";

describe("parseCsv / toCsv", () => {
  it("respeta comillas, comas y saltos de línea dentro de un campo", () => {
    const rows = [["a", 'dice "hola", ok', "línea\nnueva"], ["1", "2", "3"]];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
  it("ignora BOM y filas vacías", () => {
    expect(parseCsv("﻿a,b\r\n\r\n1,2\r\n")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("parseFitments", () => {
  it("lee modelo, años y motor", () => {
    expect(parseFitments("xc60:2018-; XC90:2016-2020:b4204t").fitments).toEqual([
      { model_id: "xc60", year_from: 2018, year_to: null, engine: null },
      { model_id: "xc90", year_from: 2016, year_to: 2020, engine: "B4204T" },
    ]);
  });
  it("reporta errores de formato y modelos desconocidos", () => {
    expect(parseFitments("v60:2018-").errors[0]).toMatch(/no existe/);
    expect(parseFitments("xc60 2018").errors[0]).toMatch(/formato/);
    expect(parseFitments("xc60:2020-2018").errors[0]).toMatch(/menor/);
    expect(parseFitments("").errors[0]).toMatch(/falta/);
  });
});

describe("rowsToParts", () => {
  const row = (over: Record<string, string> = {}): string[] => {
    const base = {
      slug: "bomba-agua",
      nombre: "Bomba de agua",
      descripcion: "",
      categoria: "motor-refrigeracion",
      numero_parte: "",
      marca: "Pierburg",
      condicion: "nuevo",
      proveedor: "",
      costo_usd: "138,50",
      margen_pct: "",
      envio_eeuu_usd: "",
      peso_kg: "1.6",
      largo_cm: "22",
      ancho_cm: "18",
      alto_cm: "14",
      arancel_pct: "",
      requiere_numero_parte: "no",
      activo: "",
      compatibilidad: "xc60:2018-",
      ...over,
    };
    return COLUMNS.map((c) => (base as Record<string, string>)[c]);
  };

  it("convierte una fila válida", () => {
    const { parts, errors } = rowsToParts([[...COLUMNS], row()]);
    expect(errors).toEqual([]);
    expect(parts[0].part).toMatchObject({
      slug: "bomba-agua",
      supplier_cost_usd: 138.5,
      margin_pct: null,
      us_shipping_usd: 0,
      high_risk: false,
      active: true,
    });
  });

  it("junta los errores por fila con su número de línea", () => {
    const { parts, errors } = rowsToParts([[...COLUMNS], row(), row({ slug: "bomba-agua", categoria: "llantas", costo_usd: "abc" })]);
    expect(parts).toHaveLength(1);
    expect(errors[0]).toMatch(/^Fila 3 \(bomba-agua\):/);
    expect(errors[0]).toMatch(/repetido/);
    expect(errors[0]).toMatch(/categoría/);
    expect(errors[0]).toMatch(/costo_usd/);
  });

  it("detecta columnas faltantes", () => {
    expect(rowsToParts([["slug", "nombre"]]).errors[0]).toMatch(/Faltan columnas/);
  });

  it("el CSV de ejemplo del repositorio es válido", () => {
    const csv = readFileSync(new URL("../../data/repuestos-ejemplo.csv", import.meta.url), "utf8");
    const { parts, errors } = rowsToParts(parseCsv(csv));
    expect(errors).toEqual([]);
    expect(parts.length).toBeGreaterThan(10);
  });
});

describe("Excel en español", () => {
  it("detecta el separador ; y lee decimales con coma", () => {
    const csv = toCsv([[...COLUMNS]]).replace(/,/g, ";") +
      'bomba;Bomba;;motor-refrigeracion;;Pierburg;nuevo;;138,5;;;1,6;22;18;14;;no;si;"xc60:2018-;xc90:2016-"\n';
    expect(detectDelimiter(csv)).toBe(";");
    const { parts, errors } = rowsToParts(parseCsv(csv));
    expect(errors).toEqual([]);
    expect(parts[0].part.supplier_cost_usd).toBe(138.5);
    expect(parts[0].part.weight_kg).toBe(1.6);
    expect(parts[0].fitments).toHaveLength(2);
  });
});

describe("partsToCsv", () => {
  it("descargar y volver a subir deja las piezas iguales", () => {
    const { parts, errors } = rowsToParts(parseCsv(partsToCsv(DEMO_PARTS)));
    expect(errors).toEqual([]);
    const back = parts.map((p, i) => importToPart(p, DEMO_PARTS[i].id));
    expect(back).toEqual(DEMO_PARTS);
  });
});
