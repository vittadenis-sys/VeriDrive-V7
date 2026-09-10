import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export function createServiceClient() {
  const { env } = getCloudflareContext();
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const processEnv = process.env as Record<string, string | undefined>;

  const url =
    processEnv.NEXT_PUBLIC_SUPABASE_URL ||
    processEnv.SUPABASE_URL ||
    runtimeEnv.NEXT_PUBLIC_SUPABASE_URL ||
    runtimeEnv.SUPABASE_URL;

  const key =
    processEnv.SUPABASE_SERVICE_ROLE_KEY ||
    runtimeEnv.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing Supabase URL");
  if (!key) throw new Error("Missing Service Role Key");

  return createClient(url, key, {
    global: {
      fetch: globalThis.fetch,
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
