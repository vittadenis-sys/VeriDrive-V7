import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function parseJsonObject(value: FormDataEntryValue | null) {
  try {
    return value ? JSON.parse(String(value)) : {};
  } catch {
    return {};
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sessione non valida." }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({} as Record<string, unknown>));
  const values = body.values && typeof body.values === "object" ? body.values : {};
  const notes = typeof body.notes === "string" ? body.notes : null;
  const action = typeof body.action === "string" ? body.action : "save";

  const db = createServiceClient();
  const { data: booking, error: bookingError } = await db
    .from("bookings")
    .select("id,workshop_id,service_key,status,plate")
    .eq("id", id)
    .maybeSingle();
  if (bookingError || !booking) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });

  const { data: workshop } = booking.workshop_id
    ? await db.from("workshops").select("owner_auth_id,is_active").eq("id", booking.workshop_id).maybeSingle()
    : { data: null };
  const isOwner = workshop?.owner_auth_id === user.id;
  if (!isOwner) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });

  const entries = Object.values(values as Record<string, unknown>);
  const passedChecks = entries.filter((v) => v === "ok").length;
  const completedChecks = entries.filter(Boolean).length;

  const { data: inspection, error: inspectionError } = await db
    .from("inspections")
    .upsert({ booking_id: booking.id, inspector_auth_id: user.id, checklist: values, passed_checks: passedChecks, notes }, { onConflict: "booking_id" })
    .select("id,veriscore")
    .single();
  if (inspectionError || !inspection) return NextResponse.json({ error: inspectionError?.message ?? "Impossibile salvare la verifica." }, { status: 400 });

  if (action === "complete") {
    if (completedChecks < 50) return NextResponse.json({ error: "Completa tutti i 50 controlli prima di chiudere la verifica." }, { status: 400 });
    const { error } = await db
      .from("bookings")
      .update({ status: "completed" })
      .eq("id", booking.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await db.from("payouts").upsert({ booking_id: booking.id, workshop_id: booking.workshop_id, amount_cents: 6000, status: "pending" }, { onConflict: "booking_id" });
  } else if (booking.status === "assigned" || booking.status === "confirmed") {
    await db.from("bookings").update({ status: "in_progress" }).eq("id", booking.id);
  }

  return NextResponse.json({ ok: true, inspectionId: inspection.id, veriscore: inspection.veriscore, completedChecks, status: action === "complete" ? "completed" : "in_progress" });
}
