import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function scoreTheme(score: number) {
  if (score >= 90) return { main: "#2E8B57", pale: "#EAF6EF", label: "ECCELLENTE" };
  if (score >= 75) return { main: "#3D8B5A", pale: "#ECF7F0", label: "OTTIMO" };
  if (score >= 60) return { main: "#B57A22", pale: "#FBF3DF", label: "BUONO" };
  if (score >= 40) return { main: "#D46B27", pale: "#FFF0E5", label: "SUFFICIENTE" };
  return { main: "#BF3B3B", pale: "#FAE9E9", label: "CRITICITÀ" };
}
function drawGauge(pdf: jsPDF, cx: number, cy: number, score: number) {
  const s = Math.max(0, Math.min(100, score));
  const t = scoreTheme(s), main = rgb(t.main), track = rgb("#DDE6EF"), r = 27;
  pdf.setDrawColor(...track); pdf.setLineWidth(7); pdf.circle(cx, cy, r, "S");
  pdf.setDrawColor(...main); pdf.setLineWidth(7);
  const steps = Math.max(1, Math.ceil(90 * s / 100));
  for (let i = 0; i < steps; i++) {
    const a1 = -Math.PI / 2 + Math.PI * 2 * i / 90;
    const a2 = Math.min(-Math.PI / 2 + Math.PI * 2 * s / 100, -Math.PI / 2 + Math.PI * 2 * (i + 0.76) / 90);
    pdf.line(cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2));
  }
  pdf.setFillColor(255, 255, 255); pdf.circle(cx, cy, 18, "F");
  pdf.setTextColor(...rgb("#24405F")); pdf.setFont("helvetica", "bold"); pdf.setFontSize(24); pdf.text(String(s), cx, cy + 3, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.8); pdf.setTextColor(...rgb("#64748B")); pdf.text("VERISCORE", cx, cy + 11, { align: "center" });
}
function getChecklist(value: unknown) {
  try { const p = typeof value === "string" ? JSON.parse(value) : value; return Array.isArray(p?.checklist) ? p.checklist : []; } catch { return []; }
}
function groupsOf(checklist: unknown) {
  const out = new Map<string, { ok: number; total: number }>();
  for (const r of Array.isArray(checklist) ? checklist : []) {
    const i = r as { area?: string; result?: string | null };
    const area = i.area || "Altro"; const g = out.get(area) || { ok: 0, total: 0 };
    g.total++; if (i.result === "ok") g.ok++; out.set(area, g);
  }
  return [...out.entries()].map(([area, g]) => ({ area, ...g, pct: g.total ? Math.round(g.ok / g.total * 100) : 0 }));
}
async function imageData(db: ReturnType<typeof createServiceClient>, path: string): Promise<{ data: string; format: "PNG" | "JPEG" } | null> {
  if (!path) return null;
  const { data: signed, error: signError } = await db.storage.from("inspection-photos").createSignedUrl(path, 180);
  if (signError || !signed?.signedUrl) return null;
  const response = await fetch(signed.signedUrl, { cache: "no-store" });
  if (!response.ok) return null;
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > 320_000) return null;
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const format: "PNG" | "JPEG" = contentType.includes("png") ? "PNG" : "JPEG";
  return { data: `data:${contentType};base64,${btoa(binary)}`, format };
}
function addImageContain(pdf: jsPDF, data: { data: string; format: "JPEG" | "PNG" }, x: number, y: number, w: number, h: number) {
  const props = pdf.getImageProperties(data.data);
  const scale = Math.min(w / props.width, h / props.height);
  const drawW = props.width * scale, drawH = props.height * scale;
  const drawX = x + (w - drawW) / 2, drawY = y + (h - drawH) / 2;
  pdf.addImage(data.data, data.format, drawX, drawY, drawW, drawH, undefined, "FAST");
}
function sectionHeader(pdf: jsPDF, W: number, title: string, subtitle?: string) {
  const header = rgb("#244A73");
  pdf.setFillColor(...header); pdf.rect(0, 0, W, 30, "F");
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(23); pdf.text("VeriDrive", 16, 15);
  if (subtitle) { pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.text(subtitle, 16, 24); }
  pdf.setTextColor(...rgb("#24405F")); pdf.setFont("helvetica", "bold"); pdf.setFontSize(22); pdf.text(title, 16, 45);
}
function drawFooter(pdf: jsPDF, W: number, H: number, code: string, pageLabel: string) {
  pdf.setFillColor(...rgb("#244A73")); pdf.roundedRect(16, H - 15, W - 32, 7, 2.5, 2.5, "F");
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.8);
  pdf.text(`veridrive.it/verifica/${code}`, 21, H - 10.2); pdf.text(pageLabel, W - 21, H - 10.2, { align: "right" });
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
    const { data: certificate, error: ce } = await db.from("veriscore_certificates").select("id,booking_id,public_code,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,veriscore,workshop_id,issued_at").eq("id", id).maybeSingle();
    if (ce) return NextResponse.json({ error: ce.message }, { status: 500 });
    if (!certificate) return NextResponse.json({ error: "Certificato non trovato." }, { status: 404 });
    const { data: booking } = await db.from("bookings").select("id,customer_id,service,overall_notes").eq("id", certificate.booking_id).eq("customer_id", customer.id).maybeSingle();
    if (!booking) return NextResponse.json({ error: "Certificato non associato al cliente." }, { status: 404 });
    const { data: workshop } = await db.from("workshops").select("name,city,postal_code").eq("id", certificate.workshop_id).maybeSingle();
    const plus = booking.service === "veriscore_plus";
    const groups = groupsOf(getChecklist(booking.overall_notes));
    let photos: Array<{ id: string; storage_path: string; caption?: string | null; check_id?: number | null; created_at?: string }> = [];
    if (plus) {
      const { data: inspection } = await db.from("inspections").select("id").eq("booking_id", certificate.booking_id).maybeSingle();
      if (inspection?.id) {
        const { data } = await db.from("photos").select("id,storage_path,caption,check_id,created_at").eq("inspection_id", inspection.id).order("created_at", { ascending: true }).limit(10);
        photos = data ?? [];
      }
    }

    const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
    const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
    const text = rgb("#24405F"), muted = rgb("#64748B"), border = rgb("#D9E3ED"), pale = rgb("#F7FAFC"), header = rgb("#244A73"), accent = rgb("#3E78B9");
    const score = Number(certificate.veriscore), st = scoreTheme(score), code = String(certificate.public_code);
    const date = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(certificate.issued_at));

    // PAGE 1 — hero certificate
    pdf.setFillColor(...header); pdf.rect(0, 0, W, 39, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(29); pdf.text("VeriDrive", 16, 17);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9.2); pdf.text(plus ? "CERTIFICATO VERISCORE PLUS" : "CERTIFICATO VERISCORE", 16, 27);
    pdf.setFillColor(...rgb(st.pale)); pdf.roundedRect(W - 73, 6, 57, 26, 6, 6, "F");
    pdf.setTextColor(...rgb(st.main)); pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.text(`${score}/100`, W - 44.5, 17, { align: "center" });
    pdf.setFontSize(6); pdf.text("VALUTAZIONE", W - 44.5, 25, { align: "center" });

    pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.text("CERTIFICATO UFFICIALE", 16, 52);
    pdf.setTextColor(...text); pdf.setFontSize(27); pdf.text(code, 16, 66);

    pdf.setFillColor(...pale); pdf.roundedRect(16, 77, W - 32, 66, 8, 8, "F"); pdf.setDrawColor(...border); pdf.setLineWidth(0.6); pdf.roundedRect(16, 77, W - 32, 66, 8, 8, "S");
    pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(15); pdf.text("DATI DEL VEICOLO", 23, 91);
    const d = [
      ["VEICOLO", [certificate.vehicle_make, certificate.vehicle_model].filter(Boolean).join(" ") || "Non indicato"],
      ["ANNO", String(certificate.vehicle_year ?? "Non indicato")],
      ["TARGA", String(certificate.vehicle_plate)],
      ["VIN / TELAIO", String(certificate.vehicle_vin)],
      ["CHILOMETRAGGIO", `${Number(certificate.vehicle_mileage).toLocaleString("it-IT")} km`],
      ["OFFICINA", workshop?.name ?? "Officina VeriDrive"],
    ];
    d.forEach(([label, value], i) => {
      const x = i % 2 === 0 ? 23 : W / 2 + 2, yy = 103 + Math.floor(i / 2) * 13;
      pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.8); pdf.text(label, x, yy);
      pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12.2); pdf.text(String(value), x, yy + 5.7, { maxWidth: 72 });
    });

    pdf.setFillColor(...accent); pdf.roundedRect(16, 152, W - 32, 12, 4, 4, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.8); pdf.text(plus ? "VERISCORE PLUS · VERIFICA + DOCUMENTAZIONE" : "VERIFICA TECNICA CERTIFICATA", 22, 160);
    pdf.setTextColor(...text); pdf.setFont("helvetica", "normal"); pdf.setFontSize(11.5);
    const desc = pdf.splitTextToSize(plus ? "Verifica tecnica completa con documentazione fotografica raccolta dall'officina." : "Risultato della verifica tecnica eseguita dall'officina aderente a VeriDrive.", W - 44); pdf.text(desc, 22, 174);
    pdf.setTextColor(...muted); pdf.setFontSize(10); pdf.text(`Data emissione: ${date}`, 22, 192);

    drawGauge(pdf, 53, 230, score);
    pdf.setTextColor(...rgb(st.main)); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.text(st.label, 53, 267, { align: "center" });
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.text("Indice sintetico", 53, 276, { align: "center" });
    const qr = await QRCode.toDataURL(`${process.env.NEXT_PUBLIC_APP_URL || "https://veridrive.it"}/verifica/${encodeURIComponent(code)}`, { margin: 1, width: 192 });
    pdf.addImage(qr, "PNG", W - 60, 212, 34, 34, undefined, "FAST");
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.text("VERIFICA ONLINE", W - 43, 252, { align: "center" });
    drawFooter(pdf, W, H, code, `1 / ${plus ? 7 : 2}`);

    // PAGE 2 — result and category scores
    pdf.addPage();
    sectionHeader(pdf, W, "Risultato della verifica", plus ? "VERISCORE PLUS · SCHEDA TECNICA" : "VERISCORE · SCHEDA TECNICA");
    pdf.setFillColor(...rgb(st.pale)); pdf.roundedRect(16, 56, W - 32, 34, 8, 8, "F");
    pdf.setTextColor(...rgb(st.main)); pdf.setFont("helvetica", "bold"); pdf.setFontSize(27); pdf.text(`${score}/100`, 27, 79);
    pdf.setTextColor(...text); pdf.setFontSize(14); pdf.text(st.label, 84, 70);
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9.5); pdf.text("Valutazione sintetica dei 50 controlli tecnici.", 84, 79);

    let y = 105;
    for (const g of groups.slice(0, 6)) {
      const t = scoreTheme(g.pct), main = rgb(t.main);
      pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11.5); pdf.text(g.area, 21, y);
      pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10.5); pdf.text(`${g.ok}/${g.total}`, W - 51, y);
      pdf.setTextColor(...main); pdf.text(`${g.pct}%`, W - 23, y);
      pdf.setFillColor(...rgb("#E5ECF3")); pdf.roundedRect(21, y + 5, W - 42, 8, 4, 4, "F");
      const barW = Math.max(0, (W - 42) * g.pct / 100); if (barW > 0) { pdf.setFillColor(...main); pdf.roundedRect(21, y + 5, barW, 8, 4, 4, "F"); }
      y += 28;
    }
    pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12.5); pdf.text("Note", 21, Math.min(y + 3, H - 40));
    const noteRaw = (() => { try { const p = typeof booking.overall_notes === "string" ? JSON.parse(booking.overall_notes) : booking.overall_notes; return String(p?.checklist_notes ?? "").trim(); } catch { return ""; } })();
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9.5); const noteLines = pdf.splitTextToSize(noteRaw || "Nessuna nota aggiuntiva.", W - 44); pdf.text(noteLines.slice(0, 3), 21, Math.min(y + 13, H - 30));
    drawFooter(pdf, W, H, code, `2 / ${plus ? 7 : 2}`);

    if (plus) {
      const photoList = photos.slice(0, 10);
      for (let pageIndex = 0; pageIndex < 5; pageIndex++) {
        pdf.addPage();
        sectionHeader(pdf, W, `Documentazione fotografica · ${pageIndex + 1}/5`, "VERISCORE PLUS · FOTO DEL VEICOLO");
        for (let j = 0; j < 2; j++) {
          const idx = pageIndex * 2 + j, x = 16, py = 54 + j * 109, boxW = W - 32, boxH = 100;
          pdf.setFillColor(...pale); pdf.roundedRect(x, py, boxW, boxH, 7, 7, "F"); pdf.setDrawColor(...border); pdf.setLineWidth(0.6); pdf.roundedRect(x, py, boxW, boxH, 7, 7, "S");
          const photo = photoList[idx];
          if (photo) {
            try {
              const im = await imageData(db, String(photo.storage_path ?? ""));
              if (im) addImageContain(pdf, im, x + 4, py + 4, boxW - 8, boxH - 18);
              else { pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text("Immagine non disponibile", x + boxW / 2, py + boxH / 2, { align: "center" }); }
            } catch {
              pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text("Immagine non disponibile", x + boxW / 2, py + boxH / 2, { align: "center" });
            }
          } else {
            pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text("Foto non disponibile", x + boxW / 2, py + boxH / 2, { align: "center" });
          }
          pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.text(`FOTO ${idx + 1}`, x + 5, py + boxH - 6);
        }
        drawFooter(pdf, W, H, code, `${pageIndex + 3} / 7`);
      }
    }

    const bytes = pdf.output("arraybuffer");
    return new NextResponse(bytes, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${code}${plus ? "-PLUS" : ""}.pdf"`, "Cache-Control": "private,no-store" } });
  } catch (error) {
    console.error("CUSTOMER_CERTIFICATE_PDF_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossibile generare il certificato." }, { status: 500 });
  }
}
