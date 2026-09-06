import { NextResponse } from "next/server";
import { requireWorkshopOwner } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";
import { checkViaggioChecklist, calculateTravelReliability } from "@/lib/check-viaggio";

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
    if (!bookingId) return NextResponse.json({ error: "Pratica non valida." }, { status: 400 });

    const db = createServiceClient();
    const { data: workshop } = await db.from("workshops").select("id").eq("owner_auth_id", user.id).single();
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });

    const { data: booking } = await db.from("bookings").select("id,workshop_id,status,service_key").eq("id", bookingId).single();
    if (!booking || booking.workshop_id !== workshop.id) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });

    const isTravel = booking.service_key === "check_viaggio";
    const expectedLength = isTravel ? checkViaggioChecklist.length : 50;
    if (checklistResults.length !== expectedLength) {
      return NextResponse.json({ error: `La checklist deve contenere tutti i ${expectedLength} controlli.` }, { status: 400 });
    }

    const allowedIds = new Set((isTravel ? checkViaggioChecklist : []).map((item) => item.id));
    if (isTravel && checklistResults.some((item) => !allowedIds.has(item.id))) {
      return NextResponse.json({ error: "Checklist Check Viaggio non valida." }, { status: 400 });
    }

    const passedChecks = checklistResults.filter((item) => item.result === "ok").length;
    const travelValues = Object.fromEntries(checklistResults.map((item) => [item.id, item.result]));
    const travelReliability = isTravel ? calculateTravelReliability(travelValues) : null;
    const veriscore = isTravel ? null : Math.round((passedChecks / 50) * 100);

    const { data: existing } = await db.from("inspections").select("id").eq("booking_id", bookingId).maybeSingle();
    const payload = {
      booking_id: bookingId,
      checklist: checklistResults,
      passed_checks: passedChecks,
      ...(isTravel ? { veriscore: null } : { veriscore }),
      notes: String(body.notes ?? "").trim() || null,
      completed_at: body.close ? new Date().toISOString() : null,
    };
    const query = existing ? db.from("inspections").update(payload).eq("id", existing.id) : db.from("inspections").insert(payload);
    const { error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({ ok: true, passedChecks, veriscore, travelReliability });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Non autorizzato" }, { status: 401 });
  }
}
