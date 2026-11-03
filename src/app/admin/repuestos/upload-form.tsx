"use client";

import { useRef, useState, useTransition } from "react";
import { MAX_CSV_BYTES } from "@/lib/parts-csv";
import { importPartsCsv, previewPartsCsv, type CsvImportResult, type CsvPreview } from "./actions";

export function UploadForm() {
  const input = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [result, setResult] = useState<CsvImportResult | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function reset() {
    setFileName(null);
    setText(null);
    setPreview(null);
    if (input.current) input.current.value = "";
  }

  async function onFile(file: File | undefined) {
    setResult(null);
    setPreview(null);
    setLocalError(null);
    if (!file) return;
    if (file.size > MAX_CSV_BYTES) {
      setLocalError("El archivo es muy grande (máximo unas 3,000 piezas).");
      return;
    }
    if (!/\.(csv|txt)$/i.test(file.name)) {
      setLocalError("Guarda la hoja como CSV (en Google Sheets: Archivo → Descargar → CSV).");
      return;
    }
    const content = await readText(file);
    setFileName(file.name);
    setText(content);
    start(async () => setPreview(await previewPartsCsv(content)));
  }

  function confirm() {
    if (!text) return;
    start(async () => {
      const res = await importPartsCsv(text);
      setResult(res);
      if (res.ok) reset();
    });
  }

  const changes = preview ? preview.created.length + preview.updated.length : 0;

  return (
    <div className="mt-4 space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line bg-paper px-4 py-8 text-center hover:border-accent">
        <span className="font-semibold text-accent">{fileName ?? "Elegir archivo .csv"}</span>
        <span className="text-xs text-ink-soft">Exportado desde Google Sheets o Excel</span>
        <input
          ref={input}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
      </label>

      {localError && <p className="rounded-lg bg-bad-soft p-3 text-sm text-bad">{localError}</p>}
      {pending && <p className="text-sm text-ink-soft">{preview ? "Guardando…" : "Revisando la hoja…"}</p>}

      {result?.ok && (
        <p className="rounded-lg border border-ok/30 bg-ok-soft p-3 text-sm text-ok">
          Listo: {plural(result.created, "repuesto nuevo", "repuestos nuevos")} y{" "}
          {plural(result.updated, "actualizado", "actualizados")}. El catálogo ya muestra los cambios.
        </p>
      )}
      {result && !result.ok && <ErrorList errors={result.errors} />}

      {preview && !pending && preview.errors.length > 0 && <ErrorList errors={preview.errors} />}

      {preview && !pending && preview.errors.length === 0 && (
        <div className="space-y-4 rounded-lg border border-line p-4">
          <p className="font-semibold">
            La hoja tiene {plural(preview.total, "repuesto", "repuestos")}: {plural(preview.created.length, "nuevo", "nuevos")},{" "}
            {preview.updated.length} con cambios y {preview.unchanged} sin cambios.
          </p>
          {preview.created.length > 0 && (
            <div>
              <p className="text-sm font-medium text-ok">Nuevos</p>
              <ul className="mt-1 max-h-48 overflow-y-auto text-sm">
                {preview.created.map((p) => (
                  <li key={p.slug}>
                    {p.name} <span className="font-mono text-xs text-ink-soft">{p.slug}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {preview.updated.length > 0 && (
            <div>
              <p className="text-sm font-medium text-accent">Con cambios</p>
              <ul className="mt-1 max-h-48 overflow-y-auto text-sm">
                {preview.updated.map((p) => (
                  <li key={p.slug}>
                    {p.name} <span className="text-xs text-ink-soft">({p.changes.join(", ")})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={confirm} disabled={changes === 0}>
              {changes === 0 ? "No hay cambios para guardar" : `Confirmar y guardar ${plural(changes, "repuesto", "repuestos")}`}
            </button>
            <button type="button" className="btn-secondary" onClick={reset}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ErrorList({ errors }: { errors: string[] }) {
  return (
    <div className="rounded-lg bg-bad-soft p-4 text-sm text-bad">
      <p className="font-semibold">
        {errors.length === 1 ? "Hay 1 problema" : `Hay ${errors.length} problemas`} en la hoja. No se guardó nada:
      </p>
      <ul className="mt-2 max-h-64 list-disc space-y-1 overflow-y-auto pl-5">
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
      <p className="mt-2 text-ink-soft">Corrige esas filas y vuelve a subir el archivo.</p>
    </div>
  );
}

/** Lee el archivo como UTF-8; si no lo es (Excel suele guardar en Windows-1252), usa esa codificación. */
async function readText(file: File): Promise<string> {
  const bytes = await file.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
