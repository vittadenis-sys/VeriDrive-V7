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

    let resolvedWorkshop = workshop;
    let isSuperAdmin = false;

    if (!resolvedWorkshop) {
      const { data: admin } = await db
        .from("admins")
        .select("role")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (admin?.role === "super_admin") {
        isSuperAdmin = true;
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
      } else if (workshopError) {
        throw workshopError;
      } else {
        return NextResponse.json({ error: "Officina non associata." }, { status: 404 });
      }
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

    return NextResponse.json({ workshop: resolvedWorkshop, bookings: enriched, isSuperAdmin });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Non autorizzato";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return NextResponse.json({ error: "Impossibile caricare i dati dell'officina." }, { status: 500 });
    }
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
