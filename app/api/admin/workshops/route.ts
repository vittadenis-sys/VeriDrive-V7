import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

const OFFICINA_PRINCIPALE = "VeriDrive Faloppio — Autogerma";

function formatWorkshopName(city: string | null, name: string) {
  const locality = city?.trim() || "Italia";
  return `VeriDrive ${locality} — ${name}`;
}

export async function GET() {
  try {
    await requireAdmin();
    const db = createServiceClient();
    const { data, error } = await db
      .from("workshops")
      .select("id,name,city,address,postal_code,email,phone,is_active,latitude,longitude")
      .eq("is_active", true)
      .order("city")
      .order("name");
    if (error) throw error;
    const workshops = (data ?? []).map((w) => ({
      ...w,
      display_name: formatWorkshopName(w.city, w.name),
      is_main: formatWorkshopName(w.city, w.name) === OFFICINA_PRINCIPALE,
    }));
    return NextResponse.json({ workshops });
  } catch {
    return NextResponse.json({ error: "Non autorizzato" }, { status: 401 });
  }
}
