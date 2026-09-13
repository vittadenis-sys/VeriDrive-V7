import { createClient } from "@supabase/supabase-js";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type Env = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
};

async function readRuntimeEnv(): Promise<Env> {
  try {
    const context = await getCloudflareContext({ async: true });
    return (context?.env ?? {}) as unknown as Env;
  } catch {
    return {};
  }
}

export async function createServiceClient() {
  const runtimeEnv = await readRuntimeEnv();
  const processEnv = process.env as Env;

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
