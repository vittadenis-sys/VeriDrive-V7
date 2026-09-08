import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });

    const body = await request.json();
    const businessName = String(body.businessName ?? "").trim();
    const vatNumber = String(body.vatNumber ?? "").trim();
    const city = String(body.city ?? "").trim();
    const address = String(body.address ?? "").trim();
    const phone = String(body.phone ?? "").trim();
    const contactName = String(body.contactName ?? "").trim();

    if (!businessName || !vatNumber || !city || !address || !phone || !contactName) {
      return NextResponse.json({ error: "Compila tutti i campi richiesti." }, { status: 400 });
    }

    const db = createServiceClient();
    const { data: existing } = await db
      .from("merchant_requests")
      .select("id,status")
      .eq("auth_id", user.id)
      .in("status", ["pending", "approved"])
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: existing.status === "approved" ? "Profilo commerciante già approvato." : "Richiesta commerciante già inviata." }, { status: 409 });
    }

    const { error } = await db.from("merchant_requests").insert({
      auth_id: user.id,
      business_name: businessName,
      vat_number: vatNumber,
      city,
      address,
      phone,
      contact_name: contactName,
      status: "pending",
    });

    if (error) return NextResponse.json({ error: "Impossibile inviare la richiesta commerciante." }, { status: 400 });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Impossibile inviare la richiesta commerciante." }, { status: 500 });
  }
}
