import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { calculateVeriscore } from "@/lib/veriscore";
import { checklist } from "@/lib/checklist";

const VALID = new Set(["ok", "issue", "critical"]);

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });

  const body = await request.json() as {
    bookingId?: string;
    values?: Record<string, string>;
    notes?: string;
  };
  const bookingId = String(body.bookingId ?? "").trim();
  if (!bookingId) return NextResponse.json({ error: "bookingId mancante." }, { status: 400 });

  const { data: customer } = await supabase.from("customers").select("id").eq("auth_id", user.id).maybeSingle();
  const db = supabase;
  let authorized = false;
  if (customer) {
    const { data: booking } = await db.from("bookings").select("id").eq("id", bookingId).eq("customer_id", customer.id).maybeSingle();
    authorized = Boolean(booking);
  }
  if (!authorized) {
    const { data: workshop } = await db.from("workshops").select("id").eq("owner_auth_id", user.id).maybeSingle();
    if (workshop) {
      const { data: booking } = await db.from("bookings").select("id").eq("id", bookingId).eq("workshop_id", workshop.id).maybeSingle();
      authorized = Boolean(booking);
    }
  }
  if (!authorized) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });

  const raw = body.values ?? {};
  const normalized: Record<string, string> = {};
  for (const item of checklist) {
    const value = raw[String(item.id)];
    if (value && VALID.has(value)) normalized[String(item.id)] = value;
  }
  const passed = checklist.filter((item) => normalized[String(item.id)] === "ok").length;
  const score = calculateVeriscore(checklist.map((item) => normalized[String(item.id)] === "ok"));

  const { data: inspection, error } = await db.from("inspections").upsert({
    booking_id: bookingId,
    inspector_auth_id: user.id,
    checklist: normalized,
    passed_checks: passed,
    notes: body.notes ? String(body.notes).trim() : null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "booking_id" }).select("id,veriscore,passed_checks,checklist,notes,completed_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ ok: true, inspection, score });
}
