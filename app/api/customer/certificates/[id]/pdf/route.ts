import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { jsPDF } from "jspdf";
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

    const { data: certificate, error } = await db
      .from("veriscore_certificates")
      .select("id,booking_id,public_code,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,veriscore,workshop_id,issued_at")
      .eq("id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!certificate) return NextResponse.json({ error: "Certificato non trovato." }, { status: 404 });

    const { data: booking } = await db.from("bookings").select("id,customer_id").eq("id", certificate.booking_id).eq("customer_id", customer.id).maybeSingle();
    if (!booking) return NextResponse.json({ error: "Certificato non associato al cliente." }, { status: 404 });

    const { data: workshop } = await db.from("workshops").select("name,address,city,postal_code").eq("id", certificate.workshop_id).maybeSingle();

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://veridrive.it";
    const verificationUrl = `${baseUrl}/verifica/${encodeURIComponent(certificate.public_code)}`;
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 180 });

    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    pdf.setFontSize(24);
    pdf.text("VeriDrive", 20, 22);
    pdf.setFontSize(13);
    pdf.text("CERTIFICATO VERISCORE", 20, 32);
    pdf.setFontSize(11);
    const lines = [
      `Codice certificato: ${certificate.public_code}`,
      `Veicolo: ${[certificate.vehicle_make, certificate.vehicle_model].filter(Boolean).join(" ") || "Non indicato"}`,
      `Anno: ${certificate.vehicle_year ?? "Non indicato"}`,
      `Targa: ${certificate.vehicle_plate}`,
      `Telaio / VIN: ${certificate.vehicle_vin}`,
      `Chilometraggio certificato: ${Number(certificate.vehicle_mileage).toLocaleString("it-IT")} km`,
      `VeriScore: ${certificate.veriscore}/100`,
      `Officina: ${workshop?.name ?? "Officina VeriDrive"}`,
      `Data emissione: ${new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(certificate.issued_at))}`,
    ];
    let y = 48;
    for (const line of lines) { pdf.text(line, 20, y); y += 9; }
    pdf.addImage(qrDataUrl, "PNG", 145, 40, 40, 40);
    pdf.setFontSize(9);
    pdf.text("Scansiona il QR per verificare pubblicamente il certificato.", 20, 145, { maxWidth: 170 });
    pdf.text(verificationUrl, 20, 152, { maxWidth: 170 });

    const arrayBuffer = pdf.output("arraybuffer");
    return new NextResponse(new Uint8Array(arrayBuffer), { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${certificate.public_code}.pdf"`, "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("CUSTOMER_CERTIFICATE_PDF_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossibile generare il certificato." }, { status: 500 });
  }
}
