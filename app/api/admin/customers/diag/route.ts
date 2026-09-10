import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const VERSION = "admin-customers-diag-2026-09-10-v1";

export async function GET(request: Request) {
  const base = { version: VERSION, path: new URL(request.url).pathname };
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ ...base, stage: "auth", session: false, error: authError?.message ?? "No session" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const db = createServiceClient();
    const { data: admin, error: adminError } = await db
      .from("admins")
      .select("auth_id,role")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (adminError) {
      return NextResponse.json({ ...base, stage: "admins_query", session: true, userId: user.id, email: user.email ?? null, admin: null, authorized: false, error: adminError.message, code: adminError.code, details: adminError.details, hint: adminError.hint }, { status: 500, headers: { "Cache-Control": "no-store" } });
    }

    const authorized = !!admin && ["admin", "super_admin"].includes(admin.role);
    if (!authorized) {
      return NextResponse.json({ ...base, stage: "admin_missing", session: true, userId: user.id, email: user.email ?? null, admin, authorized: false, error: "Admin record/role not authorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
    }

    const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";
    let query = db.from("customers").select("id,full_name,phone,demo_access,autogerma_free_booking_bonus,created_at").order("created_at", { ascending: false });
    if (search) {
      const escaped = search.replace(/([%_\\])/g, "\\$1");
      query = query.or(`full_name.ilike.%${escaped}%,phone.ilike.%${escaped}%`);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ ...base, stage: "customers_query", session: true, userId: user.id, email: user.email ?? null, admin, authorized: true, search, error: error.message, code: error.code, details: error.details, hint: error.hint }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    return NextResponse.json({ ...base, stage: "done", session: true, userId: user.id, email: user.email ?? null, admin, authorized: true, search, count: data?.length ?? 0, customers: data ?? [] }, { status: 200, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ...base, stage: "exception", error: error instanceof Error ? error.message : String(error) }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
