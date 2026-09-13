import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

function maskPlate(value: string) {
  const clean = value.trim().toUpperCase();
  if (!clean) return "";
  return clean.split("").map((char, index) => index === 0 || index === 2 || index === clean.length - 1 ? char : "*").join("");
}

function maskVin(value: string) {
  const clean = value.trim().toUpperCase();
  if (!clean) return "";
  if (clean.length <= 8) return clean;
  return `${"*".repeat(clean.length - 8)}${clean.slice(-8)}`;
}

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

export async function GET(request: Request) {
  try {
    const code = normalizeCode(new URL(request.url).searchParams.get("code") ?? "");
    if (!code) return NextResponse.json({ error: "Codice certificato mancante." }, { status: 400 });

    const db = createServiceClient();
    const { data, error } = await db
      .from("veriscore_certificates")
      .select("id,public_code,booking_id,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,veriscore,workshop_id,issued_at")
      .ilike("public_code", code)
      .limit(2);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const certificate = (data ?? []).find((row) => normalizeCode(String(row.public_code)) === code) ?? null;
    if (!certificate) return NextResponse.json({ error: "Certificato non trovato." }, { status: 404 });

    const { data: workshop } = await db.from("workshops").select("name").eq("id", certificate.workshop_id).maybeSingle();
    let service: string | null = null;
    let inspectionId: string | null = null;
    if (certificate.booking_id) {
      const { data: booking } = await db.from("bookings").select("service").eq("id", certificate.booking_id).maybeSingle();
      service = booking?.service ?? null;
      const { data: inspection } = await db.from("inspections").select("id").eq("booking_id", certificate.booking_id).maybeSingle();
      inspectionId = inspection?.id ?? null;
    }

    let photos: Array<{ id: string; caption: string | null; check_id: number | null; image_url: string | null }> = [];
    if (service === "veriscore_plus" && inspectionId) {
      const { data: rows } = await db.from("photos").select("id,storage_path,caption,check_id,created_at").eq("inspection_id", inspectionId).order("created_at", { ascending: true }).limit(10);
      photos = await Promise.all((rows ?? []).map(async (photo) => {
        const { data: signed } = await db.storage.from("inspection-photos").createSignedUrl(photo.storage_path, 600);
        return { id: photo.id, caption: photo.caption, check_id: photo.check_id, image_url: signed?.signedUrl ?? null };
      }));
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
      photos,
    }});
  } catch (error) {
    console.error("PUBLIC_VERISCORE_CERTIFICATE_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
