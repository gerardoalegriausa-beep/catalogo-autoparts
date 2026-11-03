import { MODELS } from "@/lib/catalog-labels";
import type { VehicleChoice } from "@/lib/catalog-filter";

/**
 * Formulario "¿Para qué vehículo?": modelo + año → catálogo filtrado.
 * Es un formulario GET normal, funciona sin JavaScript.
 */
export function VehiclePicker({
  years,
  initial = {},
  keep = {},
  submitLabel = "Ver repuestos",
}: {
  years: number[];
  initial?: VehicleChoice;
  keep?: Record<string, string | undefined>; // otros filtros que se mantienen (categoría, búsqueda)
  submitLabel?: string;
}) {
  return (
    <form action="/catalogo" className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <div>
        <label htmlFor="picker-modelo" className="label">
          Modelo
        </label>
        <select id="picker-modelo" name="modelo" required defaultValue={initial.modelId ?? ""} className="field">
          <option value="" disabled>
            Elige el modelo
          </option>
          {MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} ({m.bodyType})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="picker-anio" className="label">
          Año
        </label>
        <select id="picker-anio" name="anio" required defaultValue={initial.year ? String(initial.year) : ""} className="field">
          <option value="" disabled>
            Elige el año
          </option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="btn-primary">
        {submitLabel}
      </button>
    </form>
  );
}
