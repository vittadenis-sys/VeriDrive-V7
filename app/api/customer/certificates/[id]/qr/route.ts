import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import QRCode from "qrcode";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });

    const db = createServiceClient();
    const { data: customer } = await db.from("customers").select("id").eq("auth_id", user.id).maybeSingle();
    if (!customer) return NextResponse.json({ error: "Profilo cliente non disponibile." }, { status: 403 });

    const { data: certificate, error } = await db.from("veriscore_certificates").select("id,booking_id,public_code").eq("id", id).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!certificate) return NextResponse.json({ error: "Certificato non trovato." }, { status: 404 });

    const { data: booking } = await db.from("bookings").select("id").eq("id", certificate.booking_id).eq("customer_id", customer.id).maybeSingle();
    if (!booking) return NextResponse.json({ error: "Certificato non associato al cliente." }, { status: 404 });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://veridrive.it";
    const verificationUrl = `${baseUrl}/verifica/${encodeURIComponent(certificate.public_code)}`;
    const png = await QRCode.toBuffer(verificationUrl, { type: "png", width: 400, margin: 1 });
    return new NextResponse(png, { status: 200, headers: { "Content-Type": "image/png", "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("CUSTOMER_CERTIFICATE_QR_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossibile generare il QR." }, { status: 500 });
  }
}
