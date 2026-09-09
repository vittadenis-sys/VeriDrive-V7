import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET() {
  try {
    const { env } = await getCloudflareContext({ async: true });

    return NextResponse.json({
      ok: true,
      envKey: Boolean(env?.SUPABASE_SERVICE_ROLE_KEY),
      processKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      envUrl: Boolean(env?.NEXT_PUBLIC_SUPABASE_URL || env?.SUPABASE_URL),
      processUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : typeof err,
    }, { status: 500 });
  }
}
