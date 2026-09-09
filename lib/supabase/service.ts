import { createClient } from "@supabase/supabase-js";

type CloudflareRuntime = {
  env?: Record<string, string | undefined>;
};

export function createServiceClient(runtime?: CloudflareRuntime) {
  const runtimeEnv = runtime?.env;
  const processEnv = typeof process !== "undefined" ? process.env : undefined;

  const url =
    runtimeEnv?.NEXT_PUBLIC_SUPABASE_URL ??
    runtimeEnv?.SUPABASE_URL ??
    processEnv?.NEXT_PUBLIC_SUPABASE_URL ??
    processEnv?.SUPABASE_URL;

  const key =
    runtimeEnv?.SUPABASE_SERVICE_ROLE_KEY ??
    processEnv?.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing Supabase URL");
  if (!key) throw new Error("Missing Service Role Key");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
