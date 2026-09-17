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
    const { data: admin } = await db.from("admins").select("role").eq("auth_id", user.id).maybeSingle();
    const isAdmin = !!admin && ["admin", "super_admin"].includes(admin.role);

    const { data: ownerWorkshop } = await db.from("workshops").select("id").eq("owner_auth_id", user.id).maybeSingle();
    const { data: certificate, error: certificateError } = await db
      .from("veriscore_certificates")
      .select("id,booking_id,public_code,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,veriscore,workshop_id,issued_at")
      .eq("id", id)
      .maybeSingle();

    if (certificateError) return NextResponse.json({ error: certificateError.message }, { status: 500 });
    if (!certificate) return NextResponse.json({ error: "Certificato non trovato." }, { status: 404 });

    const { data: workshop } = await db.from("workshops").select("id,name").eq("id", certificate.workshop_id).maybeSingle();
    if (!workshop) return NextResponse.json({ error: "Officina non associata." }, { status: 404 });

    if (!isAdmin && ownerWorkshop?.id !== workshop.id) {
      return NextResponse.json({ error: "Certificato non associato all'officina." }, { status: 403 });
    }

    const { data: booking } = await db.from("bookings")
      .select("id,customer_id,service,overall_notes")
      .eq("id", certificate.booking_id)
      .eq("workshop_id", workshop.id)
      .maybeSingle();
    if (!booking) return NextResponse.json({ error: "Pratica non associata all'officina." }, { status: 404 });

    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();
    const score = Number(certificate.veriscore);
    const code = String(certificate.public_code);

    pdf.setFillColor(58, 98, 141);
    pdf.rect(0, 0, W, 42, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(32);
    pdf.text("VeriDrive", 16, 20);
    pdf.setFontSize(11);
    pdf.text("CERTIFICATO VERISCORE", 16, 31);

    pdf.setTextColor(23, 59, 109);
    pdf.setFontSize(11.5);
    pdf.text("CERTIFICATO UFFICIALE", 16, 56);
    pdf.setFontSize(34);
    pdf.text(code, 16, 72);
    pdf.setTextColor(93, 113, 136);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10.5);
    pdf.text(`Data emissione: ${new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(certificate.issued_at))}`, 16, 82);

    pdf.setFillColor(246, 249, 252);
    pdf.roundedRect(16, 92, W - 32, 74, 8, 8, "F");
    pdf.setTextColor(23, 59, 109);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.text("DATI DEL VEICOLO", 23, 108);
    const rows = [
      ["MARCA E MODELLO", [certificate.vehicle_make, certificate.vehicle_model].filter(Boolean).join(" ") || "Non indicato"],
      ["ANNO", String(certificate.vehicle_year ?? "Non indicato")],
      ["TARGA", String(certificate.vehicle_plate)],
      ["VIN / TELAIO", String(certificate.vehicle_vin)],
      ["CHILOMETRAGGIO", `${Number(certificate.vehicle_mileage).toLocaleString("it-IT")} km`],
      ["OFFICINA", workshop.name],
    ];
    rows.forEach(([label, value], i) => {
      const x = i % 2 === 0 ? 23 : W / 2 + 3;
      const y = 122 + Math.floor(i / 2) * 15;
      pdf.setTextColor(93, 113, 136);
      pdf.setFontSize(9);
      pdf.text(label, x, y);
      pdf.setTextColor(23, 59, 109);
      pdf.setFontSize(14);
      pdf.text(String(value), x, y + 6.5, { maxWidth: 70 });
    });

    pdf.setTextColor(78, 134, 190);
    pdf.setFontSize(28);
    pdf.text(`${score}/100`, W / 2, 205, { align: "center" });
    pdf.setTextColor(23, 59, 109);
    pdf.setFontSize(16);
    pdf.text("VERISCORE", W / 2, 216, { align: "center" });

    const qr = await QRCode.toDataURL(`${process.env.NEXT_PUBLIC_APP_URL || "https://veridrive.it"}/verifica/${encodeURIComponent(code)}`, { margin: 1, width: 180 });
    pdf.addImage(qr, "PNG", W - 62, H - 72, 38, 38);
    pdf.setTextColor(93, 113, 136);
    pdf.setFontSize(7.5);
    pdf.text("Verifica pubblica", W - 43, H - 30, { align: "center" });

    const buffer = pdf.output("arraybuffer");
    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="VeriDrive-${code}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("WORKSHOP_CERTIFICATE_PDF_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Errore interno." }, { status: 500 });
  }
}
