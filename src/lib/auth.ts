import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { isDemoMode } from "./store";

// Acceso al panel con una sola contraseña (ADMIN_PASSWORD). La sesión es una
// cookie firmada con HMAC que vence en 7 días.

const COOKIE = "admin_session";
const MAX_AGE_S = 7 * 24 * 60 * 60;
export const DEMO_ADMIN_PASSWORD = "demo";

export function adminPassword(): string | null {
  const configured = process.env.ADMIN_PASSWORD?.trim();
  if (configured) return configured;
  return isDemoMode ? DEMO_ADMIN_PASSWORD : null;
}

function secret(): string {
  const s = process.env.ADMIN_SESSION_SECRET || adminPassword();
  if (!s) throw new Error("Falta configurar ADMIN_PASSWORD");
  return `admin-session:${s}`;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function passwordMatches(input: string): boolean {
  const expected = adminPassword();
  if (!expected) return false;
  // Comparar hashes evita filtrar el largo de la contraseña.
  const h = (s: string) => createHmac("sha256", "pw").update(s).digest("hex");
  return safeEqual(h(input), h(expected));
}

export async function startAdminSession(): Promise<void> {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE_S);
  (await cookies()).set(COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  await connection(); // valida el vencimiento con la hora actual
  if (!adminPassword()) return false;
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || !safeEqual(sig, sign(exp))) return false;
  return Number(exp) * 1000 > Date.now();
}

/** Para páginas y acciones del panel: redirige al login si no hay sesión. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
