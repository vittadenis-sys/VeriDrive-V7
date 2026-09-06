import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });

  const { data: settings, error: settingsError } = await supabase.from("settings").select("value").eq("key", "admin_emails").maybeSingle();
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 400 });
  const admins = Array.isArray(settings?.value) ? settings.value.map(String).map((email) => email.toLowerCase()) : [];
  if (!user.email || !admins.includes(user.email.toLowerCase())) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });

  const { data, error } = await supabase.from("customers").select("id,auth_id,full_name,phone,demo_access,created_at").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ customers: data ?? [] });
}
