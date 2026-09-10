import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ok: false, stage: "auth", error: authError?.message ?? "No session" }, { status: 401 });
    }

    const db = createServiceClient();
    const { data: admin, error: adminError } = await db
      .from("admins")
      .select("auth_id,role")
      .eq("auth_id", user.id)
      .maybeSingle();

    return NextResponse.json({
      ok: !adminError && !!admin && ["admin", "super_admin"].includes(admin.role),
      stage: adminError ? "admins_query" : "done",
      userId: user.id,
      email: user.email ?? null,
      admin,
      error: adminError ? adminError.message : null,
      code: adminError?.code ?? null,
      details: adminError?.details ?? null,
      hint: adminError?.hint ?? null,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      ok: false,
      stage: "exception",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
