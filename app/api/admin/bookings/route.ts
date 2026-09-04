import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const db = createServiceClient();
    const status = new URL(request.url).searchParams.get("status");
    let query = db.from("bookings").select("id,plate,vehicle_make,vehicle_model,requested_date,requested_slot,status,service_key,urgency,workshop_id").order("requested_date", { ascending: true });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ bookings: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Non autorizzato" }, { status: 401 });
  }
}
