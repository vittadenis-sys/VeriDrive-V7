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

    const { data: inspection, error: inspectionError } = await db
      .from("inspections")
      .select("id,checklist,notes,passed_checks,veriscore,completed_at")
      .eq("booking_id", bookingId)
      .maybeSingle();
    if (inspectionError) return NextResponse.json({ error: inspectionError.message }, { status: 500 });

    return NextResponse.json({ booking, inspection: inspection ?? { checklist: [], notes: null } });
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
      .select("id,workshop_id,status,service")
      .eq("id", bookingId)
      .maybeSingle();
    if (bookingError) return NextResponse.json({ error: bookingError.message }, { status: 500 });
    if (!booking || booking.workshop_id !== workshop.id) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });

    const results = Object.fromEntries(checklistResults.map((item) => [item.id, item.result ?? undefined]));
    const passedChecks = checklistResults.filter((item) => item.result === "ok").length;
    const veriscore = calculateWeightedVeriscore(results);
    const { data: existing, error: existingError } = await db.from("inspections").select("id").eq("booking_id", bookingId).maybeSingle();
    if (existingError) return NextResponse.json({ error: existingError.message }, { status: 500 });

    const payload = {
      booking_id: bookingId,
      checklist: checklistResults,
      passed_checks: passedChecks,
      veriscore,
      notes: String(body.notes ?? "").trim() || null,
      completed_at: body.close ? new Date().toISOString() : existing ? undefined : null,
    };

    const { error: saveError } = existing
      ? await db.from("inspections").update(payload).eq("id", existing.id)
      : await db.from("inspections").insert(payload);
    if (saveError) return NextResponse.json({ error: saveError.message }, { status: 400 });

    if (body.close) {
      if (passedChecks !== 50) return NextResponse.json({ error: "Completa tutti i 50 controlli con un esito prima di chiudere la verifica." }, { status: 400 });
      const { error: statusError } = await db.from("bookings").update({ status: "completed" }).eq("id", bookingId).eq("workshop_id", workshop.id);
      if (statusError) return NextResponse.json({ error: statusError.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, passedChecks, veriscore, status: body.close ? "completed" : booking.status });
  } catch (error) {
    console.error("WORKSHOP_INSPECTION_PUT_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
