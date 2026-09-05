import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });

  const { data: customer, error } = await supabase
    .from("customers")
    .select("id,full_name,phone,auth_id,created_at,updated_at")
    .eq("auth_id", user.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ user: { id: user.id, email: user.email }, customer });
}
