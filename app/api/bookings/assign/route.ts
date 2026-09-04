import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { bookingId?: string; workshopId?: string; slot?: string } | null;
  const bookingId = String(body?.bookingId ?? "").trim();
  const workshopId = String(body?.workshopId ?? "").trim();
  const slot = String(body?.slot ?? "").trim();
  if (!bookingId || !workshopId || !slot) return NextResponse.json({ error: "Dati di assegnazione mancanti." }, { status: 400 });
  const db = createServiceClient();

  const { data: booking, error: bookingError } = await db
    .from("bookings")
    .select("id,requested_date,requested_slot,workshop_id,status")
    .eq("id", bookingId)
    .single();
  if (bookingError || !booking) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });

  const { data: workshop, error: workshopError } = await db
    .from("workshops")
    .select("id,name,city,address,postal_code,is_active")
    .eq("id", workshopId)
    .eq("is_active", true)
    .single();
  if (workshopError || !workshop) return NextResponse.json({ error: "Officina non disponibile." }, { status: 404 });

  if (!booking.requested_date) return NextResponse.json({ error: "La pratica non prevede appuntamento." }, { status: 400 });
  if (booking.workshop_id && booking.requested_slot === slot) return NextResponse.json({ ok: true, workshop });

  const { data: conflict } = await db
    .from("bookings")
    .select("id")
    .eq("workshop_id", workshopId)
    .eq("requested_date", booking.requested_date)
    .eq("requested_slot", slot)
    .in("status", ["requested", "assigned", "confirmed", "in_progress"])
    .neq("id", bookingId)
    .limit(1);
  if ((conflict ?? []).length) return NextResponse.json({ error: "Lo slot non è più disponibile." }, { status: 409 });

  const { data: settings } = await db.from("workshop_settings").select("max_daily_inspections").eq("workshop_id", workshopId).maybeSingle();
  const { count } = await db.from("bookings").select("id", { count: "exact", head: true }).eq("workshop_id", workshopId).eq("requested_date", booking.requested_date).in("status", ["requested", "assigned", "confirmed", "in_progress"]);
  if ((count ?? 0) >= (settings?.max_daily_inspections ?? 3)) return NextResponse.json({ error: "Capacità giornaliera raggiunta." }, { status: 409 });

  const { error } = await db.from("bookings").update({ workshop_id: workshopId, requested_slot: slot, status: "assigned" }).eq("id", bookingId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, workshop });
}
