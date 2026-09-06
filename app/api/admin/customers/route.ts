import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    await requireAdmin();
    const db = createServiceClient();
    const { data, error } = await db
      .from("customers")
      .select("id,full_name,phone,demo_access,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ customers: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Non autorizzato" }, { status: 401 });
  }
}
