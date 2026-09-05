import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });

  const db = createServiceClient();
  const { data: merchant } = await db.from("merchant_accounts").select("id,company_name").eq("auth_id", user.id).maybeSingle();
  if (!merchant) return NextResponse.json({ error: "Profilo commerciante non disponibile." }, { status: 403 });

  const { data: wallet } = await db
    .from("merchant_credit_wallet")
    .select("purchased_credits,promo_credits")
    .eq("merchant_id", merchant.id)
    .maybeSingle();

  const { data: promo } = await db
    .from("promo_credits")
    .select("id,status,expires_at,workshop_id")
    .eq("merchant_id", merchant.id)
    .eq("status", "available")
    .gt("expires_at", new Date().toISOString());

  return NextResponse.json({
    merchant,
    purchasedCredits: Number(wallet?.purchased_credits ?? 0),
    promoCredits: Number(wallet?.promo_credits ?? promo?.length ?? 0),
    promo: promo ?? [],
  });
}
