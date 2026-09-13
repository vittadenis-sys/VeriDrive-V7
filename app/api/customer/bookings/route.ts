import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ROUTE_VERSION = "customer-bookings-2026-09-13-v5";

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ routeVersion: ROUTE_VERSION, ...data }, {
    status,
    headers: { "Cache-Control": "no-store, max-age=0", "X-VeriDrive-Route": ROUTE_VERSION },
  });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ stage: "auth", error: authError?.message ?? "Accesso richiesto." }, 401);

    const db = createServiceClient();
    const { data: customer, error: customerError } = await db
      .from("customers")
      .select("id,full_name,phone")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (customerError) return json({ stage: "customer", error: customerError.message }, 500);
    if (!customer) return json({ stage: "customer", error: "Profilo cliente non disponibile." }, 403);

    const { data: bonusRow, error: bonusError } = await db
      .from("customer_bonus")
      .select("free_bookings")
      .eq("customer_id", customer.id)
      .maybeSingle();
    if (bonusError) return json({ stage: "bonus", error: bonusError.message }, 500);

    const { data: bookings, error } = await db
      .from("bookings")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });
    if (error) return json({ stage: "bookings", error: error.message, code: error.code, details: error.details, hint: error.hint }, 400);

    const bookingIds = (bookings ?? []).map((booking) => booking.id).filter(Boolean);
    let certificates: Record<string, unknown>[] = [];
    if (bookingIds.length) {
      const certificateResult = await db
        .from("veriscore_certificates")
        .select("id,booking_id,public_code,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,veriscore,workshop_id,issued_at")
        .in("booking_id", bookingIds)
        .order("issued_at", { ascending: false });
      if (certificateResult.error) {
        return json({ stage: "certificates", error: certificateResult.error.message, code: certificateResult.error.code, details: certificateResult.error.details, hint: certificateResult.error.hint }, 500);
      }
      certificates = (certificateResult.data ?? []) as Record<string, unknown>[];
    }

    const normalizedBookings = (bookings ?? []).map((booking) => ({
      id: booking.id ?? null,
      booking_code: booking.booking_code ?? null,
      practice_code: booking.booking_code ?? null,
      plate: "",
      vehicle_make: null,
      vehicle_model: null,
      vehicle_year: null,
      requested_date: booking.inspection_date ? String(booking.inspection_date).slice(0, 10) : null,
      requested_slot: booking.inspection_date ? String(booking.inspection_date).slice(11, 16) : null,
      inspection_date: booking.inspection_date ?? null,
      status: booking.status ?? "",
      service_key: booking.service ?? "",
      urgency: false,
      customer_price_cents: Number(booking.total ?? 0),
      workshop_id: booking.workshop_id ?? null,
      created_at: booking.created_at ?? null,
      updated_at: booking.created_at ?? null,
    }));

    return json({
      stage: "done",
      customer: {
        ...customer,
        autogerma_free_booking_bonus: Number(bonusRow?.free_bookings ?? 0),
        free_bookings: Number(bonusRow?.free_bookings ?? 0),
      },
      bookings: normalizedBookings,
      certificates,
      bookingColumns: bookings && bookings.length > 0 ? Object.keys(bookings[0]) : [],
    });
  } catch (error) {
    console.error("CUSTOMER_BOOKINGS_ERROR", error);
    return json({ stage: "exception", error: error instanceof Error ? error.message : String(error) }, 500);
  }
}
