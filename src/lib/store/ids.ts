import { randomBytes } from "node:crypto";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I/L

/** Referencia corta y legible para el taller, p. ej. "VP-7K3M9Q". */
export function newReference(): string {
  const bytes = randomBytes(6);
  let s = "";
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `VP-${s}`;
}

/** Token secreto para el enlace de seguimiento (no adivinable). */
export function newTrackingToken(): string {
  return randomBytes(18).toString("base64url");
}
