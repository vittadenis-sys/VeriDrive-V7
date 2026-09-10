import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function createClient() {
  const cookieStore = await cookies();
  const { env } = getCloudflareContext();
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const processEnv = process.env as Record<string, string | undefined>;

  const url =
    processEnv.NEXT_PUBLIC_SUPABASE_URL ||
    runtimeEnv.NEXT_PUBLIC_SUPABASE_URL ||
    processEnv.SUPABASE_URL ||
    runtimeEnv.SUPABASE_URL;

  const key =
    processEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    runtimeEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

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
