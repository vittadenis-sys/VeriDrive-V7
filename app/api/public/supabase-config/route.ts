import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (url && key) {
    return NextResponse.json({ configured: true, url, key });
  }

  try {
    const service = createServiceClient();
    const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_PROJECT_URL;
    if (!serviceUrl) return NextResponse.json({ configured: false }, { status: 503 });
    return NextResponse.json({ configured: false, serverConfigured: true }, { status: 503 });
  } catch {
    return NextResponse.json({ configured: false }, { status: 503 });
  }
}
