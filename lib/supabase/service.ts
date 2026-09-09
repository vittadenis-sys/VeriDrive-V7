import { createClient } from "@supabase/supabase-js";

export function createServiceClient() {
  const read = (name: string) => {
    const runtimeEnv = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
    const value = runtimeEnv?.[name];
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
