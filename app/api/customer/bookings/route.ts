import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ROUTE_VERSION = "customer-bookings-diag-2026-09-10-v1";

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ routeVersion: ROUTE_VERSION, ...data }, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-VeriDrive-Route": ROUTE_VERSION,
    },
  });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({
        stage: "auth",
        error: authError?.message ?? "Accesso richiesto.",
      }, 401);
    }

    const db = createServiceClient();
    const { data: customer, error: customerError } = await db
      .from("customers")
      .select("id,full_name,phone")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (customerError) {
      console.error("CUSTOMER_PROFILE_LOOKUP_ERROR", {
        code: customerError.code,
        details: customerError.details,
        hint: customerError.hint,
        message: customerError.message,
        userId: user.id,
      });
      return json({
        stage: "customer",
        error: customerError.message,
        code: customerError.code,
        details: customerError.details,
        hint: customerError.hint,
      }, 500);
    }

    if (!customer) {
      return json({ stage: "customer", error: "Profilo cliente non disponibile." }, 403);
    }

    const { data: bookings, error } = await db
      .from("bookings")
      .select("*")
      .eq("customer_id", customer.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("CUSTOMER_BOOKINGS_QUERY_ERROR", {
        code: error.code,
        details: error.details,
        hint: error.hint,
        message: error.message,
        customerId: customer.id,
      });
      return json({
        stage: "bookings",
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        customerId: customer.id,
      }, 400);
    }

    const normalizedBookings = (bookings ?? []).map((booking) => ({
      id: booking.id ?? null,
      practice_code: booking.practice_code ?? null,
      plate: booking.plate ?? "",
      vehicle_make: booking.vehicle_make ?? null,
      vehicle_model: booking.vehicle_model ?? null,
      vehicle_year: booking.vehicle_year ?? null,
      requested_date: booking.requested_date ?? null,
      requested_slot: booking.requested_slot ?? null,
      status: booking.status ?? "",
      service_key: booking.service_key ?? "",
      urgency: booking.urgency ?? false,
      customer_price_cents: booking.customer_price_cents ?? 0,
      workshop_id: booking.workshop_id ?? null,
      created_at: booking.created_at ?? null,
      updated_at: booking.updated_at ?? null,
    }));

    return json({
      stage: "done",
      customer,
      bookings: normalizedBookings,
      bookingColumns: bookings && bookings.length > 0 ? Object.keys(bookings[0]) : [],
    });
  } catch (error) {
    console.error("CUSTOMER_BOOKINGS_ERROR", error);
    return json({
      stage: "exception",
      error: error instanceof Error ? error.message : String(error),
    }, 500);
  }
}
