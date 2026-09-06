import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });
  const { data: customer } = await supabase.from("customers").select("id,full_name,phone,demo_access").eq("auth_id", user.id).maybeSingle();
  if (!customer) return NextResponse.json({ error: "Profilo cliente non disponibile." }, { status: 403 });

  const { data: bookings, error } = await supabase
    .from("bookings")
    .select("id,plate,vehicle_make,vehicle_model,vehicle_year,requested_date,requested_slot,status,service_key,urgency,customer_price_cents,workshop_id,created_at,updated_at")
    .eq("customer_id", customer.id)
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ customer, bookings: bookings ?? [] });
}
