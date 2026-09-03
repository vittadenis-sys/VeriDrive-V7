import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });

  let body: { merchantId?: string; type?: string };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Richiesta non valida." }, { status: 400 }); }
  const merchantId = String(body.merchantId ?? "").trim();
  const type = body.type === "promo" ? "promo" : "";
  if (!merchantId || !type) return NextResponse.json({ error: "Dati mancanti." }, { status: 400 });

  const { data: merchant, error: merchantError } = await supabase.from("merchant_accounts").select("id").eq("id", merchantId).single();
  if (merchantError || !merchant) return NextResponse.json({ error: "Commerciante non trovato." }, { status: 404 });

  const { data, error } = await supabase.rpc("issue_promo_credit", { p_merchant_id: merchantId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ credit: data });
}
