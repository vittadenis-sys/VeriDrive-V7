import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();

    return NextResponse.json({
      authenticated: Boolean(data.user),
      email: data.user?.email ?? null,
      id: data.user?.id ?? null,
      error: error?.message ?? null,
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : "Errore sconosciuto",
    }, { status: 500 });
  }
}
