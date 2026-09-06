import { createBrowserClient } from "@supabase/ssr";

let cachedClient: ReturnType<typeof createBrowserClient> | null = null;
let initPromise: Promise<ReturnType<typeof createBrowserClient> | null> | null = null;

export function getSupabaseClient() {
  if (cachedClient) return cachedClient;
  if (typeof window === "undefined") return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;

  cachedClient = createBrowserClient(url, key);
  return cachedClient;
}

export async function getSupabaseClientAsync() {
  if (cachedClient) return cachedClient;
  if (initPromise) return initPromise;

  initPromise = Promise.resolve(getSupabaseClient()).finally(() => {
    initPromise = null;
  });

  return initPromise;
}

export const supabase = typeof window !== "undefined" ? getSupabaseClient() : null;
