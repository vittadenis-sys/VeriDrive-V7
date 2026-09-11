import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });

    const db = createServiceClient();
    const { data: customer, error: customerError } = await db
      .from("customers")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (customerError) return NextResponse.json({ error: customerError.message }, { status: 500 });
    if (!customer) return NextResponse.json({ error: "Profilo cliente non disponibile." }, { status: 404 });

    const { data: bonus, error } = await db
      .from("customer_bonus")
      .select("free_bookings,updated_at")
      .eq("customer_id", customer.id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ free_bookings: bonus?.free_bookings ?? 0, updated_at: bonus?.updated_at ?? null });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
