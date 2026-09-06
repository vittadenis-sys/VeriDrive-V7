import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url) return NextResponse.json({ configured: false }, { status: 503 });

  if (key) {
    return NextResponse.json({ configured: true, url, key });
  }

  return NextResponse.json({ configured: false, serverConfigured: true }, { status: 503 });
}
