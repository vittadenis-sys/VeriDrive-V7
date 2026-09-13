import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

function getBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://veridrive.it";
}

async function buildPdf(certificate: {
  id: string;
  booking_id: string;
  public_code: string;
  vehicle_plate: string;
  vehicle_vin: string;
  vehicle_make: string | null;
  vehicle_model: string | null;
  vehicle_year: number | null;
  vehicle_mileage: number;
  veriscore: number;
  workshop_id: string;
  issued_at: string;
}, bookingCode: string, workshopName: string | null) {
  const verificationUrl = `${getBaseUrl()}/verifica/${encodeURIComponent(certificate.public_code)}`;
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, { margin: 1, width: 420 });
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  pdf.setFontSize(24);
  pdf.text("VeriDrive", 20, 22);
  pdf.setFontSize(13);
  pdf.text("CERTIFICATO VERISCORE", 20, 32);
  pdf.setFontSize(11);
  const lines = [
    `Codice certificato: ${certificate.public_code}`,
    `Pratica: ${bookingCode}`,
    `Veicolo: ${[certificate.vehicle_make, certificate.vehicle_model].filter(Boolean).join(" ") || "Non indicato"}`,
    `Anno: ${certificate.vehicle_year ?? "Non indicato"}`,
    `Targa: ${certificate.vehicle_plate}`,
    `Telaio / VIN: ${certificate.vehicle_vin}`,
    `Chilometraggio certificato: ${Number(certificate.vehicle_mileage).toLocaleString("it-IT")} km`,
    `VeriScore: ${certificate.veriscore}/100`,
    `Officina: ${workshopName ?? "Officina VeriDrive"}`,
    `Data emissione: ${new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(certificate.issued_at))}`,
  ];
  let y = 48;
  for (const line of lines) { pdf.text(line, 20, y); y += 9; }
  pdf.addImage(qrDataUrl, "PNG", 145, 47, 45, 45);
  pdf.setFontSize(8);
  pdf.text("Scansiona per verificare il certificato pubblico", 145, 96, { maxWidth: 45, align: "center" });
  pdf.setFontSize(9);
  pdf.text("Documento emesso da VeriDrive. La verifica pubblica mostra esclusivamente i dati non sensibili del certificato.", 20, 145, { maxWidth: 170 });
  return pdf.output("arraybuffer");
}

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

    const { data: booking } = await db.from("bookings").select("id,customer_id,booking_code").eq("id", certificate.booking_id).eq("customer_id", customer.id).maybeSingle();
    if (!booking) return NextResponse.json({ error: "Certificato non associato al cliente." }, { status: 404 });

    const { data: workshop } = await db.from("workshops").select("name").eq("id", certificate.workshop_id).maybeSingle();
    const bytes = await buildPdf(certificate, String(booking.booking_code ?? booking.id), workshop?.name ?? null);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${certificate.public_code}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("CUSTOMER_CERTIFICATE_PDF_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossibile generare il certificato." }, { status: 500 });
  }
}
