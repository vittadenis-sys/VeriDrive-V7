import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code")?.trim();
  if (!code) return NextResponse.json({ error: "Codice certificato mancante." }, { status: 400 });
  const db = createServiceClient();
  const { data, error } = await db
    .from("certificates")
    .select("public_code,is_revoked,issued_at,pdf_path,inspections(passed_checks,veriscore,completed_at,notes,bookings(plate,vehicle_make,vehicle_model,vehicle_year,service_key))")
    .eq("public_code", code)
    .maybeSingle();
  if (error || !data) return NextResponse.json({ error: "Certificato non trovato." }, { status: 404 });
  return NextResponse.json({ certificate: data });
}
