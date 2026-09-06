import { createBrowserClient } from "@supabase/ssr";

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;
let initPromise: Promise<ReturnType<typeof createBrowserClient> | null> | null = null;

export function getSupabaseClient() {
  if (cachedClient) return cachedClient;
  if (typeof window === "undefined") return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  cachedClient = createBrowserClient(url, key);
  return cachedClient;
}

export async function getSupabaseClientAsync() {
  if (cachedClient) return cachedClient;
  if (initPromise) return initPromise;

  initPromise = fetch("/api/public/supabase-config", { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) return null;
      const config = await response.json() as { configured?: boolean; url?: string; key?: string };
      if (!config.configured || !config.url || !config.key) return null;
      cachedClient = createBrowserClient(config.url, config.key);
      return cachedClient;
    })
    .catch(() => null)
    .finally(() => {
      initPromise = null;
    });

  return initPromise;
}

export const supabase = typeof window !== "undefined" ? getSupabaseClient() : null;
