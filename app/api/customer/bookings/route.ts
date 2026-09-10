import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: authError?.message ?? "Accesso richiesto." }, { status: 401 });
    }

    const db = createServiceClient();
    const { data: customer, error: customerError } = await db
      .from("customers")
      .select("id,full_name,phone")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (customerError) {
      console.error("CUSTOMER_PROFILE_LOOKUP_ERROR", { code: customerError.code, details: customerError.details, hint: customerError.hint, message: customerError.message, userId: user.id });
      return NextResponse.json({ error: customerError.message, code: customerError.code, details: customerError.details, hint: customerError.hint }, { status: 500 });
    }

    if (!customer) {
      return NextResponse.json({ error: "Profilo cliente non disponibile." }, { status: 403 });
    }

    const { data: bookings, error } = await db
      .from("bookings")
      .select("id,practice_code,plate,vehicle_make,vehicle_model,vehicle_year,requested_date,requested_slot,status,service_key,urgency,customer_price_cents,workshop_id,created_at,updated_at")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message, code: error.code, details: error.details, hint: error.hint }, { status: 400 });
    }

    return NextResponse.json({ customer, bookings: bookings ?? [] });
  } catch (error) {
    console.error("CUSTOMER_BOOKINGS_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
