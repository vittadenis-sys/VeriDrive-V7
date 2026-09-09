import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

async function runBootstrap() {
  let step = "start";

  try {
    step = "auth";
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({
        ok: false,
        step,
        error: authError?.message ?? "Accesso richiesto."
      }, { status: 401 });
    }

    step = "service-client";
    const db = await createServiceClient();

    step = "customer-lookup";
    const { data: existing, error: lookupError } = await db
      .from("customers")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (lookupError) {
      return NextResponse.json({
        ok: false,
        step,
        error: lookupError.message,
        code: lookupError.code,
        details: lookupError.details,
        hint: lookupError.hint
      }, { status: 500 });
    }

    if (existing) {
      return NextResponse.json({ ok: true, customerId: existing.id });
    }

    step = "customer-insert";
    const fullName = String(
      user.user_metadata?.full_name ??
        user.email?.split("@")[0] ??
        "Cliente"
    ).trim() || "Cliente";

    const { data: customer, error } = await db
      .from("customers")
      .insert({ auth_id: user.id, full_name: fullName })
      .select("id")
      .single();

    if (error || !customer) {
      return NextResponse.json({
        ok: false,
        step,
        error: error?.message ?? "No customer returned",
        code: error?.code,
        details: error?.details,
        hint: error?.hint
      }, { status: 500 });
    }

    return NextResponse.json({ ok: true, customerId: customer.id });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      step,
      error: err instanceof Error ? err.message : String(err),
      name: err instanceof Error ? err.name : typeof err
    }, { status: 500 });
  }
}

export async function POST() {
  return runBootstrap();
}

export async function GET() {
  return runBootstrap();
}
