import { NextResponse } from "next/server";

export async function GET() {
  const env = process.env;

  return NextResponse.json({
    ok: true,
    runtime: "cloudflare",
    hasProcess: typeof process !== "undefined",
    keys: {
      NEXT_PUBLIC_SUPABASE_URL: !!env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_URL: !!env.SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        !!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      SUPABASE_SERVICE_ROLE_KEY: !!env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
}
