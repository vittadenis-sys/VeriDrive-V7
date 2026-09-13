import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { jsPDF } from "jspdf";

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function fitText(pdf: jsPDF, value: string, maxWidth: number, fontSize: number) {
  pdf.setFontSize(fontSize);
  return pdf.splitTextToSize(value, maxWidth) as string[];
}

async function fetchImageData(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    const chunk = 0x8000;
    for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
    const base64 = btoa(binary);
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Accesso richiesto." }, { status: 401 });

    const db = createServiceClient();
    const { data: customer } = await db
      .from("customers")
      .select("id")
      .eq("auth_id", user.id)
      .maybeSingle();
    if (!customer) return NextResponse.json({ error: "Profilo cliente non disponibile." }, { status: 403 });

    const { data: certificate, error } = await db
      .from("veriscore_certificates")
      .select("id,booking_id,public_code,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,veriscore,workshop_id,issued_at")
      .eq("id", id)
      .maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!certificate) return NextResponse.json({ error: "Certificato non trovato." }, { status: 404 });

    const { data: booking } = await db
      .from("bookings")
      .select("id,customer_id,service")
      .eq("id", certificate.booking_id)
      .eq("customer_id", customer.id)
      .maybeSingle();
    if (!booking) return NextResponse.json({ error: "Certificato non associato al cliente." }, { status: 404 });

    const { data: workshop } = await db
      .from("workshops")
      .select("name,city,postal_code")
      .eq("id", certificate.workshop_id)
      .maybeSingle();

    const isPlus = booking.service === "veriscore_plus";
    const { data: photos } = isPlus
      ? await db.from("photos").select("id,storage_path,caption,check_id,created_at").eq("inspection_id", certificate.booking_id)
      : { data: [] as Record<string, unknown>[] };

    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const navy = hexToRgb("#0b1f3a");
    const blue = hexToRgb("#2463eb");
    const cyan = hexToRgb("#38bdf8");
    const pale = hexToRgb("#eef5ff");
    const text = hexToRgb("#17233c");
    const muted = hexToRgb("#60708b");

    pdf.setFillColor(...navy);
    pdf.rect(0, 0, pageWidth, 42, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(30);
    pdf.setFont("helvetica", "bold");
    pdf.text("VeriDrive", 18, 18);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "normal");
    pdf.setTextColor(210, 225, 255);
    pdf.text(isPlus ? "CERTIFICATO VERISCORE PLUS" : "CERTIFICATO VERISCORE", 18, 29);

    pdf.setFillColor(...blue);
    pdf.roundedRect(pageWidth - 72, 8, 54, 25, 5, 5, "F");
    pdf.setTextColor(255, 255, 255);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text(`${certificate.veriscore}/100`, pageWidth - 63, 20);
    pdf.setFontSize(8);
    pdf.text("VERISCORE", pageWidth - 63, 27);

    let y = 55;
    pdf.setTextColor(...text);
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    pdf.text("Codice certificato", 18, y);
    y += 10;
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text(String(certificate.public_code), 18, y);

    y += 16;
    pdf.setFillColor(...pale);
    pdf.roundedRect(16, y - 6, pageWidth - 32, 58, 6, 6, "F");
    pdf.setTextColor(...text);
    pdf.setFontSize(11);
    pdf.setFont("helvetica", "bold");
    pdf.text("DATI DEL VEICOLO", 22, y + 4);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const details = [
      ["Veicolo", [certificate.vehicle_make, certificate.vehicle_model].filter(Boolean).join(" ") || "Non indicato"],
      ["Anno", String(certificate.vehicle_year ?? "Non indicato")],
      ["Targa", String(certificate.vehicle_plate)],
      ["VIN / Telaio", String(certificate.vehicle_vin)],
      ["Chilometraggio", `${Number(certificate.vehicle_mileage).toLocaleString("it-IT")} km`],
      ["Officina", workshop?.name ?? "Officina VeriDrive"],
    ];
    let rowY = y + 13;
    for (let i = 0; i < details.length; i++) {
      const [label, value] = details[i];
      const colX = i % 2 === 0 ? 22 : pageWidth / 2 + 2;
      const currentY = rowY + Math.floor(i / 2) * 12;
      pdf.setTextColor(...muted);
      pdf.setFontSize(8);
      pdf.text(label, colX, currentY);
      pdf.setTextColor(...text);
      pdf.setFontSize(10);
      pdf.setFont("helvetica", "bold");
      pdf.text(String(value), colX, currentY + 5, { maxWidth: 74 });
      pdf.setFont("helvetica", "normal");
    }

    y += 70;
    pdf.setFillColor(...cyan);
    pdf.roundedRect(16, y, pageWidth - 32, 14, 5, 5, "F");
    pdf.setTextColor(7, 35, 65);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text(isPlus ? "VERISCORE PLUS · DOCUMENTAZIONE FOTOGRAFICA" : "VERIFICA CERTIFICATA VERIDRIVE", 22, y + 9);

    y += 25;
    pdf.setTextColor(...text);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    const description = isPlus
      ? "Il presente certificato include la verifica tecnica e la documentazione fotografica raccolta dall'officina nell'ambito della Verifica Plus."
      : "Il presente documento certifica il risultato della verifica tecnica effettuata dall'officina aderente a VeriDrive.";
    pdf.text(fitText(pdf, description, pageWidth - 44, 10), 22, y);

    y += 20;
    pdf.setTextColor(...muted);
    pdf.setFontSize(9);
    pdf.text(`Data emissione: ${new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(certificate.issued_at))}`, 22, y);

    if (isPlus) {
      y += 14;
      pdf.setTextColor(...text);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(12);
      pdf.text("Foto documentazione", 22, y);
      y += 7;
      const photoRows = (photos ?? []).slice(0, 10);
      const cellW = 38;
      const cellH = 31;
      const gap = 5;
      for (let i = 0; i < photoRows.length; i++) {
        const col = i % 4;
        const row = Math.floor(i / 4);
        const x = 20 + col * (cellW + gap);
        const py = y + row * (cellH + 8);
        pdf.setFillColor(246, 249, 255);
        pdf.roundedRect(x, py, cellW, cellH, 3, 3, "F");
        const path = String((photoRows[i] as Record<string, unknown>).storage_path ?? "");
        const { data: signed } = path ? await db.storage.from("inspection-photos").createSignedUrl(path, 300) : { data: null };
        const imageData = signed?.signedUrl ? await fetchImageData(signed.signedUrl) : null;
        if (imageData) {
          pdf.addImage(imageData, "JPEG", x + 1, py + 1, cellW - 2, cellH - 2, undefined, "FAST");
        } else {
          pdf.setTextColor(...muted);
          pdf.setFontSize(7);
          pdf.text("Foto non disponibile", x + 5, py + cellH / 2);
        }
        pdf.setTextColor(...text);
        pdf.setFontSize(7);
        const checkId = (photoRows[i] as Record<string, unknown>).check_id;
        pdf.text(checkId ? `Controllo ${checkId}` : `Foto ${i + 1}`, x + 2, py + cellH + 5);
      }
      y += Math.ceil(photoRows.length / 4) * (cellH + 8) + 7;
    }

    if (y < pageHeight - 48) {
      pdf.setFillColor(...navy);
      pdf.roundedRect(16, pageHeight - 42, pageWidth - 32, 25, 6, 6, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(9);
      pdf.text("VERIFICA PUBBLICA", 22, pageHeight - 31);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(8);
      pdf.text(`Cerca il codice ${certificate.public_code} su veridrive.it/verifica`, 22, pageHeight - 24);
    }

    const bytes = pdf.output("arraybuffer");
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${certificate.public_code}${isPlus ? "-PLUS" : ""}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("CUSTOMER_CERTIFICATE_PDF_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossibile generare il certificato." }, { status: 500 });
  }
}
