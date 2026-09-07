import { NextResponse } from "next/server";
import { getCurrentAdminRole, requireWorkshopOwner } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const currentAdmin = await getCurrentAdminRole();
    const isSuperAdmin = currentAdmin?.role === "super_admin";
    const user = isSuperAdmin ? currentAdmin.user : await requireWorkshopOwner();
    const db = createServiceClient();

    let workshopQuery = db
      .from("workshops")
      .select("id,name,city,address,postal_code")
      .limit(1);

    workshopQuery = isSuperAdmin
      ? workshopQuery.order("display_name", { ascending: true })
      : workshopQuery.eq("owner_auth_id", user.id);

    const { data: workshop, error: workshopError } = await workshopQuery.single();
    if (workshopError || !workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });

    const { data: bookings, error } = await db
      .from("bookings")
      .select("id,plate,vehicle_make,vehicle_model,vehicle_year,requested_date,requested_slot,status,service_key,urgency,customer_price_cents,updated_at")
      .eq("workshop_id", workshop.id)
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

    return NextResponse.json({ workshop, bookings: enriched, isSuperAdmin });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Non autorizzato";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
