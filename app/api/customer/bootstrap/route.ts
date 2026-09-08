import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });

    const db = createServiceClient();
    const { data: existing, error: lookupError } = await db
      .from("customers")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error("CUSTOMER_LOOKUP_ERROR", lookupError);
      return NextResponse.json(
        { error: lookupError instanceof Error ? lookupError.message : "Impossibile verificare il profilo cliente." },
        { status: 500 }
      );
    }

    if (existing) return NextResponse.json({ ok: true, customerId: existing.id });

    const fullName = String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Cliente").trim() || "Cliente";
    const { data: customer, error } = await db
      .from("customers")
      .insert({ auth_id: user.id, full_name: fullName })
      .select("id")
      .single();

    if (error || !customer) {
      console.error("CUSTOMER_INSERT_ERROR", error);
      return NextResponse.json(
        { error: error?.message ?? "Impossibile creare il profilo cliente." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, customerId: customer.id });
  } catch (err) {
    console.error("BOOTSTRAP_ERROR", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bootstrap failed" },
      { status: 500 }
    );
  }
}
