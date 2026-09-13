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
      .select("id,status,workshop_id,overall_notes")
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
      let notes: Record<string, unknown> = {};
      if (typeof booking.overall_notes === "string") {
        try {
          const parsed = JSON.parse(booking.overall_notes);
          if (parsed && typeof parsed === "object") notes = parsed as Record<string, unknown>;
        } catch {}
      } else if (booking.overall_notes && typeof booking.overall_notes === "object") {
        notes = booking.overall_notes as Record<string, unknown>;
      }

      const checklist = Array.isArray(notes.checklist) ? notes.checklist : [];
      const completedChecks = checklist.filter(
        (item) => item && typeof item === "object" && (item as { result?: unknown }).result != null
      ).length;

      if (completedChecks !== 50) {
        return NextResponse.json(
          { error: "Completa tutti i 50 controlli con un esito prima di chiudere la verifica." },
          { status: 400 }
        );
      }
    }

    const { error } = await db
      .from("bookings")
      .update({ status: toStatus })
      .eq("id", bookingId)
      .eq("workshop_id", workshop.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, status: toStatus });
  } catch (error) {
    console.error("WORKSHOP_STATUS_ERROR", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno." },
      { status: 500 }
    );
  }
}
