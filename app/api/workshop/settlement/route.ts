import { NextResponse } from "next/server";
import { requireWorkshopOwner } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const user = await requireWorkshopOwner();
    const db = createServiceClient();
    const { data: workshop } = await db.from("workshops").select("id,name,city,address").eq("owner_auth_id", user.id).single();
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });

    const first = new Date();
    first.setDate(1);
    first.setHours(0,0,0,0);
    const { data: payouts, error } = await db
      .from("payouts")
      .select("id,booking_id,amount_cents,status,paid_at,created_at")
      .eq("workshop_id", workshop.id)
      .gte("created_at", first.toISOString())
      .order("created_at", { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    const total = (payouts ?? []).reduce((sum, p) => sum + Number(p.amount_cents ?? 0), 0);
    const pending = (payouts ?? []).filter((p) => p.status === "pending" || p.status === "approved").reduce((sum, p) => sum + Number(p.amount_cents ?? 0), 0);
    return NextResponse.json({ workshop, period: first.toISOString().slice(0,10), totalCents: total, pendingCents: pending, payouts: payouts ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Non autorizzato" }, { status: 401 });
  }
}
