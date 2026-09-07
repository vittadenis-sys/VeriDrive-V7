import { NextResponse } from "next/server";
import { requireWorkshopOwner } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const user = await requireWorkshopOwner();
    const db = createServiceClient();

    const { data: workshop, error: workshopError } = await db
      .from("workshops")
      .select("id,name,city,address,postal_code")
      .eq("owner_auth_id", user.id)
      .maybeSingle();

    // A super-admin can open the workshop area too. In that case the logged-in
    // account may not be the owner of a workshop, so fall back to the first
    // workshop instead of exposing a configuration error to the UI.
    let resolvedWorkshop = workshop;
    if (!resolvedWorkshop && workshopError && !workshopError.message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      throw workshopError;
    }
    if (!resolvedWorkshop) {
      const { data: firstWorkshop, error: firstWorkshopError } = await db
        .from("workshops")
        .select("id,name,city,address,postal_code")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (firstWorkshopError || !firstWorkshop) {
        return NextResponse.json({ error: "Officina non associata." }, { status: 404 });
      }
      resolvedWorkshop = firstWorkshop;
    }

    const { data: bookings, error } = await db
      .from("bookings")
      .select("id,plate,vehicle_make,vehicle_model,vehicle_year,requested_date,requested_slot,status,service_key,urgency,customer_price_cents,updated_at")
      .eq("workshop_id", resolvedWorkshop.id)
      .order("requested_date", { ascending: true });
    if (error) throw error;

    const bookingIds = (bookings ?? []).map((b) => b.id);
    const { data: payouts } = bookingIds.length
      ? await db.from("payouts").select("booking_id,amount_cents,status,paid_at").in("booking_id", bookingIds)
      : { data: [] };
    const payoutByBooking = new Map((payouts ?? []).map((p) => [p.booking_id, p]));

    const enriched = (bookings ?? []).map((booking) => ({
      ...booking,
      payout: payoutByBooking.get(booking.id) ?? null,
    }));

    return NextResponse.json({ workshop: resolvedWorkshop, bookings: enriched });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Non autorizzato";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json({ error: "Configurazione tecnica incompleta: SUPABASE_SERVICE_ROLE_KEY" }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
