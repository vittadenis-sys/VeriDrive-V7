import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: authError?.message ?? "Sessione non disponibile." }, { status: 401 });
    }

    const db = createServiceClient();
    const { data: admin, error: adminError } = await db
      .from("admins")
      .select("auth_id,role")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (adminError) {
      console.error("ADMIN_BONUS_ROLE_ERROR", adminError);
      return NextResponse.json({ error: adminError.message, code: adminError.code }, { status: 500 });
    }

    if (!admin || !["admin", "super_admin"].includes(admin.role)) {
      return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    if (!Number.isInteger(body.bonus) || body.bonus < 0) {
      return NextResponse.json({ error: "Numero di bonus non valido." }, { status: 400 });
    }

    const { data: customer, error: customerError } = await db
      .from("customers")
      .select("id,full_name,phone")
      .eq("id", id)
      .single();

    if (customerError || !customer) {
      return NextResponse.json(
        { error: customerError?.message ?? "Cliente non trovato.", code: customerError?.code ?? null },
        { status: 404 }
      );
    }

    return NextResponse.json({
      error: "Il database non espone una colonna bonus su customers; serve una tabella/campo bonus dedicato.",
      customer,
    }, { status: 409 });
  } catch (error) {
    console.error("ADMIN_BONUS_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
