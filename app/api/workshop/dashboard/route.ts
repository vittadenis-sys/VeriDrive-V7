import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const db = createServiceClient();
    const { data: workshop, error: workshopError } = await db
      .from("workshops")
      .select("id,name,city,address,postal_code")
      .eq("owner_auth_id", user.id)
      .maybeSingle();

    if (workshopError) throw workshopError;
    if (!workshop) {
      return NextResponse.json({ error: "Officina non associata." }, { status: 404 });
    }

    const { data: bookings, error: bookingsError } = await db
      .from("bookings")
      .select("id,booking_code,customer_id,vehicle_id,workshop_id,plate,vehicle_make,vehicle_model,vehicle_year,requested_date,requested_slot,status,service_key,urgency,customer_price_cents,created_at,updated_at")
      .eq("workshop_id", workshop.id)
      .order("requested_date", { ascending: true, nullsFirst: false });

    if (bookingsError) throw bookingsError;

    const customerIds = (bookings ?? []).map((booking) => booking.customer_id).filter(Boolean);
    const vehicleIds = (bookings ?? []).map((booking) => booking.vehicle_id).filter(Boolean);

    const [{ data: customers, error: customersError }, { data: vehicles, error: vehiclesError }] = await Promise.all([
      customerIds.length
        ? db.from("customers").select("id,full_name,phone").in("id", customerIds)
        : Promise.resolve({ data: [], error: null }),
      vehicleIds.length
        ? db.from("vehicles").select("*").in("id", vehicleIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (customersError) throw customersError;
    if (vehiclesError) throw vehiclesError;

    const customerById = new Map((customers ?? []).map((customer) => [customer.id, customer]));
    const vehicleById = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]));

    const enriched = (bookings ?? []).map((booking) => ({
      ...booking,
      customer: customerById.get(booking.customer_id) ?? null,
      vehicle: booking.vehicle_id ? vehicleById.get(booking.vehicle_id) ?? null : null,
      payout: null,
    }));

    return NextResponse.json({ workshop, bookings: enriched, isSuperAdmin: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Non autorizzato";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
