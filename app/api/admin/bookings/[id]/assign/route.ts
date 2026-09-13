import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json() as { workshopId?: string; slot?: string };
    const workshopId = String(body.workshopId ?? "").trim();
    const slot = String(body.slot ?? "").trim();
    if (!workshopId || !slot) return NextResponse.json({ error: "Officina e slot sono obbligatori." }, { status: 400 });

    const db = await createServiceClient();
    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .select("id,status,inspection_date,workshop_id,service")
      .eq("id", id)
      .maybeSingle();
    if (bookingError || !booking) return NextResponse.json({ error: "Prenotazione non trovata." }, { status: 404 });
    if (["completed", "cancelled", "refunded"].includes(booking.status)) return NextResponse.json({ error: "La pratica non può più essere assegnata." }, { status: 400 });

    const { data: workshop, error: workshopError } = await db
      .from("workshops")
      .select("id,active")
      .eq("id", workshopId)
      .maybeSingle();
    if (workshopError || !workshop?.active) return NextResponse.json({ error: "Officina non attiva." }, { status: 400 });

    if (booking.inspection_date) {
      const day = String(booking.inspection_date).slice(0, 10);
      const time = slot.slice(0, 5);
      const { data: conflicts, error: conflictError } = await db
        .from("bookings")
        .select("id,inspection_date,status")
        .eq("workshop_id", workshopId)
        .gte("inspection_date", `${day}T00:00:00`)
        .lte("inspection_date", `${day}T23:59:59`)
        .in("status", ["requested", "assigned", "confirmed", "in_progress"]);
      if (conflictError) throw conflictError;
      if ((conflicts ?? []).some((item) => item.id !== id && item.inspection_date && String(item.inspection_date).slice(11, 16) === time)) {
        return NextResponse.json({ error: "Lo slot è appena diventato indisponibile." }, { status: 409 });
      }
    }

    const nextInspectionDate = booking.inspection_date
      ? `${String(booking.inspection_date).slice(0, 10)}T${slot.slice(0, 5)}:00`
      : null;

    const { error } = await db
      .from("bookings")
      .update({ workshop_id: workshopId, inspection_date: nextInspectionDate, status: "assigned" })
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ ok: true, bookingId: id, workshopId, inspectionDate: nextInspectionDate });
  } catch (error) {
    console.error("ADMIN_BOOKING_ASSIGN_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
