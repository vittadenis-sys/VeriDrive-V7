import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function makeReference(id: string, createdAt: string) {
  const date = new Date(createdAt);
  const y = String(date.getFullYear()).slice(-2);
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `VRD-${y}${m}${d}-${id.replaceAll("-", "").slice(0, 6).toUpperCase()}`;
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Non autorizzato." }, { status: 401 });
  const id = new URL(request.url).searchParams.get("bookingId")?.trim();
  if (!id) return NextResponse.json({ error: "bookingId mancante." }, { status: 400 });
  const { data: customer } = await supabase.from("customers").select("id").eq("auth_id", user.id).single();
  if (!customer) return NextResponse.json({ error: "Profilo cliente non disponibile." }, { status: 400 });
  const { data: booking, error } = await supabase.from("bookings").select("id,created_at").eq("id", id).eq("customer_id", customer.id).single();
  if (error || !booking) return NextResponse.json({ error: "Pratica non trovata." }, { status: 404 });
  return NextResponse.json({ reference: makeReference(booking.id, booking.created_at) });
}
