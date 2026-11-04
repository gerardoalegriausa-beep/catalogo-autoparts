"use client";

import { useState, type ReactNode } from "react";
import { VinSearch } from "./vin-search";

type Tab = "vin" | "vehiculo" | "nombre";

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: "vin", label: "Por VIN", hint: "La forma más segura: te mostramos solo lo que le sirve a ese vehículo." },
  { id: "vehiculo", label: "Por vehículo", hint: "Elige modelo y año, y luego la pieza." },
  { id: "nombre", label: "Por nombre", hint: "Escribe el nombre de la pieza, la marca o el número de parte." },
];

/** Buscador del inicio con tres formas de encontrar un repuesto. */
export function Finder({ vehiclePicker }: { vehiclePicker: ReactNode }) {
  const [tab, setTab] = useState<Tab>("vin");
  const current = TABS.find((t) => t.id === tab)!;

  return (
    <div className="rounded-xl bg-white p-5 text-ink shadow-lg">
      <h2 className="font-semibold">Encuentra el repuesto</h2>
      <div role="tablist" className="mt-3 grid grid-cols-3 gap-1 rounded-lg bg-paper p-1 text-sm font-medium">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-md px-2 py-2 ${tab === t.id ? "bg-white text-brand shadow-sm" : "text-ink-soft hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mb-3 mt-3 text-sm text-ink-soft">{current.hint}</p>
      {tab === "vin" && <VinSearch compact />}
      {tab === "vehiculo" && vehiclePicker}
      {tab === "nombre" && (
        <form action="/catalogo" className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="finder-q" className="sr-only">
            Nombre o número de parte
          </label>
          <input id="finder-q" name="q" required placeholder="Ej.: bomba de agua, sensor ABS" className="field flex-1" />
          <button type="submit" className="btn-primary">
            Buscar
          </button>
        </form>
      )}
      <p className="mt-4 border-t border-line pt-3 text-xs text-ink-soft">
        Busques como busques, al pedir te pediremos el VIN, el modelo y el año para confirmar que la pieza corresponde.
      </p>
    </div>
  );
}
