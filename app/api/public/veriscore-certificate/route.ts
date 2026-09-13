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

export async function GET(request: Request) {
  try {
    const code = new URL(request.url).searchParams.get("code")?.trim().toUpperCase();
    if (!code) return NextResponse.json({ error: "Codice certificato mancante." }, { status: 400 });

    const db = createServiceClient();
    const { data, error } = await db
      .from("veriscore_certificates")
      .select("public_code,booking_id,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,veriscore,workshop_id,issued_at")
      .eq("public_code", code)
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: "Certificato non trovato." }, { status: 404 });

    const { data: workshop } = await db.from("workshops").select("name").eq("id", data.workshop_id).maybeSingle();
    let service: string | null = null;
    if (data.booking_id) {
      const { data: booking } = await db.from("bookings").select("service").eq("id", data.booking_id).maybeSingle();
      service = booking?.service ?? null;
    }

    let photos: Array<{ id: string; caption: string | null; check_id: number | null; image_url: string | null }> = [];
    if (service === "veriscore_plus") {
      const { data: rows } = await db.from("photos")
        .select("id,storage_path,caption,check_id,created_at")
        .eq("inspection_id", data.booking_id)
        .order("created_at", { ascending: true })
        .limit(10);
      photos = await Promise.all((rows ?? []).map(async (photo) => {
        const { data: signed } = await db.storage.from("inspection-photos").createSignedUrl(photo.storage_path, 300);
        return { id: photo.id, caption: photo.caption, check_id: photo.check_id, image_url: signed?.signedUrl ?? null };
      }));
    }

    return NextResponse.json({ certificate: {
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
      service,
      is_plus: service === "veriscore_plus",
      photos,
    }});
  } catch (error) {
    console.error("PUBLIC_VERISCORE_CERTIFICATE_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
