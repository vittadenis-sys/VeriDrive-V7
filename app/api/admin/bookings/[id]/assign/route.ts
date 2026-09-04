import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { workshopId, slot } = await request.json() as { workshopId?: string; slot?: string };
    if (!workshopId || !slot) return NextResponse.json({ error: "Officina e slot sono obbligatori." }, { status: 400 });

    const db = createServiceClient();
    const { data: booking, error: bookingError } = await db.from("bookings").select("id,status,requested_date,requested_slot,service_key,urgency,workshop_id").eq("id", id).single();
    if (bookingError || !booking) return NextResponse.json({ error: "Prenotazione non trovata." }, { status: 404 });
    if (["completed", "cancelled", "refunded"].includes(booking.status)) return NextResponse.json({ error: "La pratica non può più essere assegnata." }, { status: 400 });

    const { data: workshop, error: workshopError } = await db.from("workshops").select("id,is_active").eq("id", workshopId).single();
    if (workshopError || !workshop?.is_active) return NextResponse.json({ error: "Officina non attiva." }, { status: 400 });

    if (booking.requested_date) {
      const { data: conflicts, error: conflictError } = await db.from("bookings")
        .select("id,status,requested_slot,workshop_id")
        .eq("workshop_id", workshopId)
        .eq("requested_date", booking.requested_date)
        .eq("requested_slot", slot)
        .in("status", ["assigned", "confirmed", "in_progress"]);
      if (conflictError) throw conflictError;
      if ((conflicts ?? []).some((item) => item.id !== id)) return NextResponse.json({ error: "Lo slot è appena diventato indisponibile." }, { status: 409 });
    }

    const { error } = await db.from("bookings").update({ workshop_id: workshopId, requested_slot: slot, status: "assigned" }).eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true, bookingId: id, workshopId, slot });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Non autorizzato" }, { status: 401 });
  }
}
