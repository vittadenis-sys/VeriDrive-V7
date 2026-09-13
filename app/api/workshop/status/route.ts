import { NextResponse } from "next/server";
import { requireWorkshopOwner } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(request: Request) {
  try {
    const user = await requireWorkshopOwner();
    const body = (await request.json()) as { bookingId?: string; toStatus?: string };
    const bookingId = String(body.bookingId ?? "").trim();
    const toStatus = String(body.toStatus ?? "").trim();

    if (!bookingId || !toStatus) {
      return NextResponse.json({ error: "Dati mancanti." }, { status: 400 });
    }
    if (!["confirmed", "in_progress", "completed"].includes(toStatus)) {
      return NextResponse.json({ error: "Stato non consentito." }, { status: 400 });
    }

    const db = createServiceClient();
    const { data: workshop } = await db
      .from("workshops")
      .select("id")
      .eq("owner_auth_id", user.id)
      .maybeSingle();

    if (!workshop) {
      return NextResponse.json({ error: "Officina non associata." }, { status: 404 });
    }

    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .select("id,status,workshop_id")
      .eq("id", bookingId)
      .eq("workshop_id", workshop.id)
      .maybeSingle();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });
    }

    const allowedTransitions: Record<string, string[]> = {
      requested: ["confirmed"],
      assigned: ["confirmed"],
      confirmed: ["in_progress"],
      in_progress: ["completed"],
    };

    if (!(allowedTransitions[booking.status] ?? []).includes(toStatus)) {
      return NextResponse.json({ error: "Passaggio di stato non consentito." }, { status: 400 });
    }

    if (toStatus === "completed") {
      const { data: inspection } = await db
        .from("inspections")
        .select("id,passed_checks")
        .eq("booking_id", bookingId)
        .maybeSingle();

      if (!inspection || inspection.passed_checks !== 50) {
        return NextResponse.json(
          { error: "Completa tutti i 50 controlli prima di chiudere la verifica." },
          { status: 400 }
        );
      }

      const { error } = await db.rpc("close_booking_as_workshop", {
        p_booking_id: bookingId,
      });
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    } else {
      const { error } = await db
        .from("bookings")
        .update({ status: toStatus })
        .eq("id", bookingId)
        .eq("workshop_id", workshop.id);
      if (error) throw error;
    }

    return NextResponse.json({ ok: true, status: toStatus });
  } catch (error) {
    console.error("WORKSHOP_STATUS_ERROR", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno." },
      { status: 500 }
    );
  }
}
