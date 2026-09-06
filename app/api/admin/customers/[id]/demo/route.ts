import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });

  const { data: settings, error: settingsError } = await supabase.from("settings").select("value").eq("key", "admin_emails").maybeSingle();
  if (settingsError) return NextResponse.json({ error: settingsError.message }, { status: 400 });
  const admins = Array.isArray(settings?.value) ? settings.value.map(String).map((email) => email.toLowerCase()) : [];
  if (!user.email || !admins.includes(user.email.toLowerCase())) return NextResponse.json({ error: "Non autorizzato." }, { status: 403 });

  let body: { enabled?: boolean };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 }); }
  if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "enabled deve essere boolean." }, { status: 400 });

  const { id } = await params;
  const { data, error } = await supabase
    .from("customers")
    .update({ demo_access: body.enabled })
    .eq("id", id)
    .select("id,full_name,demo_access")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ customer: data });
}
