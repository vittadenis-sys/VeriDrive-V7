import { createClient } from "@supabase/supabase-js";

export type CloudflareEnv = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

export function createServiceClient(env?: CloudflareEnv) {
  const url = env?.NEXT_PUBLIC_SUPABASE_URL ?? env?.SUPABASE_URL;
  const key = env?.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) throw new Error("Missing Supabase URL");
  if (!key) throw new Error("Missing Service Role Key");

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
