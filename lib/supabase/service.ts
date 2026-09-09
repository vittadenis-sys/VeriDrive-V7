import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export function createServiceClient() {
  let env: Record<string, unknown> = {};
  try {
    const context = getCloudflareContext();
    env = (context?.env ?? {}) as Record<string, unknown>;
  } catch {
    // Local/dev fallback.
  }

  const read = (name: string) => {
    const value = env[name] ?? process.env[name];
    return typeof value === "string" ? value : undefined;
  };

  const url = read("NEXT_PUBLIC_SUPABASE_URL") ?? read("SUPABASE_URL");
  const key = read("SUPABASE_SERVICE_ROLE_KEY");

  if (!url) throw new Error("Missing Supabase URL");
  if (!key) throw new Error("Missing Service Role Key");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
