import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    await requireAdmin();
    const db = createServiceClient();
    const { data: workshops, error } = await db.from("workshops").select("id,name,city,address,postal_code,is_active").order("city", { ascending: true });
    if (error) throw error;

    const { data: completed } = await db
      .from("workshop_completed_vehicles")
      .select("workshop_id,booking_id,plate,vehicle_make,vehicle_model,vehicle_year,service_key,requested_date,requested_slot,urgency,amount_cents,completed_at")
      .order("completed_at", { ascending: false });

    const { data: monthly } = await db
      .from("workshop_monthly_due")
      .select("workshop_id,period_month,completed_count,total_due_cents")
      .order("period_month", { ascending: false });

    return NextResponse.json({ workshops: workshops ?? [], completed: completed ?? [], monthly: monthly ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Non autorizzato";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
