import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cloudflareEnv } from "cloudflare:workers";

export async function createClient() {
  const cookieStore = await cookies();
  const env = cloudflareEnv as {
    NEXT_PUBLIC_SUPABASE_URL?: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
    NEXT_PUBLIC_SUPABASE_PROJECT_URL?: string;
  };

  const url =
    env.NEXT_PUBLIC_SUPABASE_URL ??
    env.NEXT_PUBLIC_SUPABASE_PROJECT_URL ??
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase non configurato nel runtime Cloudflare.");
  }

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: CookieOptions }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server components cannot always mutate cookies during render.
        }
      },
    },
  );
}
