import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const VERSION = "admin-route-diag-2026-09-10-v1";

export async function GET() {
  const base = { version: VERSION };
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({
        ...base,
        stage: "auth",
        session: false,
        userId: null,
        email: null,
        admin: null,
        error: authError?.message ?? "No session",
      }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const db = createServiceClient();
    const { data: admin, error: adminError } = await db
      .from("admins")
      .select("auth_id,role")
      .eq("auth_id", user.id)
      .maybeSingle();

    const authorized = !adminError && !!admin && ["admin", "super_admin"].includes(admin.role);

    return NextResponse.json({
      ...base,
      stage: adminError ? "admins_query" : admin ? "done" : "admin_missing",
      session: true,
      userId: user.id,
      email: user.email ?? null,
      admin,
      authorized,
      cookies: (await import("next/headers")).cookies ? undefined : undefined,
      error: adminError?.message ?? (admin ? null : "Admin record not found"),
      code: adminError?.code ?? null,
      details: adminError?.details ?? null,
      hint: adminError?.hint ?? null,
    }, { status: authorized ? 200 : 401, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({
      ...base,
      stage: "exception",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
