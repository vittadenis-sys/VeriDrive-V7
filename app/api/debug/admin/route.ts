import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const VERSION = "admin-diag-2026-09-10-v2";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          ok: false,
          version: VERSION,
          stage: "auth",
          userId: null,
          email: null,
          admin: null,
          error: authError?.message ?? "No session",
        },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const db = createServiceClient();
    const { data: admin, error: adminError } = await db
      .from("admins")
      .select("auth_id,role")
      .eq("auth_id", user.id)
      .maybeSingle();

    return NextResponse.json(
      {
        ok: !adminError && !!admin && ["admin", "super_admin"].includes(admin.role),
        version: VERSION,
        stage: adminError ? "admins_query" : admin ? "done" : "admin_missing",
        userId: user.id,
        email: user.email ?? null,
        admin: admin ?? null,
        error: adminError?.message ?? null,
        code: adminError?.code ?? null,
        details: adminError?.details ?? null,
        hint: adminError?.hint ?? null,
      },
      {
        status: adminError ? 500 : 200,
        headers: { "Cache-Control": "no-store" },
      }
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        version: VERSION,
        stage: "exception",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
