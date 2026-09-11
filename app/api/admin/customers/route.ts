import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: authError?.message ?? "Sessione non disponibile." },
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
      console.error("ADMIN_CUSTOMERS_ROLE_ERROR", adminError);
      return NextResponse.json(
        { error: `Errore verifica admin: ${adminError.message}`, code: adminError.code },
        { status: 500, headers: { "Cache-Control": "no-store" } }
      );
    }

    if (!admin || !["admin", "super_admin"].includes(admin.role)) {
      return NextResponse.json(
        { error: "Non autorizzato" },
        { status: 401, headers: { "Cache-Control": "no-store" } }
      );
    }

    const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";

    let query = db
      .from("customers")
      .select("id,full_name,phone,created_at")
      .order("created_at", { ascending: false });

    if (search) {
      const escaped = search.replace(/([%_\\])/g, "\\$1");
      query = query.or(`full_name.ilike.%${escaped}%,phone.ilike.%${escaped}%`);
    }

    const { data, error } = await query;
    if (error) {
      console.error("ADMIN_CUSTOMERS_QUERY_ERROR", error);
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details, hint: error.hint },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const customerIds = (data ?? []).map((customer) => customer.id);
    const bonusMap = new Map<string, number>();

    if (customerIds.length > 0) {
      const { data: bonuses, error: bonusError } = await db
        .from("customer_bonus")
        .select("customer_id,free_bookings")
        .in("customer_id", customerIds);

      if (bonusError) {
        console.error("ADMIN_CUSTOMERS_BONUS_QUERY_ERROR", bonusError);
        return NextResponse.json(
          {
            error: bonusError.message,
            code: bonusError.code,
            details: bonusError.details,
            hint: bonusError.hint,
          },
          { status: 400, headers: { "Cache-Control": "no-store" } }
        );
      }

      for (const bonus of bonuses ?? []) {
        bonusMap.set(bonus.customer_id, Number(bonus.free_bookings ?? 0));
      }
    }

    const customers = (data ?? []).map((customer) => ({
      ...customer,
      demo_access: false,
      autogerma_free_booking_bonus: bonusMap.get(customer.id) ?? 0,
    }));

    return NextResponse.json(
      { customers },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("ADMIN_CUSTOMERS_ERROR", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Errore interno." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
