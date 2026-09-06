import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

function maskPlate(value: string) {
  const clean = value.trim().toUpperCase();
  if (!clean) return "";
  return clean
    .split("")
    .map((char, index) => (index === 0 || index === 2 || index === clean.length - 1 ? char : "*"))
    .join("");
}

function maskVin(value: string) {
  const clean = value.trim().toUpperCase();
  if (!clean) return "";
  if (clean.length <= 8) return clean;
  return `${"*".repeat(clean.length - 8)}${clean.slice(-8)}`;
}

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
  return NextResponse.json({
    certificate: {
      public_code: data.public_code,
      vehicle_plate: maskPlate(data.vehicle_plate),
      vehicle_vin: maskVin(data.vehicle_vin),
      vehicle_make: data.vehicle_make,
      vehicle_model: data.vehicle_model,
      vehicle_year: data.vehicle_year,
      vehicle_mileage: data.vehicle_mileage,
      veriscore: data.veriscore,
      workshop_name: workshop?.name ?? null,
      issued_at: data.issued_at,
    },
  });
}
