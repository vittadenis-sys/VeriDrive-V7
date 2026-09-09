import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase non configurato.");
  }

  return createBrowserClient(url, key, {
    cookieOptions: {
      sameSite: "lax",
      secure: typeof window !== "undefined" && window.location.protocol === "https:",
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = typeof window !== "undefined" ? createClient() : null;
