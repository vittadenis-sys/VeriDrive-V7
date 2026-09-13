import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });

    const db = createServiceClient();
    const { data: customer, error: customerError } = await db
      .from("customers")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 });
    if (!customer) return NextResponse.json({ error: "Profilo cliente non disponibile." }, { status: 403 });

    const { data: bookings, error } = await db
      .from("bookings")
      .select("id,booking_code,customer_id,vehicle_id,service,status,inspection_date,total,overall_notes,created_at")
      .eq("customer_id", customer.id)
      .eq("status", "completed")
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const bookingIds = (bookings ?? []).map((b) => b.id);
    if (!bookingIds.length) return NextResponse.json({ certificates: [] });

    const { data: certificates, error: certificateError } = await db
      .from("veriscore_certificates")
      .select("id,booking_id,public_code,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,veriscore,workshop_id,issued_at")
      .in("booking_id", bookingIds)
      .order("issued_at", { ascending: false });
    if (certificateError) return NextResponse.json({ error: certificateError.message }, { status: 500 });

    return NextResponse.json({ certificates: certificates ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
