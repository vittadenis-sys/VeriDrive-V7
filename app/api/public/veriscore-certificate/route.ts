import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "Codice certificato mancante." }, { status: 400 });

  const db = createServiceClient();
  const { data, error } = await db
    .from("veriscore_certificates")
    .select("public_code,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,veriscore,workshop_id,issued_at,workshops(name)")
    .eq("public_code", code)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Certificato non trovato." }, { status: 404 });

  const workshop = Array.isArray(data.workshops) ? data.workshops[0] : data.workshops;
  return NextResponse.json({ certificate: { ...data, workshop_name: workshop?.name ?? null, workshops: undefined } });
}
