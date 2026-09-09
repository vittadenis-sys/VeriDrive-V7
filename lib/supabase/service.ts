import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export function createServiceClient() {
  let env: Record<string, string | undefined> = {};
  try {
    const context = getCloudflareContext();
    env = (context?.env ?? {}) as Record<string, string | undefined>;
  } catch {
    // Local/dev fallback to process.env.
  }

  const url =
    env.NEXT_PUBLIC_SUPABASE_URL ||
    env.SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL;

  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing Supabase URL");
  if (!key) throw new Error("Missing Service Role Key");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
