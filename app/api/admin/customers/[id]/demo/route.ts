import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await request.json();
    if (typeof body.demoAccess !== "boolean") {
      return NextResponse.json({ error: "Valore demoAccess non valido." }, { status: 400 });
    }
    const db = createServiceClient();
    const { data, error } = await db
      .from("customers")
      .update({ demo_access: body.demoAccess })
      .eq("id", id)
      .select("id,demo_access")
      .single();
    if (error || !data) throw error ?? new Error("Cliente non trovato.");
    return NextResponse.json({ customer: data });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Non autorizzato" }, { status: 401 });
  }
}
