import type { Metadata } from "next";
import { adminPassword, DEMO_ADMIN_PASSWORD } from "@/lib/auth";
import { isDemoMode } from "@/lib/store";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar al panel", robots: { index: false } };

export default function LoginPage() {
  const configured = Boolean(adminPassword());
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-2xl font-bold">Panel de pedidos</h1>
      {configured ? (
        <>
          <LoginForm />
          {isDemoMode && !process.env.ADMIN_PASSWORD && (
            <p className="mt-4 text-sm text-ink-soft">
              Modo demostración: la contraseña es <code className="font-mono">{DEMO_ADMIN_PASSWORD}</code>.
            </p>
          )}
        </>
      ) : (
        <p className="mt-4 text-sm text-bad">
          Falta configurar la variable ADMIN_PASSWORD en el servidor para usar el panel.
        </p>
      )}
    </div>
  );
}
