// Lectura y validación del CSV de repuestos (sin dependencias).
// Formato de la columna "compatibilidad": entradas separadas por ";" con
//   modelo:añoDesde-añoHasta[:motor]
// Ejemplos: "xc60:2018-"  "xc90:2016-2020:B4204T;s90:2017-"

export const MODELS = ["xc40", "xc60", "xc90", "s60", "s90"];
export const CATEGORIES = ["sensores-electronica", "motor-refrigeracion", "frenos", "iluminacion"];
export const CONDITIONS = ["nuevo", "reconstruido", "usado"];

export const COLUMNS = [
  "slug",
  "nombre",
  "descripcion",
  "categoria",
  "numero_parte",
  "marca",
  "condicion",
  "proveedor",
  "costo_usd",
  "margen_pct",
  "envio_eeuu_usd",
  "peso_kg",
  "largo_cm",
  "ancho_cm",
  "alto_cm",
  "arancel_pct",
  "requiere_numero_parte",
  "activo",
  "compatibilidad",
];

/** Parser CSV con comillas ("a, b"), comillas dobles escapadas ("") y saltos de línea dentro de comillas. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((v) => v.trim() !== ""));
}

export function toCsv(rows) {
  const esc = (v) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return rows.map((r) => r.map(esc).join(",")).join("\n") + "\n";
}

const truthy = (v) => ["si", "sí", "true", "1", "x", "yes"].includes(v.trim().toLowerCase());

function number(value, { required = false, min = 0 } = {}) {
  const s = value.trim().replace(",", ".");
  if (s === "") return required ? NaN : null;
  const n = Number(s);
  return Number.isFinite(n) && n >= min ? n : NaN;
}

export function parseFitments(value) {
  const errors = [];
  const fitments = [];
  for (const raw of value.split(";").map((s) => s.trim()).filter(Boolean)) {
    const m = raw.match(/^([a-z0-9]+)\s*:\s*(\d{4})\s*-\s*(\d{4})?\s*(?::\s*([A-Za-z0-9]+))?$/i);
    if (!m) {
      errors.push(`compatibilidad "${raw}" no tiene el formato modelo:2018-2022[:motor]`);
      continue;
    }
    const [, model, from, to, engine] = m;
    const modelId = model.toLowerCase();
    if (!MODELS.includes(modelId)) {
      errors.push(`modelo "${model}" no existe (usa ${MODELS.join(", ")})`);
      continue;
    }
    const yearFrom = Number(from);
    const yearTo = to ? Number(to) : null;
    if (yearTo !== null && yearTo < yearFrom) {
      errors.push(`compatibilidad "${raw}": el año final es menor que el inicial`);
      continue;
    }
    fitments.push({ model_id: modelId, year_from: yearFrom, year_to: yearTo, engine: engine ? engine.toUpperCase() : null });
  }
  if (fitments.length === 0 && errors.length === 0) errors.push("falta la compatibilidad");
  return { fitments, errors };
}

/** Convierte las filas del CSV en piezas listas para Supabase. Devuelve errores por fila. */
export function rowsToParts(rows) {
  const [header, ...data] = rows;
  const cols = header.map((h) => h.trim().toLowerCase());
  const missing = COLUMNS.filter((c) => !cols.includes(c));
  if (missing.length) return { parts: [], errors: [`Faltan columnas: ${missing.join(", ")}`] };

  const parts = [];
  const errors = [];
  const slugs = new Set();
  data.forEach((values, i) => {
    const line = i + 2;
    const get = (c) => (values[cols.indexOf(c)] ?? "").trim();
    const rowErrors = [];

    const slug = get("slug").toLowerCase();
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) rowErrors.push("slug inválido (solo minúsculas, números y guiones)");
    else if (slugs.has(slug)) rowErrors.push(`slug "${slug}" repetido`);
    slugs.add(slug);

    const category = get("categoria");
    if (!CATEGORIES.includes(category)) rowErrors.push(`categoría "${category}" no existe`);
    const condition = get("condicion") || "nuevo";
    if (!CONDITIONS.includes(condition)) rowErrors.push(`condición "${condition}" no existe`);
    if (!get("nombre")) rowErrors.push("falta el nombre");
    if (!get("marca")) rowErrors.push("falta la marca");

    const nums = {
      supplier_cost_usd: number(get("costo_usd"), { required: true }),
      margin_pct: number(get("margen_pct")),
      us_shipping_usd: number(get("envio_eeuu_usd")) ?? 0,
      weight_kg: number(get("peso_kg"), { required: true }),
      length_cm: number(get("largo_cm"), { required: true }),
      width_cm: number(get("ancho_cm"), { required: true }),
      height_cm: number(get("alto_cm"), { required: true }),
      duty_pct: number(get("arancel_pct")),
    };
    for (const [k, v] of Object.entries(nums)) if (Number.isNaN(v)) rowErrors.push(`${k} no es un número válido`);

    const { fitments, errors: fitErrors } = parseFitments(get("compatibilidad"));
    rowErrors.push(...fitErrors);

    if (rowErrors.length) {
      errors.push(`Fila ${line}: ${rowErrors.join("; ")}`);
      return;
    }
    parts.push({
      part: {
        slug,
        name: get("nombre"),
        description: get("descripcion"),
        category_id: category,
        oem_part_number: get("numero_parte") || null,
        brand: get("marca"),
        condition,
        supplier: get("proveedor") || null,
        ...nums,
        high_risk: truthy(get("requiere_numero_parte")),
        active: get("activo") === "" ? true : truthy(get("activo")),
      },
      fitments,
    });
  });
  return { parts, errors };
}
