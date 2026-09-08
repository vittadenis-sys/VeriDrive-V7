import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error("BOOTSTRAP_AUTH_ERROR", {
        message: authError?.message ?? "No authenticated user",
        hasUser: Boolean(user),
      });
      return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });
    }

    console.log("BOOTSTRAP_AUTH_OK", { userId: user.id });

    const db = createServiceClient();
    console.log("BOOTSTRAP_SERVICE_CLIENT_OK");

    const { data: existing, error: lookupError } = await db
      .from("customers")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (lookupError) {
      console.error("CUSTOMER_LOOKUP_ERROR", {
        message: lookupError.message,
        code: lookupError.code,
        details: lookupError.details,
        hint: lookupError.hint,
        userId: user.id,
      });
      return NextResponse.json(
        { error: lookupError.message ?? "Impossibile verificare il profilo cliente." },
        { status: 500 }
      );
    }

    console.log("BOOTSTRAP_LOOKUP_OK", {
      found: Boolean(existing),
      customerId: existing?.id ?? null,
    });

    if (existing) return NextResponse.json({ ok: true, customerId: existing.id });

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
      console.error("CUSTOMER_INSERT_ERROR", {
        message: error?.message ?? "No customer returned",
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        userId: user.id,
      });
      return NextResponse.json(
        { error: error?.message ?? "Impossibile creare il profilo cliente." },
        { status: 500 }
      );
    }

    console.log("BOOTSTRAP_INSERT_OK", {
      userId: user.id,
      customerId: customer.id,
    });

    return NextResponse.json({ ok: true, customerId: customer.id });
  } catch (err) {
    console.error("BOOTSTRAP_ERROR", {
      name: err instanceof Error ? err.name : typeof err,
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Bootstrap failed" },
      { status: 500 }
    );
  }
}
