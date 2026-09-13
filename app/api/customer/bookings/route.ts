import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const ROUTE_VERSION = "customer-bookings-2026-09-13-v7";

function json(data: Record<string, unknown>, status = 200) {
  return NextResponse.json({ routeVersion: ROUTE_VERSION, ...data }, { status, headers: { "Cache-Control": "no-store, max-age=0", "X-VeriDrive-Route": ROUTE_VERSION } });
}

function getVehicleValue(vehicle: Record<string, unknown> | null, ...keys: string[]) {
  for (const key of keys) {
    const value = vehicle?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return value;
  }
  return null;
}

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return json({ stage: "auth", error: authError?.message ?? "Accesso richiesto." }, 401);

    const db = createServiceClient();
    let { data: customer, error: customerError } = await db.from("customers").select("id,auth_id,full_name,phone").eq("auth_id", user.id).maybeSingle();
    if (customerError) return json({ stage: "customer", error: customerError.message }, 500);

    // Self-heal legacy accounts that predate the auth->customer trigger.
    if (!customer) {
      const fallbackName = String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Cliente VeriDrive").trim();
      const { data: createdCustomer, error: createError } = await db.from("customers").insert({ auth_id: user.id, full_name: fallbackName, phone: null }).select("id,auth_id,full_name,phone").maybeSingle();
      if (createError && createError.code !== "23505") return json({ stage: "customer", error: createError.message }, 500);
      if (createdCustomer) customer = createdCustomer;
      if (!customer) {
        const { data: retryCustomer, error: retryError } = await db.from("customers").select("id,auth_id,full_name,phone").eq("auth_id", user.id).maybeSingle();
        if (retryError) return json({ stage: "customer", error: retryError.message }, 500);
        customer = retryCustomer;
      }
    }
    if (!customer) return json({ stage: "customer", error: "Profilo cliente non disponibile." }, 403);

    const { data: bonusRow, error: bonusError } = await db.from("customer_bonus").select("free_bookings").eq("customer_id", customer.id).maybeSingle();
    if (bonusError) return json({ stage: "bonus", error: bonusError.message }, 500);

    const { data: bookings, error } = await db.from("bookings").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false });
    if (error) return json({ stage: "bookings", error: error.message, code: error.code, details: error.details, hint: error.hint }, 400);

    const vehicleIds = (bookings ?? []).map((booking) => booking.vehicle_id).filter(Boolean);
    let vehicles: Record<string, unknown>[] = [];
    if (vehicleIds.length) {
      const vehicleResult = await db.from("vehicles").select("*").in("id", vehicleIds);
      if (vehicleResult.error) return json({ stage: "vehicles", error: vehicleResult.error.message, code: vehicleResult.error.code }, 500);
      vehicles = (vehicleResult.data ?? []) as Record<string, unknown>[];
    }
    const vehicleById = new Map(vehicles.map((vehicle) => [String(vehicle.id), vehicle]));

    const bookingIds = (bookings ?? []).map((booking) => booking.id).filter(Boolean);
    let certificates: Record<string, unknown>[] = [];
    if (bookingIds.length) {
      const certificateResult = await db.from("veriscore_certificates").select("id,booking_id,public_code,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,veriscore,workshop_id,issued_at").in("booking_id", bookingIds).order("issued_at", { ascending: false });
      if (certificateResult.error) return json({ stage: "certificates", error: certificateResult.error.message, code: certificateResult.error.code, details: certificateResult.error.details, hint: certificateResult.error.hint }, 500);
      certificates = (certificateResult.data ?? []) as Record<string, unknown>[];
    }

    const normalizedBookings = (bookings ?? []).map((booking) => {
      const vehicle = booking.vehicle_id ? vehicleById.get(String(booking.vehicle_id)) ?? null : null;
      return {
        id: booking.id ?? null,
        booking_code: booking.booking_code ?? null,
        practice_code: booking.practice_code ?? booking.booking_code ?? null,
        plate: String(getVehicleValue(vehicle, "plate", "registration", "license_plate", "targa") ?? booking.plate ?? ""),
        vehicle_make: String(getVehicleValue(vehicle, "make", "brand", "vehicle_make", "marca") ?? booking.vehicle_make ?? "") || null,
        vehicle_model: String(getVehicleValue(vehicle, "model", "vehicle_model", "modello") ?? booking.vehicle_model ?? "") || null,
        vehicle_year: getVehicleValue(vehicle, "year", "vehicle_year", "anno") == null ? (booking.vehicle_year == null ? null : Number(booking.vehicle_year)) : Number(getVehicleValue(vehicle, "year", "vehicle_year", "anno")),
        requested_date: booking.inspection_date ? String(booking.inspection_date).slice(0, 10) : booking.requested_date ?? null,
        requested_slot: booking.inspection_date ? String(booking.inspection_date).slice(11, 16) : booking.requested_slot ?? null,
        status: booking.status ?? "",
        service_key: booking.service ?? booking.service_key ?? "",
        urgency: Boolean(booking.urgency),
        customer_price_cents: Number(booking.total ?? booking.customer_price_cents ?? 0),
        workshop_id: booking.workshop_id ?? null,
        created_at: booking.created_at ?? null,
        updated_at: booking.updated_at ?? booking.created_at ?? null,
      };
    });

    return json({ stage: "done", customer: { id: customer.id, full_name: customer.full_name, phone: customer.phone, autogerma_free_booking_bonus: Number(bonusRow?.free_bookings ?? 0), free_bookings: Number(bonusRow?.free_bookings ?? 0) }, bookings: normalizedBookings, certificates, bookingColumns: bookings && bookings.length > 0 ? Object.keys(bookings[0]) : [] });
  } catch (error) {
    console.error("CUSTOMER_BOOKINGS_ERROR", error);
    return json({ stage: "exception", error: error instanceof Error ? error.message : String(error) }, 500);
  }
}
