import { NextResponse } from "next/server";
import { cloudflareEnv } from "cloudflare:workers";

export async function GET() {
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

  return NextResponse.json({
    configured: Boolean(url && key),
    url: Boolean(url),
    key: Boolean(key),
  });
}
