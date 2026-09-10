import { createBrowserClient } from "@supabase/ssr";

function getConfig() {
  const runtime = typeof window !== "undefined"
    ? (window as Window & { __VERIDRIVE_SUPABASE__?: { url?: string; publishableKey?: string } }).__VERIDRIVE_SUPABASE__
    : undefined;

  const url =
    runtime?.url ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL;

  const key =
    runtime?.publishableKey ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.SUPABASE_PUBLISHABLE_KEY;

  return { url, key };
}

export function createClient() {
  const { url, key } = getConfig();

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
