import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  const { env } = getCloudflareContext();
  const runtimeEnv = env as unknown as Record<string, unknown>;

  return NextResponse.json({
    ok: true,
    process: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    worker: {
      hasEnv: !!env,
      url: !!runtimeEnv.NEXT_PUBLIC_SUPABASE_URL,
      supabaseUrl: !!runtimeEnv.SUPABASE_URL,
      service: !!runtimeEnv.SUPABASE_SERVICE_ROLE_KEY,
      publishable: !!runtimeEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      envKeys: Object.keys(runtimeEnv).filter((key) => /SUPABASE/i.test(key)),
    },
  });
}

export async function POST() {
  return GET();
}
