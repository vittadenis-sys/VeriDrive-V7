import { NextResponse } from "next/server";
import { requireWorkshopOwner } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  try {
    const user = await requireWorkshopOwner();
    const date = new URL(request.url).searchParams.get("date") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ error: "Data non valida." }, { status: 400 });

    const db = createServiceClient();
    const { data: workshop, error: workshopError } = await db.from("workshops").select("id,name,city,address,postal_code").eq("owner_auth_id", user.id).single();
    if (workshopError || !workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });

    const { data: bookings, error } = await db
      .from("bookings")
      .select("id,plate,vehicle_make,vehicle_model,requested_date,requested_slot,status,service_key")
      .eq("workshop_id", workshop.id)
      .eq("requested_date", date)
      .order("requested_slot", { ascending: true });
    if (error) throw error;

    return NextResponse.json({ workshop, bookings: bookings ?? [] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Non autorizzato" }, { status: 401 });
  }
}
