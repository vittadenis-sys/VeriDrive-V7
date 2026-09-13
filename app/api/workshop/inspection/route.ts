import { NextResponse } from "next/server";
import { requireWorkshopOwner } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";
import { calculateWeightedVeriscore } from "@/lib/veriscore";

export async function GET(request: Request) {
  try {
    const user = await requireWorkshopOwner();
    const bookingId = new URL(request.url).searchParams.get("bookingId")?.trim();
    if (!bookingId) return NextResponse.json({ error: "Pratica non trovata." }, { status: 400 });

    const db = createServiceClient();
    const { data: workshop } = await db.from("workshops").select("id").eq("owner_auth_id", user.id).maybeSingle();
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });

    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .select("id,workshop_id,service")
      .eq("id", bookingId)
      .maybeSingle();
    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });
    if (!booking || booking.workshop_id !== workshop.id) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });

    // Live schema does not contain public.inspections. Checklist data is stored on bookings.overall_notes as JSON.
    return NextResponse.json({ booking, inspection: { checklist: [], notes: null } });
  } catch (error) {
    console.error("WORKSHOP_INSPECTION_GET_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireWorkshopOwner();
    const body = await request.json() as {
      bookingId?: string;
      checklist?: Array<{ id: number; area: string; label: string; result: "ok" | "issue" | "critical" | null }>;
      notes?: string;
      close?: boolean;
    };

    const bookingId = String(body.bookingId ?? "").trim();
    const checklistResults = Array.isArray(body.checklist) ? body.checklist : [];
    if (!bookingId || checklistResults.length !== 50) return NextResponse.json({ error: "La checklist deve contenere tutti i 50 controlli." }, { status: 400 });

    const ids = new Set(checklistResults.map((item) => Number(item.id)));
    if (ids.size !== 50 || [...ids].some((id) => id < 1 || id > 50)) {
      return NextResponse.json({ error: "Checklist non valida." }, { status: 400 });
    }

    const db = createServiceClient();
    const { data: workshop } = await db.from("workshops").select("id").eq("owner_auth_id", user.id).maybeSingle();
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });

    const { data: booking, error: bookingError } = await db
      .from("bookings")
      .select("id,workshop_id,status,service,overall_notes")
      .eq("id", bookingId)
      .maybeSingle();
    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });
    if (!booking || booking.workshop_id !== workshop.id) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });

    const results = Object.fromEntries(checklistResults.map((item) => [item.id, item.result ?? undefined]));
    const passedChecks = checklistResults.filter((item) => item.result === "ok").length;
    const veriscore = calculateWeightedVeriscore(results);

    const notesPayload = {
      ...(typeof booking.overall_notes === "object" && booking.overall_notes !== null ? booking.overall_notes : {}),
      checklist: checklistResults,
      checklist_notes: String(body.notes ?? "").trim() || null,
      passed_checks: passedChecks,
      veriscore,
      completed_at: body.close ? new Date().toISOString() : null,
    };

    const { error: saveError } = await db
      .from("bookings")
      .update({
        overall_notes: JSON.stringify(notesPayload),
        status: body.close ? "completed" : booking.status,
      })
      .eq("id", bookingId)
      .eq("workshop_id", workshop.id);

    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 400 });

    if (body.close && passedChecks !== 50) {
      return NextResponse.json({ error: "Completa tutti i 50 controlli con un esito prima di chiudere la verifica." }, { status: 400 });
    }

    return NextResponse.json({ ok: true, passedChecks, veriscore, status: body.close ? "completed" : booking.status });
  } catch (error) {
    console.error("WORKSHOP_INSPECTION_PUT_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
