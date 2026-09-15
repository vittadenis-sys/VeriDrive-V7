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
  if (score >= 80) return { main: "#16834b", pale: "#e9f8f0", label: "OTTIMO" };
  if (score >= 60) return { main: "#b7791f", pale: "#fbf4dd", label: "BUONO" };
  return { main: "#bf3b3b", pale: "#fae9e9", label: "CRITICITÀ" };
}
function drawGauge(pdf: jsPDF, cx: number, cy: number, score: number) {
  const t = scoreTheme(score), m = rgb(t.main), p = rgb(t.pale), r = 18;
  pdf.setFillColor(...p); pdf.circle(cx, cy, r, "F");
  pdf.setDrawColor(214, 222, 232); pdf.setLineWidth(3); pdf.circle(cx, cy, r - 2, "S");
  pdf.setDrawColor(...m);
  const end = -Math.PI / 2 + Math.PI * 2 * score / 100;
  const steps = Math.ceil(32 * score / 100);
  for (let i = 0; i < steps; i++) {
    const a1 = -Math.PI / 2 + Math.PI * 2 * i / 32;
    const a2 = Math.min(end, -Math.PI / 2 + Math.PI * 2 * (i + 0.65) / 32);
    if (a2 <= a1) continue;
    pdf.setLineWidth(2.1);
    pdf.line(cx + (r - 2) * Math.cos(a1), cy + (r - 2) * Math.sin(a1), cx + (r - 2) * Math.cos(a2), cy + (r - 2) * Math.sin(a2));
  }
  pdf.setFillColor(255, 255, 255); pdf.circle(cx, cy, r - 7, "F");
  pdf.setTextColor(...rgb("#17233c")); pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.text(String(score), cx, cy + 2, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6); pdf.text("VERISCORE", cx, cy + 8, { align: "center" });
  pdf.setTextColor(...m); pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.5); pdf.text(t.label, cx, cy + r + 8, { align: "center" });
}
function getChecklist(value: unknown) {
  try { const p = typeof value === "string" ? JSON.parse(value) : value; return Array.isArray(p?.checklist) ? p.checklist : []; } catch { return []; }
}
function groupsOf(checklist: unknown) {
  const out = new Map<string, { ok: number; total: number }>();
  for (const r of Array.isArray(checklist) ? checklist : []) {
    const i = r as { area?: string; result?: string | null };
    const a = i.area || "Altro"; const g = out.get(a) || { ok: 0, total: 0 };
    g.total++; if (i.result === "ok") g.ok++; out.set(a, g);
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
  const maxBytes = 320_000;
  if (bytes.byteLength > maxBytes) return null;
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
  const drawW = props.width * scale;
  const drawH = props.height * scale;
  const drawX = x + (w - drawW) / 2;
  const drawY = y + (h - drawH) / 2;
  pdf.addImage(data.data, data.format, drawX, drawY, drawW, drawH, undefined, "FAST");
}
function sectionHeader(pdf: jsPDF, W: number, title: string, subtitle?: string) {
  pdf.setFillColor(...rgb("#10233f")); pdf.rect(0, 0, W, 25, "F");
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(20); pdf.text("VeriDrive", 16, 12);
  if (subtitle) { pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.5); pdf.text(subtitle, 16, 19); }
  pdf.setTextColor(...rgb("#17233c")); pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.text(title, 16, 39);
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
    const navy = rgb("#10233f"), blue = rgb("#2e5fbe"), text = rgb("#17233c"), muted = rgb("#66758a"), border = rgb("#d8e0ea"), pale = rgb("#f5f8fb");
    const st = scoreTheme(Number(certificate.veriscore));

    pdf.setFillColor(...navy); pdf.rect(0, 0, W, 32, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(25); pdf.text("VeriDrive", 16, 15);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(205, 219, 239); pdf.text(plus ? "VERISCORE PLUS" : "VERISCORE", 16, 23);
    pdf.setFillColor(...rgb(st.pale)); pdf.roundedRect(W - 68, 6, 52, 20, 5, 5, "F");
    pdf.setTextColor(...rgb(st.main)); pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.text(`${certificate.veriscore}/100`, W - 42, 15, { align: "center" });
    pdf.setFontSize(5.5); pdf.text("VERISCORE", W - 42, 21, { align: "center" });
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.text("CERTIFICATO UFFICIALE", 16, 43);
    pdf.setTextColor(...text); pdf.setFontSize(20); pdf.text(String(certificate.public_code), 16, 54);
    pdf.setFillColor(...pale); pdf.roundedRect(16, 64, W - 32, 53, 7, 7, "F"); pdf.setDrawColor(...border); pdf.setLineWidth(0.5); pdf.roundedRect(16, 64, W - 32, 53, 7, 7, "S");
    pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10.5); pdf.text("DATI DEL VEICOLO", 22, 74);
    const d = [["VEICOLO", [certificate.vehicle_make, certificate.vehicle_model].filter(Boolean).join(" ") || "Non indicato"], ["ANNO", String(certificate.vehicle_year ?? "Non indicato")], ["TARGA", String(certificate.vehicle_plate)], ["VIN / TELAIO", String(certificate.vehicle_vin)], ["CHILOMETRAGGIO", `${Number(certificate.vehicle_mileage).toLocaleString("it-IT")} km`], ["OFFICINA", workshop?.name ?? "Officina VeriDrive"]];
    d.forEach(([label, value], i) => { const x = i % 2 === 0 ? 22 : W / 2 + 1, yy = 83 + Math.floor(i / 2) * 10.5; pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.8); pdf.text(label, x, yy); pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9.2); pdf.text(value, x, yy + 4.2, { maxWidth: 72 }); });
    pdf.setFillColor(...blue); pdf.roundedRect(16, 126, W - 32, 11, 4, 4, "F"); pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.2); pdf.text(plus ? "VERISCORE PLUS · VERIFICA + DOCUMENTAZIONE" : "VERIFICA TECNICA CERTIFICATA", 21, 133.4);
    pdf.setTextColor(...text); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); const desc = pdf.splitTextToSize(plus ? "Certificato con verifica tecnica completa e documentazione fotografica raccolta dall'officina." : "Certificato del risultato della verifica tecnica eseguita dall'officina aderente a VeriDrive.", W - 42); pdf.text(desc, 21, 147);
    pdf.setTextColor(...muted); pdf.setFontSize(8); pdf.text(`Data emissione: ${new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(certificate.issued_at))}`, 21, 160);
    drawGauge(pdf, 42, 181, Number(certificate.veriscore));
    pdf.setTextColor(...muted); pdf.setFontSize(7); pdf.text("Indice sintetico", 42, 209, { align: "center" });
    const qr = await QRCode.toDataURL(`${process.env.NEXT_PUBLIC_APP_URL || "https://veridrive.it"}/verifica/${encodeURIComponent(String(certificate.public_code))}`, { margin: 1, width: 176 });
    pdf.addImage(qr, "PNG", W - 49, 173, 28, 28, undefined, "FAST");
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(6); pdf.text("SCANSIONA", W - 35, 206, { align: "center" });
    pdf.setFillColor(...navy); pdf.roundedRect(16, H - 17, W - 32, 9, 3, 3, "F"); pdf.setTextColor(255, 255, 255); pdf.setFontSize(6.4); pdf.text(`veridrive.it/verifica/${certificate.public_code}`, 21, H - 11);

    pdf.addPage();
    sectionHeader(pdf, W, "Punteggi per area", plus ? "VERISCORE PLUS · SCHEDA TECNICA" : "VERISCORE · SCHEDA TECNICA");
    let y = 50;
    for (const g of groups.slice(0, 6)) {
      const t = scoreTheme(g.pct), main = rgb(t.main), bg = rgb(t.pale);
      pdf.setFillColor(...bg); pdf.roundedRect(16, y, W - 32, 14, 4, 4, "F");
      pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.text(g.area, 21, y + 9);
      pdf.text(`${g.ok}/${g.total}`, W - 49, y + 9);
      pdf.setTextColor(...main); pdf.text(`${g.pct}%`, W - 24, y + 9);
      y += 18;
    }
    pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.text("Esito della verifica", 16, Math.min(y + 9, H - 37));
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.text(plus ? "Documentazione fotografica nelle pagine successive." : "Il certificato riassume il risultato dei 50 controlli tecnici eseguiti dall'officina.", 16, Math.min(y + 18, H - 28));

    if (plus) {
      const photoList = photos.slice(0, 10);
      for (let pageIndex = 0; pageIndex < 5; pageIndex++) {
        pdf.addPage();
        sectionHeader(pdf, W, `Documentazione fotografica · ${pageIndex + 1}/5`, "VERISCORE PLUS · FOTO DEL VEICOLO");
        const start = pageIndex * 2;
        for (let j = 0; j < 2; j++) {
          const idx = start + j;
          const x = 16, py = 50 + j * 106, boxW = W - 32, boxH = 96;
          pdf.setFillColor(...pale); pdf.roundedRect(x, py, boxW, boxH, 6, 6, "F"); pdf.setDrawColor(...border); pdf.setLineWidth(0.6); pdf.roundedRect(x, py, boxW, boxH, 6, 6, "S");
          if (photoList[idx]) {
            try {
              const im = await imageData(db, String(photoList[idx].storage_path ?? ""));
              if (im) addImageContain(pdf, im, x + 3, py + 3, boxW - 6, boxH - 15);
              else { pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.text("Immagine non disponibile", x + boxW / 2, py + boxH / 2, { align: "center" }); }
            } catch {
              pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.text("Immagine non disponibile", x + boxW / 2, py + boxH / 2, { align: "center" });
            }
          } else {
            pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.text("Foto non disponibile", x + boxW / 2, py + boxH / 2, { align: "center" });
          }
          pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.text(`FOTO ${idx + 1}`, x + 5, py + boxH - 6);
        }
      }
    }

    const bytes = pdf.output("arraybuffer");
    return new NextResponse(bytes, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${certificate.public_code}${plus ? "-PLUS" : ""}.pdf"`, "Cache-Control": "private,no-store" } });
  } catch (error) {
    console.error("CUSTOMER_CERTIFICATE_PDF_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossibile generare il certificato." }, { status: 500 });
  }
}
