import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const db = createServiceClient();
    const search = new URL(request.url).searchParams.get("search")?.trim() ?? "";

    let query = db
      .from("customers")
      .select("id,full_name,phone,demo_access,created_at")
      .order("created_at", { ascending: false });

    if (search) {
      const escaped = search.replace(/[%_]/g, "\\$&");
      query = query.or(`full_name.ilike.%${escaped}%,phone.ilike.%${escaped}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ customers: data ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Non autorizzato" }, { status: 401 });
  }
}
