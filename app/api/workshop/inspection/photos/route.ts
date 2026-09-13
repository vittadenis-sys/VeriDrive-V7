import { NextResponse } from "next/server";
import { requireWorkshopOwner } from "@/lib/authorization";
import { createServiceClient } from "@/lib/supabase/service";

async function getWorkshop(db: ReturnType<typeof createServiceClient>, userId: string) {
  const { data, error } = await db.from("workshops").select("id").eq("owner_auth_id", userId).maybeSingle();
  if (error || !data) return null;
  return data;
}

async function ensureStorageBucket(db: ReturnType<typeof createServiceClient>) {
  const bucket = "inspection-photos";
  const { data: buckets } = await db.storage.listBuckets();
  const exists = (buckets ?? []).some((item) => item.id === bucket || item.name === bucket);
  if (!exists) {
    await db.storage.createBucket(bucket, { public: false, fileSizeLimit: "8MB" });
  }
}

async function resolveInspection(db: ReturnType<typeof createServiceClient>, bookingId: string, workshopId: string) {
  const { data: booking, error: bookingError } = await db
    .from("bookings")
    .select("id,workshop_id,service")
    .eq("id", bookingId)
    .maybeSingle();
  if (bookingError || !booking || booking.workshop_id !== workshopId) return { error: "Pratica non trovata." as string | null };
  if (booking.service !== "veriscore_plus") return { error: "Le foto sono disponibili solo per VeriScore Plus." as string | null };

  let { data: inspection, error: inspectionError } = await db.from("inspections").select("id").eq("booking_id", bookingId).maybeSingle();
  if (inspectionError) return { error: inspectionError.message };
  if (!inspection) {
    const { data: createdInspection, error: createError } = await db
      .from("inspections")
      .insert({ booking_id: bookingId, checklist: [], passed_checks: 0, notes: null })
      .select("id")
      .single();
    if (createError) return { error: createError.message };
    inspection = createdInspection;
  }
  return { inspectionId: inspection.id, error: null as string | null };
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

    const { data, error } = await db.from("photos")
      .select("id,storage_path,caption,check_id,created_at")
      .eq("inspection_id", resolved.inspectionId)
      .order("created_at", { ascending: true })
      .limit(10);
    if (error) return NextResponse.json({ error: error.message, code: error.code, hint: error.hint }, { status: 500 });
    await ensureStorageBucket(db);
    const photos = await Promise.all((data ?? []).map(async (photo) => {
      const { data: signed } = await db.storage.from("inspection-photos").createSignedUrl(photo.storage_path, 300);
      return { ...photo, preview_url: signed?.signedUrl ?? null };
    }));
    return NextResponse.json({ photos });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireWorkshopOwner();
    const formData = await request.formData();
    const bookingId = String(formData.get("bookingId") ?? "").trim();
    const files = formData.getAll("photos").filter((value): value is File => value instanceof File);
    if (!bookingId || files.length === 0) return NextResponse.json({ error: "Pratica o foto mancanti." }, { status: 400 });

    const db = createServiceClient();
    const workshop = await getWorkshop(db, user.id);
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });
    const resolved = await resolveInspection(db, bookingId, workshop.id);
    if (resolved.error) return NextResponse.json({ error: resolved.error }, { status: 400 });
    const inspectionId = resolved.inspectionId as string;

    const { data: existing, error: existingError } = await db.from("photos")
      .select("id,storage_path,caption,check_id,created_at")
      .eq("inspection_id", inspectionId)
      .order("created_at", { ascending: true });
    if (existingError) return NextResponse.json({ error: existingError.message, code: existingError.code, hint: existingError.hint }, { status: 500 });
    if ((existing ?? []).length + files.length > 10) return NextResponse.json({ error: "VeriScore Plus consente esattamente 10 foto." }, { status: 400 });

    await ensureStorageBucket(db);
    const created = [];
    for (const file of files) {
      if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Sono consentite solo immagini." }, { status: 400 });
      if (file.size > 8 * 1024 * 1024) return NextResponse.json({ error: "Ogni foto deve essere inferiore a 8 MB." }, { status: 400 });
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const safeExt = ["jpg", "jpeg", "png", "webp", "heic"].includes(ext) ? ext : "jpg";
      const storagePath = `${workshop.id}/${bookingId}/${crypto.randomUUID()}.${safeExt}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      const { error: uploadError } = await db.storage.from("inspection-photos").upload(storagePath, bytes, { contentType: file.type || "image/jpeg", upsert: false });
      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });
      const { data: row, error: rowError } = await db.from("photos")
        .insert({ inspection_id: inspectionId, storage_path: storagePath, caption: null, check_id: null })
        .select("id,storage_path,caption,check_id,created_at")
        .single();
      if (rowError) return NextResponse.json({ error: rowError.message, code: rowError.code, hint: rowError.hint }, { status: 500 });
      const { data: signed } = await db.storage.from("inspection-photos").createSignedUrl(storagePath, 300);
      created.push({ ...row, preview_url: signed?.signedUrl ?? null });
    }
    return NextResponse.json({ photos: created });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
