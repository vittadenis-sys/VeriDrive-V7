import { NextResponse } from "next/server";
import { requireWorkshopOwner } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const user = await requireWorkshopOwner();
    const db = createServiceClient();

    const { data: workshop, error: workshopError } = await db
      .from("workshops")
      .select("id,name,city,address,cap")
      .eq("owner_auth_id", user.id)
      .eq("active", true)
      .maybeSingle();

    if (workshopError) throw workshopError;
    if (!workshop) {
      return NextResponse.json({ error: "Officina non associata." }, { status: 404 });
    }

    const { data: bookings, error: bookingsError } = await db
      .from("bookings")
      .select("id,booking_code,customer_id,vehicle_id,workshop_id,service,status,inspection_date,total,travel_km,overall_notes,created_at,updated_at")
      .eq("workshop_id", workshop.id)
      .order("inspection_date", { ascending: true });

    if (bookingsError) throw bookingsError;

    const vehicleIds = (bookings ?? [])
      .map((booking) => booking.vehicle_id)
      .filter((id): id is string => Boolean(id));

    const { data: vehicles, error: vehiclesError } = vehicleIds.length
      ? await db.from("vehicles").select("*").in("id", vehicleIds)
      : { data: [], error: null };

    if (vehiclesError && vehiclesError.code !== "PGRST116") throw vehiclesError;

    const vehicleById = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]));

    const customerIds = (bookings ?? [])
      .map((booking) => booking.customer_id)
      .filter((id): id is string => Boolean(id));

    const { data: customers, error: customersError } = customerIds.length
      ? await db.from("customers").select("id,full_name,email,phone").in("id", customerIds)
      : { data: [], error: null };

    if (customersError && customersError.code !== "PGRST116") throw customersError;

    const customerById = new Map((customers ?? []).map((customer) => [customer.id, customer]));

    const enriched = (bookings ?? []).map((booking) => ({
      ...booking,
      vehicle: booking.vehicle_id ? vehicleById.get(booking.vehicle_id) ?? null : null,
      customer: booking.customer_id ? customerById.get(booking.customer_id) ?? null : null,
    }));

    return NextResponse.json({
      workshop,
      bookings: enriched,
      isSuperAdmin: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Non autorizzato";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
