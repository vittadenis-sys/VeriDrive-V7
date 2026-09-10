import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createServiceClient } from "@/lib/supabase/service";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import type { CookieOptions } from "@supabase/ssr";

type SupabaseCookie = { name: string; value: string; options?: CookieOptions };

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const { env } = getCloudflareContext();
    const runtimeEnv = env as unknown as Record<string, string | undefined>;
    const processEnv = process.env as Record<string, string | undefined>;

    const url =
      runtimeEnv.NEXT_PUBLIC_SUPABASE_URL ||
      runtimeEnv.SUPABASE_URL ||
      processEnv.NEXT_PUBLIC_SUPABASE_URL ||
      processEnv.SUPABASE_URL;
    const key =
      runtimeEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      processEnv.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    if (!url || !key) {
      return NextResponse.json({ error: "Supabase non configurato." }, { status: 500 });
    }

    const supabase = createServerClient(url, key, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: SupabaseCookie[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {}
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message ?? "Non autorizzato" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const db = createServiceClient();
    const { data: admin, error: adminError } = await db
      .from("admins")
      .select("auth_id,role")
      .eq("auth_id", user.id)
      .maybeSingle();

    if (adminError) {
      return NextResponse.json(
        { error: adminError.message, code: adminError.code, details: adminError.details, hint: adminError.hint },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!admin || !["admin", "super_admin"].includes(admin.role)) {
      return NextResponse.json(
        { error: "Non autorizzato", role: admin?.role ?? null },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";

    let query = db
      .from("customers")
      .select("id,full_name,phone,demo_access,autogerma_free_booking_bonus,created_at")
      .order("created_at", { ascending: false });

    if (search) {
      const escaped = search.replace(/[%_]/g, "\\$&");
      query = query.or(`full_name.ilike.%${escaped}%,phone.ilike.%${escaped}%`);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details, hint: error.hint },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      { customers: data ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
