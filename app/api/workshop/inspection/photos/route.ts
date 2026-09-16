import { NextResponse } from "next/server";
import { requireWorkshopOwner } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

const MAX_PHOTOS = 4;
const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;

async function getWorkshop(db: ReturnType<typeof createServiceClient>, userId: string) {
  const { data, error } = await db.from("workshops").select("id").eq("owner_auth_id", userId).maybeSingle();
  if (error || !data) return null;
  return data;
}

async function ensureStorageBucket(db: ReturnType<typeof createServiceClient>) {
  const bucket = "inspection-photos";
  const { data: buckets, error: listError } = await db.storage.listBuckets();
  if (listError) throw listError;
  const exists = (buckets ?? []).some((item) => item.id === bucket || item.name === bucket);
  if (!exists) {
    const { error } = await db.storage.createBucket(bucket, { public: false, fileSizeLimit: "8MB" });
    if (error && !/already exists/i.test(error.message)) throw error;
  }
}

async function resolveInspection(db: ReturnType<typeof createServiceClient>, bookingId: string, workshopId: string) {
  const { data: booking, error: bookingError } = await db.from("bookings").select("id,workshop_id,service").eq("id", bookingId).maybeSingle();
  if (bookingError || !booking || booking.workshop_id !== workshopId) return { error: "Pratica non trovata." as string | null };
  if (booking.service !== "veriscore_plus") return { error: "Le foto sono disponibili solo per VeriScore Plus." as string | null };
  let { data: inspection, error: inspectionError } = await db.from("inspections").select("id").eq("booking_id", bookingId).maybeSingle();
  if (inspectionError) return { error: inspectionError.message };
  if (!inspection) {
    const { data: createdInspection, error: createError } = await db.from("inspections").insert({ booking_id: bookingId, inspector_auth_id: null, checklist: [], passed_checks: 0, notes: null }).select("id").single();
    if (createError || !createdInspection) return { error: createError?.message ?? "Impossibile creare l'ispezione." };
    inspection = createdInspection;
  }
  return { inspectionId: inspection.id as string, error: null as string | null };
}

async function listPhotos(db: ReturnType<typeof createServiceClient>, inspectionId: string) {
  const { data, error } = await db.from("photos")
    .select("id,storage_path,caption,check_id,created_at")
    .eq("inspection_id", inspectionId)
    .order("created_at", { ascending: true })
    .limit(MAX_PHOTOS);
  if (error) throw error;
  return (data ?? []) as Array<{ id: string; storage_path: string; caption: string | null; check_id: number | null; created_at: string }>;
}

async function signedPhotos(db: ReturnType<typeof createServiceClient>, photos: Array<{ id: string; storage_path: string; caption: string | null; check_id: number | null; created_at: string }>) {
  return Promise.all(photos.slice(0, MAX_PHOTOS).map(async (photo) => {
    const { data: signed, error } = await db.storage.from("inspection-photos").createSignedUrl(photo.storage_path, 600);
    return { ...photo, preview_url: error || !signed?.signedUrl ? null : signed.signedUrl };
  }));
}

export async function GET(request: Request) {
  try {
    const user = await requireWorkshopOwner();
    const bookingId = new URL(request.url).searchParams.get("bookingId")?.trim();
    if (!bookingId) return NextResponse.json({ error: "Pratica non trovata." }, { status: 400 });
    const db = createServiceClient();
    const workshop = await getWorkshop(db, user.id);
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });
    const resolved = await resolveInspection(db, bookingId, workshop.id);
    if (resolved.error) return NextResponse.json({ error: resolved.error }, { status: 404 });
    const photos = await listPhotos(db, resolved.inspectionId as string);
    return NextResponse.json({ photos: await signedPhotos(db, photos) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireWorkshopOwner();
    const formData = await request.formData();
    const bookingId = String(formData.get("bookingId") ?? "").trim();
    const files = formData.getAll("photos").filter((value): value is File => value instanceof File && value.size > 0);
    if (!bookingId || files.length === 0) return NextResponse.json({ error: "Pratica o foto mancanti." }, { status: 400 });
    if (files.length > MAX_PHOTOS) return NextResponse.json({ error: "Puoi caricare al massimo 4 foto per sessione." }, { status: 400 });

    const db = createServiceClient();
    const workshop = await getWorkshop(db, user.id);
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });
    const resolved = await resolveInspection(db, bookingId, workshop.id);
    if (resolved.error) return NextResponse.json({ error: resolved.error }, { status: 400 });
    await ensureStorageBucket(db);

    const inspectionId = resolved.inspectionId as string;
    const existing = await listPhotos(db, inspectionId);
    const room = MAX_PHOTOS - existing.length;
    if (room <= 0) return NextResponse.json({ error: "Sono già presenti 4 foto per questa verifica." }, { status: 400 });
    if (files.length > room) return NextResponse.json({ error: `Puoi aggiungere ancora ${room} ${room === 1 ? "foto" : "foto"}. Massimo 4 foto.` }, { status: 400 });

    const createdPaths: string[] = [];
    try {
      for (const file of files) {
        if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Sono consentite solo immagini." }, { status: 400 });
        if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: "La foto è troppo grande. Riducila prima di caricarla." }, { status: 400 });
        const storagePath = `${workshop.id}/${bookingId}/${crypto.randomUUID()}.jpg`;
        const bytes = new Uint8Array(await file.arrayBuffer());
        const { error: uploadError } = await db.storage.from("inspection-photos").upload(storagePath, bytes, {
          contentType: "image/jpeg",
          upsert: false,
          cacheControl: "31536000",
        });
        if (uploadError) throw uploadError;
        createdPaths.push(storagePath);
        const { error: rowError } = await db.from("photos").insert({ inspection_id: inspectionId, storage_path: storagePath, caption: null, check_id: null });
        if (rowError) throw rowError;
      }
      const refreshed = await listPhotos(db, inspectionId);
      return NextResponse.json({ photos: await signedPhotos(db, refreshed) });
    } catch (error) {
      if (createdPaths.length) {
        await db.storage.from("inspection-photos").remove(createdPaths);
        await db.from("photos").delete().eq("inspection_id", inspectionId).in("storage_path", createdPaths);
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
