import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export function createServiceClient() {
  const { env } = getCloudflareContext();
  const runtimeEnv = env as unknown as Record<string, string | undefined>;

  const url =
    runtimeEnv.NEXT_PUBLIC_SUPABASE_URL ??
    runtimeEnv.SUPABASE_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL ??
    process.env.SUPABASE_URL;

  const key =
    runtimeEnv.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing Supabase URL");
  if (!key) throw new Error("Missing Service Role Key");

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
