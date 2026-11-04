"use client";

import { useActionState, useState, useTransition } from "react";
import { MODEL_NAMES, MODELS } from "@/lib/catalog-labels";
import type { ModelId } from "@/lib/types";
import { checkVin, normalizeVin } from "@/lib/vin";
import type { VinInspection } from "@/lib/vin-inspection";
import { createOrder, previewVin, type OrderFormState } from "../actions";

const initial: OrderFormState = { errors: {}, message: null, values: {} };

export function OrderForm({
  slug,
  highRisk,
  years,
  initialModel,
  initialYear,
}: {
  slug: string;
  highRisk: boolean;
  years: number[];
  initialModel?: ModelId;
  initialYear?: number;
}) {
  const [state, action, pending] = useActionState(createOrder.bind(null, slug), initial);
  const [vin, setVin] = useState(state.values.vin ?? "");
  const [model, setModel] = useState<string>(initialModel ?? "");
  const [year, setYear] = useState<string>(initialYear ? String(initialYear) : "");
  const [autoFilled, setAutoFilled] = useState(false);
  const [preview, setPreview] = useState<VinInspection | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [checking, startCheck] = useTransition();

  const clean = normalizeVin(vin);
  const local = clean.length === 17 ? checkVin(clean) : null;
  const previewIsCurrent = preview?.vin === clean;

  function runPreview(value: string, m = model, y = year) {
    const v = normalizeVin(value);
    if (v.length !== 17 || !checkVin(v).valid) return;
    startCheck(async () => {
      const res = await previewVin(slug, v, m, y);
      if ("error" in res) {
        setPreviewError(res.error);
        setPreview(null);
        return;
      }
      setPreviewError(null);
      setPreview(res);
      // Si el taller aún no eligió modelo o año, se completan con lo que dice el VIN.
      const car = res.vehicle;
      let filled = false;
      if (!m && car?.modelId) {
        setModel(car.modelId);
        filled = true;
      }
      if (!y && car?.source === "nhtsa" && car.modelYear && years.includes(car.modelYear)) {
        setYear(String(car.modelYear));
        filled = true;
      }
      if (filled) setAutoFilled(true);
    });
  }

  const err = state.errors;
  const v = state.values;

  return (
    <form action={action} className="card space-y-6 p-6" noValidate>
      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">1. Vehículo</legend>
        <div>
          <label htmlFor="vin" className="label">
            VIN (número de chasis) *
          </label>
          <input
            id="vin"
            name="vin"
            value={vin}
            onChange={(e) => {
              setVin(e.target.value);
              if (normalizeVin(e.target.value).length === 17) runPreview(e.target.value);
            }}
            onBlur={(e) => runPreview(e.target.value)}
            placeholder="Ej.: YV4A22PK0G1234567"
            autoComplete="off"
            spellCheck={false}
            maxLength={25}
            aria-invalid={Boolean(err.vin)}
            className="field font-mono uppercase tracking-wider"
          />
          <p className="mt-1 text-xs text-ink-soft">
            {clean.length}/17 · Está en la tarjeta de propiedad y en la base del parabrisas.
          </p>
          {local && !local.valid && <p className="mt-2 text-sm text-bad">{local.errors.join(" ")}</p>}
          {err.vin && <p className="mt-2 text-sm text-bad">{err.vin}</p>}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="vehicleModel" className="label">
              Modelo *
            </label>
            <select
              id="vehicleModel"
              name="vehicleModel"
              value={model}
              onChange={(e) => {
                setModel(e.target.value);
                setAutoFilled(false);
                runPreview(vin, e.target.value, year);
              }}
              aria-invalid={Boolean(err.vehicleModel)}
              className="field"
            >
              <option value="" disabled>
                Elige el modelo
              </option>
              {MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.bodyType})
                </option>
              ))}
            </select>
            {err.vehicleModel && <p className="mt-1 text-sm text-bad">{err.vehicleModel}</p>}
          </div>
          <div>
            <label htmlFor="vehicleYear" className="label">
              Año *
            </label>
            <select
              id="vehicleYear"
              name="vehicleYear"
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setAutoFilled(false);
                runPreview(vin, model, e.target.value);
              }}
              aria-invalid={Boolean(err.vehicleYear)}
              className="field"
            >
              <option value="" disabled>
                Elige el año
              </option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
            {err.vehicleYear && <p className="mt-1 text-sm text-bad">{err.vehicleYear}</p>}
          </div>
        </div>
        {autoFilled && <p className="text-xs text-ink-soft">Completamos modelo y año con lo que dice el VIN. Revísalos.</p>}

        {checking && <p className="text-sm text-ink-soft">Leyendo el VIN…</p>}
        {previewError && <p className="text-sm text-bad">{previewError}</p>}
        {preview && previewIsCurrent && !checking && <VinPreview preview={preview} />}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">2. Pieza</legend>
        <div className="grid gap-3 sm:grid-cols-[1fr_7rem]">
          <div>
            <label htmlFor="oldPartNumber" className="label">
              N.º de parte de la pieza que sale {highRisk ? "*" : "(opcional)"}
            </label>
            <input
              id="oldPartNumber"
              name="oldPartNumber"
              defaultValue={v.oldPartNumber}
              placeholder="Está en la etiqueta de la pieza"
              className="field font-mono"
            />
            {err.oldPartNumber && <p className="mt-1 text-sm text-bad">{err.oldPartNumber}</p>}
          </div>
          <div>
            <label htmlFor="quantity" className="label">
              Cantidad
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              min={1}
              max={10}
              defaultValue={v.quantity || "1"}
              className="field"
            />
            {err.quantity && <p className="mt-1 text-sm text-bad">{err.quantity}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="customerNotes" className="label">
            Notas (opcional)
          </label>
          <textarea
            id="customerNotes"
            name="customerNotes"
            defaultValue={v.customerNotes}
            rows={2}
            placeholder="Ej.: lado izquierdo, versión con luces adaptativas…"
            className="field"
          />
          {err.customerNotes && <p className="mt-1 text-sm text-bad">{err.customerNotes}</p>}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-lg font-semibold">3. Taller</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field name="shopName" label="Nombre del taller *" error={err.shopName} defaultValue={v.shopName} />
          <Field name="shopRuc" label="RUC (opcional)" error={err.shopRuc} defaultValue={v.shopRuc} inputMode="numeric" />
          <Field name="contactName" label="Persona de contacto *" error={err.contactName} defaultValue={v.contactName} />
          <Field
            name="phone"
            label="Celular / WhatsApp *"
            error={err.phone}
            defaultValue={v.phone}
            inputMode="tel"
            placeholder="987 654 321"
          />
          <Field name="email" label="Correo (opcional)" error={err.email} defaultValue={v.email} type="email" />
        </div>
        <div className="hidden" aria-hidden>
          <label>
            Sitio web
            <input name="website" tabIndex={-1} autoComplete="off" />
          </label>
        </div>
      </fieldset>

      {state.message && <p className="rounded-lg bg-bad-soft p-3 text-sm text-bad">{state.message}</p>}

      <div>
        <button
          type="submit"
          className="btn-primary w-full sm:w-auto"
          disabled={
            pending || (previewIsCurrent && (preview?.fitment?.status === "incompatible" || Boolean(preview?.mismatch)))
          }
        >
          {pending ? "Enviando…" : "Enviar pedido"}
        </button>
        <p className="mt-2 text-xs text-ink-soft">
          Revisaremos el VIN en el catálogo original y te confirmaremos por WhatsApp antes de comprar.
        </p>
      </div>
    </form>
  );
}

function VinPreview({ preview }: { preview: VinInspection }) {
  const car = preview.vehicle;
  const status = preview.fitment?.status;
  const tone =
    !preview.valid || status === "incompatible" || preview.mismatch
      ? "border-bad/30 bg-bad-soft text-bad"
      : status === "compatible"
        ? "border-ok/30 bg-ok-soft text-ok"
        : "border-warn/30 bg-warn-soft text-warn";
  const title = !preview.valid
    ? "VIN no válido para este catálogo"
    : preview.mismatch
      ? "El VIN no coincide con el vehículo elegido"
      : status === "compatible"
      ? "Compatible"
      : status === "incompatible"
        ? "No corresponde a tu vehículo"
        : "Lo validaremos a mano";

  return (
    <div className={`rounded-lg border p-4 text-sm ${tone}`}>
      <p className="font-semibold">{title}</p>
      {car && (car.model || car.modelYear) && (
        <p className="mt-1 text-ink">
          {[car.make, car.modelId ? MODEL_NAMES[car.modelId] : car.model, car.modelYear, car.trim]
            .filter(Boolean)
            .join(" ")}
          {car.engine && <span className="text-ink-soft"> · {car.engine}</span>}
        </p>
      )}
      {preview.errors.map((e) => (
        <p key={e} className="mt-1">
          {e}
        </p>
      ))}
      {preview.mismatch && <p className="mt-1">{preview.mismatch}</p>}
      {preview.fitment && !preview.mismatch && <p className="mt-1">{preview.fitment.reason}</p>}
      {preview.warnings.map((w) => (
        <p key={w} className="mt-1 text-xs text-ink-soft">
          {w}
        </p>
      ))}
    </div>
  );
}

function Field({
  name,
  label,
  error,
  ...input
}: { name: string; label: string; error?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} name={name} aria-invalid={Boolean(error)} className="field" {...input} />
      {error && <p className="mt-1 text-sm text-bad">{error}</p>}
    </div>
  );
}
