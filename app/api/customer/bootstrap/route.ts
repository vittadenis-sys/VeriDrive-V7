import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });

  const fullName = String(user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "Cliente").trim();
  const { data: existing } = await supabase.from("customers").select("id").eq("auth_id", user.id).maybeSingle();
  if (existing) return NextResponse.json({ ok: true, customerId: existing.id });

  const { data: customer, error } = await supabase.from("customers").insert({ auth_id: user.id, full_name: fullName }).select("id").single();
  if (error) return NextResponse.json({ error: "Impossibile creare il profilo cliente." }, { status: 400 });
  return NextResponse.json({ ok: true, customerId: customer.id });
}
