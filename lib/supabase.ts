import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const configUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const configKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!configUrl || !configKey) {
    throw new Error("Supabase non configurato.");
  }

  return createBrowserClient(configUrl, configKey, {
    cookieOptions: {
      sameSite: "lax",
      secure: true,
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = typeof window !== "undefined" ? createClient() : null;
