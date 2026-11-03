import "server-only";
import { memoryStore } from "./memory";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

export const isDemoMode = !(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

/** Supabase si está configurado; si no, modo demostración en memoria. */
export function getStore(): Store {
  return isDemoMode ? memoryStore : supabaseStore;
}
