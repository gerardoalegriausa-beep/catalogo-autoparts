"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { normalizeVin } from "@/lib/vin";

export function VinSearch({ initial = "", compact = false }: { initial?: string; compact?: boolean }) {
  const router = useRouter();
  const [vin, setVin] = useState(initial);
  const clean = normalizeVin(vin);
  const ready = clean.length === 17;

  return (
    <form
      className={`flex flex-col gap-2 ${compact ? "sm:flex-row" : "sm:flex-row sm:items-start"}`}
      onSubmit={(e) => {
        e.preventDefault();
        if (ready) router.push(`/vin?vin=${clean}`);
      }}
    >
      <div className="flex-1">
        <label htmlFor="vin-search" className="sr-only">
          VIN del vehículo
        </label>
        <input
          id="vin-search"
          value={vin}
          onChange={(e) => setVin(e.target.value)}
          placeholder="VIN de 17 caracteres (chasis)"
          autoComplete="off"
          spellCheck={false}
          maxLength={25}
          className="field font-mono uppercase tracking-wider"
        />
        <p className="mt-1 text-xs text-ink-soft">{clean.length}/17 caracteres</p>
      </div>
      <button type="submit" className="btn-primary" disabled={!ready}>
        Buscar repuestos
      </button>
    </form>
  );
}
