import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function parseSnapshot(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value) return value as Record<string, unknown>;
  if (typeof value !== "string" || !value.trim()) return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed as Record<string, unknown> : {};
  } catch {
    return {};
  }
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Sessione non disponibile." }, { status: 401 });
    }

    const db = createServiceClient();

    const { data: admin } = await db
      .from("admins")
      .select("role")
      .eq("auth_id", user.id)
      .maybeSingle();

    const isAdmin = !!admin && ["admin", "super_admin"].includes(admin.role);

    const workshopQuery = db
      .from("workshops")
      .select("id,name,city,address,cap,lat,lng,active,owner_auth_id");

    const { data: workshop, error: workshopError } = isAdmin
      ? await workshopQuery.order("name", { ascending: true }).limit(1).maybeSingle()
      : await workshopQuery.eq("owner_auth_id", user.id).maybeSingle();

    if (workshopError) {
      return NextResponse.json({ error: workshopError.message }, { status: 500 });
    }

    if (!workshop) {
      return NextResponse.json({ error: "Officina non associata." }, { status: 404 });
    }

    const { data: bookings, error: bookingsError } = await db
      .from("bookings")
      .select("id,booking_code,customer_id,vehicle_id,workshop_id,service,status,inspection_date,total,travel_km,overall_notes,created_at")
      .eq("workshop_id", workshop.id)
      .order("inspection_date", { ascending: true, nullsFirst: false });

    if (bookingsError) {
      return NextResponse.json({ error: bookingsError.message }, { status: 500 });
    }

    const customerIds = (bookings ?? [])
      .map((booking) => booking.customer_id)
      .filter((id): id is string => Boolean(id));
    const vehicleIds = (bookings ?? [])
      .map((booking) => booking.vehicle_id)
      .filter((id): id is string => Boolean(id));
    const bookingIds = (bookings ?? [])
      .map((booking) => booking.id)
      .filter((id): id is string => Boolean(id));

    const [{ data: customers, error: customersError }, { data: vehicles, error: vehiclesError }, { data: certificates, error: certificatesError }] = await Promise.all([
      customerIds.length
        ? db.from("customers").select("id,full_name,phone").in("id", customerIds)
        : Promise.resolve({ data: [], error: null }),
      vehicleIds.length
        ? db.from("vehicles").select("*").in("id", vehicleIds)
        : Promise.resolve({ data: [], error: null }),
      bookingIds.length
        ? db.from("veriscore_certificates").select("id,booking_id,public_code").in("booking_id", bookingIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (customersError) {
      return NextResponse.json({ error: customersError.message }, { status: 500 });
    }
    if (vehiclesError) {
      return NextResponse.json({ error: vehiclesError.message }, { status: 500 });
    }
    if (certificatesError) {
      return NextResponse.json({ error: certificatesError.message }, { status: 500 });
    }

    const customerById = new Map((customers ?? []).map((customer) => [customer.id, customer]));
    const vehicleById = new Map((vehicles ?? []).map((vehicle) => [vehicle.id, vehicle]));
    const certificateByBookingId = new Map((certificates ?? []).map((certificate) => [certificate.booking_id, certificate]));

    const enriched = (bookings ?? []).map((booking) => {
      const snapshot = parseSnapshot(booking.overall_notes);
      const vehicle = booking.vehicle_id ? vehicleById.get(booking.vehicle_id) ?? null : null;
      const normalizedVehicle = vehicle ?? {
        id: null,
        plate: snapshot.plate ?? null,
        make: snapshot.vehicle_make ?? null,
        model: snapshot.vehicle_model ?? null,
        year: snapshot.vehicle_year ?? null,
        vin: snapshot.vin ?? null,
        mileage: snapshot.vehicle_mileage ?? null,
      };
      const certificate = certificateByBookingId.get(booking.id) ?? null;
      return {
        ...booking,
        customer: customerById.get(booking.customer_id) ?? null,
        vehicle: normalizedVehicle,
        certificate_id: certificate?.id ?? null,
        certificate_code: certificate?.public_code ?? null,
        payout: null,
      };
    });

    return NextResponse.json({
      workshop,
      bookings: enriched,
      isSuperAdmin: admin?.role === "super_admin",
    });
  } catch (error) {
    console.error("WORKSHOP_DASHBOARD_ERROR", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno." },
      { status: 500 }
    );
  }
}
