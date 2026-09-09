import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  const { env } = getCloudflareContext();

  return NextResponse.json({
    ok: true,
    process: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    worker: {
      hasEnv: !!env,
      url: !!env?.NEXT_PUBLIC_SUPABASE_URL,
      supabaseUrl: !!env?.SUPABASE_URL,
      service: !!env?.SUPABASE_SERVICE_ROLE_KEY,
      publishable: !!env?.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      envKeys: Object.keys(env ?? {}).filter((key) => /SUPABASE/i.test(key)),
    },
  });
}

export async function POST() {
  return GET();
}
