import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

function normalizeCode(value: string) { return value.trim().toUpperCase().replace(/\s+/g, ""); }
function maskPlate(value: string) { const clean = value.trim().toUpperCase(); return clean ? clean.split("").map((c,i)=>i===0||i===2||i===clean.length-1?c:"*").join("") : ""; }
function maskVin(value: string) { const clean = value.trim().toUpperCase(); return !clean ? "" : clean.length<=8 ? clean : `${"*".repeat(clean.length-8)}${clean.slice(-8)}`; }

export async function GET(request: Request) {
  try {
    const code = normalizeCode(new URL(request.url).searchParams.get("code") ?? "");
    if (!code) return NextResponse.json({ error: "Codice certificato mancante." }, { status: 400 });
    const db = createServiceClient();
    const { data, error } = await db.from("veriscore_certificates")
      .select("id,public_code,booking_id,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,veriscore,workshop_id,issued_at")
      .ilike("public_code", code).limit(5);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const certificate = (data ?? []).find(r => normalizeCode(String(r.public_code)) === code);
    if (!certificate) return NextResponse.json({ error: "Certificato non trovato." }, { status: 404 });
    const { data: workshop } = await db.from("workshops").select("name").eq("id", certificate.workshop_id).maybeSingle();
    let service: string | null = null;
    if (certificate.booking_id) {
      const { data: booking } = await db.from("bookings").select("service").eq("id", certificate.booking_id).maybeSingle();
      service = booking?.service ?? null;
    }
    return NextResponse.json({ certificate: {
      public_code: certificate.public_code,
      vehicle_plate: maskPlate(certificate.vehicle_plate),
      vehicle_vin: maskVin(certificate.vehicle_vin),
      vehicle_make: certificate.vehicle_make,
      vehicle_model: certificate.vehicle_model,
      vehicle_year: certificate.vehicle_year,
      vehicle_mileage: certificate.vehicle_mileage,
      veriscore: certificate.veriscore,
      workshop_name: workshop?.name ?? null,
      issued_at: certificate.issued_at,
      service,
      is_plus: service === "veriscore_plus",
      photos: []
    }});
  } catch (error) {
    console.error("PUBLIC_VERISCORE_CERTIFICATE_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
