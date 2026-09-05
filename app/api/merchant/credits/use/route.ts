import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { MERCHANT_SERVICE_KEY } from "@/lib/services";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });

  const body = await request.json().catch(() => null) as { bookingId?: string } | null;
  const bookingId = String(body?.bookingId ?? "").trim();
  if (!bookingId) return NextResponse.json({ error: "bookingId mancante." }, { status: 400 });

  const db = createServiceClient();
  const { data: merchant } = await db.from("merchant_accounts").select("id").eq("auth_id", user.id).maybeSingle();
  if (!merchant) return NextResponse.json({ error: "Profilo commerciante non disponibile." }, { status: 403 });

  const { data: booking } = await db.from("bookings").select("id,service_key,customer_price_cents").eq("id", bookingId).single();
  if (!booking) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });
  if (booking.service_key !== MERCHANT_SERVICE_KEY) return NextResponse.json({ error: "I crediti commerciante coprono solo Check-up + VeriScore." }, { status: 400 });

  const { data: ownPromo } = await db.from("promo_credits").select("id,expires_at,workshop_id").eq("merchant_id", merchant.id).eq("status", "available").gt("expires_at", new Date().toISOString()).order("expires_at", { ascending: true }).limit(1).maybeSingle();
  let usedType: "promo" | "purchased" = "purchased";
  if (ownPromo) {
    await db.from("promo_credits").update({ status: "used", used_at: new Date().toISOString(), booking_id: bookingId }).eq("id", ownPromo.id);
    usedType = "promo";
  } else {
    const { data: wallet } = await db.from("merchant_credit_wallet").select("purchased_credits").eq("merchant_id", merchant.id).single();
    if (Number(wallet?.purchased_credits ?? 0) < 1) return NextResponse.json({ error: "Crediti insufficienti." }, { status: 400 });
    const { error } = await db.from("merchant_credit_wallet").update({ purchased_credits: Number(wallet?.purchased_credits ?? 0) - 1, updated_at: new Date().toISOString() }).eq("merchant_id", merchant.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await db.from("credit_history").insert({ merchant_id: merchant.id, promo_credit_id: usedType === "promo" ? ownPromo?.id : null, action: "used", booking_id: bookingId, actor_auth_id: user.id });
  await db.from("bookings").update({ customer_price_cents: 0, service_key: MERCHANT_SERVICE_KEY }).eq("id", bookingId);
  return NextResponse.json({ ok: true, usedType });
}
