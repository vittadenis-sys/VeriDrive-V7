import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const db = createServiceClient();
    const url = new URL(request.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search")?.trim() ?? "";

    let query = db
      .from("bookings")
      .select("id,practice_code,plate,vehicle_make,vehicle_model,requested_date,requested_slot,status,service_key,urgency,workshop_id")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);
    if (search) {
      const escaped = search.replace(/[%_]/g, "\\$&");
      query = query.or(`practice_code.ilike.%${escaped}%,plate.ilike.%${escaped}%,vehicle_make.ilike.%${escaped}%,vehicle_model.ilike.%${escaped}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ bookings: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Non autorizzato" }, { status: 401 });
  }
}
