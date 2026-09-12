import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";

type Env = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  SUPABASE_PUBLISHABLE_KEY?: string;
};

function readRuntimeEnv(): Env {
  try {
    const context = getCloudflareContext({ async: true });
    return (context?.env ?? {}) as unknown as Env;
  } catch {
    return {};
  }
}

export async function createClient() {
  const cookieStore = await cookies();
  const runtimeEnv = await readRuntimeEnv();
  const processEnv = process.env as Env;

  const url =
    processEnv.NEXT_PUBLIC_SUPABASE_URL ||
    processEnv.SUPABASE_URL ||
    runtimeEnv.NEXT_PUBLIC_SUPABASE_URL ||
    runtimeEnv.SUPABASE_URL;

  const key =
    processEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    processEnv.SUPABASE_PUBLISHABLE_KEY ||
    runtimeEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    runtimeEnv.SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase non configurato.");
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot always mutate cookies during render.
        }
      },
    },
  });
}
