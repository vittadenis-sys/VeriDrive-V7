import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    await requireAdmin();
    const db = createServiceClient();
    const { data, error } = await db.from("workshops").select("id,name,city,address,postal_code,is_active").order("city", { ascending: true });
    if (error) throw error;
    const workshops = (data ?? []).map((w) => ({
      ...w,
      display_name: w.city ? `VeriDrive ${w.city} — ${w.name}` : `VeriDrive — ${w.name}`,
    }));
    return NextResponse.json({ workshops });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Non autorizzato" }, { status: 401 });
  }
}
