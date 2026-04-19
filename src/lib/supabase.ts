import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _admin: SupabaseClient | null = null;

/**
 * Admin client — service-role key, bypasses RLS. Server-side only.
 * Use this from API routes that need to write on behalf of the demo user.
 */
export function getSupabaseAdmin(): SupabaseClient {
  if (_admin) return _admin;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase admin env: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }

  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

/**
 * Anon client factory — RLS-enforcing. Safe to use in the browser.
 * Once real auth lands this will carry the user's JWT; for the demo it's
 * only used in test scripts that verify RLS actually blocks cross-user reads.
 */
export function createSupabaseAnonClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing Supabase anon env: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.",
    );
  }
  return createClient(url, key);
}

/**
 * The demo user that owns every seeded record. Replace with auth.uid() once
 * login UI lands — API routes will read it from the session cookie instead.
 */
export function getDemoUserId(): string {
  return process.env.DEMO_USER_ID ?? "00000000-0000-0000-0000-000000000001";
}

export function getDemoPatientId(): string {
  return process.env.DEMO_PATIENT_ID ?? "11111111-1111-1111-1111-111111111111";
}
