"use client";

import { useActionState } from "react";
import { login } from "../actions";

export function LoginForm() {
  const [error, action, pending] = useActionState(login, null);
  return (
    <form action={action} className="card mt-6 space-y-4 p-6">
      <div>
        <label htmlFor="password" className="label">
          Contraseña
        </label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="field" />
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
      <button type="submit" className="btn-primary w-full" disabled={pending}>
        {pending ? "Ingresando…" : "Ingresar"}
      </button>
    </form>
  );
}
