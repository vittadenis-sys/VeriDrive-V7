import { NextResponse } from "next/server";
import { requireWorkshopOwner } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

const RESULT_VALUES = new Set(["ok", "issue", "critical"]);

export async function GET(request: Request) {
  try {
    const user = await requireWorkshopOwner();
    const bookingId = new URL(request.url).searchParams.get("bookingId");
    if (!bookingId) return NextResponse.json({ error: "bookingId mancante." }, { status: 400 });
    const db = createServiceClient();
    const { data: workshop } = await db.from("workshops").select("id,name,city,address").eq("owner_auth_id", user.id).single();
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });
    const { data: booking, error: bookingError } = await db.from("bookings").select("id,plate,vehicle_make,vehicle_model,vehicle_year,service_key,status,urgency,requested_date,requested_slot,workshop_id").eq("id", bookingId).single();
    if (bookingError || !booking || booking.workshop_id !== workshop.id) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });
    const { data: inspection } = await db.from("inspections").select("id,checklist,passed_checks,veriscore,notes,completed_at").eq("booking_id", bookingId).maybeSingle();
    return NextResponse.json({ workshop, booking, inspection: inspection ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Non autorizzato" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireWorkshopOwner();
    const body = await request.json() as { bookingId?: string; values?: Record<string, string>; notes?: string };
    const bookingId = String(body.bookingId ?? "").trim();
    const values = body.values ?? {};
    if (!bookingId) return NextResponse.json({ error: "bookingId mancante." }, { status: 400 });
    const db = createServiceClient();
    const { data: workshop } = await db.from("workshops").select("id").eq("owner_auth_id", user.id).single();
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });
    const { data: booking } = await db.from("bookings").select("id,workshop_id").eq("id", bookingId).single();
    if (!booking || booking.workshop_id !== workshop.id) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });
    for (const value of Object.values(values)) if (!RESULT_VALUES.has(value)) return NextResponse.json({ error: "Esito checklist non valido." }, { status: 400 });
    const normalized = Object.fromEntries(Object.entries(values).map(([id, value]) => [String(id), value]));
    const passedChecks = Object.values(normalized).filter((value) => value === "ok").length;
    const { data, error } = await db.from("inspections").upsert({
      booking_id: bookingId,
      inspector_auth_id: user.id,
      checklist: normalized,
      passed_checks: passedChecks,
      notes: typeof body.notes === "string" ? body.notes : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "booking_id" }).select("id,checklist,passed_checks,veriscore,notes,completed_at").single();
    if (error) throw error;
    return NextResponse.json({ inspection: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossibile salvare la verifica." }, { status: 400 });
  }
}
