import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  const { env } = getCloudflareContext();
  const runtimeEnv = env as unknown as Record<string, unknown>;

  return NextResponse.json({
    process: {
      url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      service: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    worker: {
      url: !!runtimeEnv.NEXT_PUBLIC_SUPABASE_URL,
      service: !!runtimeEnv.SUPABASE_SERVICE_ROLE_KEY,
    },
    keys: Object.keys(runtimeEnv).filter((k) => k.includes("SUPABASE")),
  });
}
