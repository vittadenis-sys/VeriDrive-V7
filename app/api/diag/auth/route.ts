import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const { env } = getCloudflareContext();
    const runtimeEnv = env as unknown as Record<string, string | undefined>;

    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    return NextResponse.json({
      env: {
        url: Boolean(runtimeEnv.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL),
        publishableKey: Boolean(runtimeEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY),
        serviceRole: Boolean(runtimeEnv.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY),
      },
      cookies: cookieStore.getAll().map(({ name }) => name),
      authenticated: Boolean(data.user),
      userId: data.user?.id ?? null,
      error: error?.message ?? null,
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
