import "server-only";
import { createClient } from "@supabase/supabase-js";

function requiredEnv(name: "SUPABASE_URL" | "SUPABASE_SERVICE_ROLE_KEY"): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name} (zie .env.local.example)`);
  return value;
}

export const supabase = createClient(
  requiredEnv("SUPABASE_URL"),
  requiredEnv("SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
);
