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
function drawScoreRing(pdf: jsPDF, cx: number, cy: number, score: number, showLabel = true, radius = 29) {
  const s = Math.max(0, Math.min(100, score));
  const t = scoreTheme(s), main = rgb(t.main), track = rgb("#DDE6EF"), r = radius;
  const lineWidth = r > 24 ? 7.2 : 5.8;
  pdf.setDrawColor(...track); pdf.setLineWidth(lineWidth); pdf.circle(cx, cy, r, "S");
  pdf.setDrawColor(...main); pdf.setLineWidth(lineWidth);
  const start = -Math.PI / 2;
  const end = start + Math.PI * 2 * s / 100;
  const segments = 120;
  for (let i = 0; i < segments; i++) {
    const a1 = start + Math.PI * 2 * i / segments;
    const a2 = Math.min(end, start + Math.PI * 2 * (i + 1) / segments);
    if (a2 <= a1) continue;
    pdf.line(cx + r * Math.cos(a1), cy + r * Math.sin(a1), cx + r * Math.cos(a2), cy + r * Math.sin(a2));
  }
  pdf.setFillColor(255, 255, 255); pdf.circle(cx, cy, Math.max(14, r - 8), "F");
  pdf.setTextColor(...rgb("#173B6D")); pdf.setFont("helvetica", "bold"); pdf.setFontSize(r > 24 ? 25 : 21); pdf.text(String(s), cx, cy + 4, { align: "center" });
  pdf.setTextColor(...rgb("#64748B")); pdf.setFont("helvetica", "bold"); pdf.setFontSize(r > 24 ? 7.2 : 6.5); pdf.text("VERISCORE", cx, cy + 12, { align: "center" });
  if (showLabel) {
    pdf.setTextColor(...main); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.text(t.label, cx, cy + r + 8, { align: "center" });
  }
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
  const header = rgb("#3A628D");
  pdf.setFillColor(...header); pdf.rect(0, 0, W, 30, "F");
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(24); pdf.text("VeriDrive", 18, 15);
  if (subtitle) { pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text(subtitle, 18, 24); }
  pdf.setTextColor(...rgb("#24405F")); pdf.setFont("helvetica", "bold"); pdf.setFontSize(25); pdf.text(title, 18, 46);
}
function drawFooter(pdf: jsPDF, W: number, H: number, code: string, pageLabel: string) {
  pdf.setFillColor(...rgb("#3A628D")); pdf.roundedRect(18, H - 15, W - 36, 7, 2.5, 2.5, "F");
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.8);
  pdf.text(`veridrive.it/verifica/${code}`, 23, H - 10.2); pdf.text(pageLabel, W - 23, H - 10.2, { align: "right" });
}
function extractNotes(value: unknown): string {
  if (typeof value === "object" && value) {
    const v = value as { checklist_notes?: unknown };
    return typeof v.checklist_notes === "string" ? v.checklist_notes.trim() : "";
  }
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const parsed = JSON.parse(value) as { checklist_notes?: unknown };
    return typeof parsed?.checklist_notes === "string" ? parsed.checklist_notes.trim() : "";
  } catch { return ""; }
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
    const text = rgb("#173B6D"), muted = rgb("#5D7188"), border = rgb("#D5DFEA"), pale = rgb("#F6F9FC"), header = rgb("#3A628D"), accent = rgb("#4E86BE");
    const score = Number(certificate.veriscore), st = scoreTheme(score), code = String(certificate.public_code);
    const date = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(certificate.issued_at));

    pdf.setFillColor(...header); pdf.rect(0, 0, W, 42, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(36); pdf.text("VeriDrive", 16, 20);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(11); pdf.text(plus ? "CERTIFICATO VERISCORE PLUS" : "CERTIFICATO VERISCORE", 16, 31);
    pdf.setFillColor(...rgb(st.pale)); pdf.roundedRect(W - 78, 6, 62, 30, 7, 7, "F");
    pdf.setTextColor(...rgb(st.main)); pdf.setFont("helvetica", "bold"); pdf.setFontSize(22); pdf.text(`${score}/100`, W - 47, 19, { align: "center" });
    pdf.setFontSize(7.5); pdf.text("VALUTAZIONE", W - 47, 28, { align: "center" });

    pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11.5); pdf.text("CERTIFICATO UFFICIALE", 16, 56);
    pdf.setTextColor(...text); pdf.setFontSize(34); pdf.text(code, 16, 72);
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10.5); pdf.text(`Data emissione: ${date}`, 16, 82);

    pdf.setFillColor(...pale); pdf.roundedRect(16, 92, W - 32, 74, 8, 8, "F"); pdf.setDrawColor(...border); pdf.setLineWidth(0.7); pdf.roundedRect(16, 92, W - 32, 74, 8, 8, "S");
    pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(16); pdf.text("DATI DEL VEICOLO", 23, 108);
    const d = [
      ["MARCA E MODELLO", [certificate.vehicle_make, certificate.vehicle_model].filter(Boolean).join(" ") || "Non indicato"],
      ["ANNO", String(certificate.vehicle_year ?? "Non indicato")],
      ["TARGA", String(certificate.vehicle_plate)],
      ["VIN / TELAIO", String(certificate.vehicle_vin)],
      ["CHILOMETRAGGIO", `${Number(certificate.vehicle_mileage).toLocaleString("it-IT")} km`],
      ["OFFICINA", workshop?.name ?? "Officina VeriDrive"],
    ];
    d.forEach(([label, value], i) => {
      const x = i % 2 === 0 ? 23 : W / 2 + 3, yy = 122 + Math.floor(i / 2) * 15;
      pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.text(label, x, yy);
      pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(14.5); pdf.text(String(value), x, yy + 6.5, { maxWidth: 70 });
    });

    pdf.setFillColor(...accent); pdf.roundedRect(16, 175, W - 32, 13, 4, 4, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9.7); pdf.text(plus ? "VERISCORE PLUS · VERIFICA + DOCUMENTAZIONE" : "VERIFICA TECNICA CERTIFICATA", 22, 184);
    pdf.setTextColor(...text); pdf.setFont("helvetica", "normal"); pdf.setFontSize(12.5);
    const desc = pdf.splitTextToSize(plus ? "Verifica tecnica completa con documentazione fotografica raccolta dall'officina." : "Risultato della verifica tecnica eseguita dall'officina aderente a VeriDrive.", W - 44); pdf.text(desc, 22, 199);

    const scoreCard = { x: 20, y: 207, w: 82, h: 67 };
    pdf.setFillColor(255,255,255); pdf.roundedRect(scoreCard.x, scoreCard.y, scoreCard.w, scoreCard.h, 8, 8, "F");
    pdf.setDrawColor(...border); pdf.setLineWidth(0.6); pdf.roundedRect(scoreCard.x, scoreCard.y, scoreCard.w, scoreCard.h, 8, 8, "S");
    pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.text("VERISCORE", scoreCard.x + scoreCard.w/2, 218, { align: "center" });
    drawScoreRing(pdf, 61, 240, score, false, 24);
    pdf.setTextColor(...rgb(st.main)); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9.5); pdf.text(st.label, 61, 267, { align: "center" });
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.5); pdf.text("Indice sintetico", 61, 272, { align: "center" });

    const publicCard = { x: 108, y: 207, w: W - 128, h: 67 };
    pdf.setFillColor(255,255,255); pdf.roundedRect(publicCard.x, publicCard.y, publicCard.w, publicCard.h, 8, 8, "F");
    pdf.setDrawColor(...border); pdf.setLineWidth(0.6); pdf.roundedRect(publicCard.x, publicCard.y, publicCard.w, publicCard.h, 8, 8, "S");
    pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10.5); pdf.text("VERIFICA PUBBLICA", 115, 218);
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.2); pdf.text("Scansiona il QR per verificare", 115, 225); pdf.text("l'autenticità del certificato", 115, 231);
    const qr = await QRCode.toDataURL(`${process.env.NEXT_PUBLIC_APP_URL || "https://veridrive.it"}/verifica/${encodeURIComponent(code)}`, { margin: 1, width: 208 });
    pdf.addImage(qr, "PNG", 152, 215, 39, 39, undefined, "FAST");
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.text("VERIFICA ONLINE", 171.5, 259, { align: "center" });
    drawFooter(pdf, W, H, code, `1 / ${plus ? 7 : 2}`);

    pdf.addPage();
    sectionHeader(pdf, W, "Risultato della verifica", plus ? "VERISCORE PLUS · SCHEDA TECNICA" : "VERISCORE · SCHEDA TECNICA");
    const summaryCard = { x: 18, y: 56, w: W - 36, h: 64 };
    pdf.setFillColor(...pale); pdf.roundedRect(summaryCard.x, summaryCard.y, summaryCard.w, summaryCard.h, 8, 8, "F");
    pdf.setDrawColor(...border); pdf.setLineWidth(0.6); pdf.roundedRect(summaryCard.x, summaryCard.y, summaryCard.w, summaryCard.h, 8, 8, "S");
    drawScoreRing(pdf, 62, 88, score, false, 23);
    pdf.setTextColor(...rgb(st.main)); pdf.setFont("helvetica", "bold"); pdf.setFontSize(17); pdf.text(st.label, 108, 82);
    pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(17); pdf.text(`${score}/100`, 108, 98);
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text("Valutazione complessiva dei 50 controlli", 108, 109);

    let y = 132;
    for (const g of groups.slice(0, 5)) {
      const t = scoreTheme(g.pct), main = rgb(t.main);
      pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(14.5); pdf.text(g.area, 18, y);
      pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11.5); pdf.text(`${g.ok}/${g.total}`, W - 45, y, { align: "right" });
      pdf.setTextColor(...main); pdf.setFont("helvetica", "bold"); pdf.setFontSize(14.5); pdf.text(`${g.pct}%`, W - 18, y, { align: "right" });
      pdf.setFillColor(...rgb("#E5EAF0")); pdf.roundedRect(18, y + 6, W - 36, 7.5, 3.75, 3.75, "F");
      pdf.setFillColor(...main); pdf.roundedRect(18, y + 6, Math.max(7.5, (W - 36) * g.pct / 100), 7.5, 3.75, 3.75, "F");
      y += 21;
    }

    const notesY = 242;
    pdf.setFillColor(...pale); pdf.roundedRect(18, notesY, W - 36, 34, 6, 6, "F");
    pdf.setDrawColor(...border); pdf.setLineWidth(0.6); pdf.roundedRect(18, notesY, W - 36, 34, 6, 6, "S");
    pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.text("Note tecniche", 24, notesY + 9);
    const noteText = extractNotes(booking.overall_notes) || "Nessuna nota aggiuntiva.";
    let noteFont = 11;
    let noteLines = pdf.splitTextToSize(noteText, W - 48);
    while (noteLines.length > 3 && noteFont > 8.5) {
      noteFont -= 0.5;
      pdf.setFontSize(noteFont);
      noteLines = pdf.splitTextToSize(noteText, W - 48);
    }
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(noteFont); pdf.text(noteLines.slice(0, 3), 24, notesY + 18);
    drawFooter(pdf, W, H, code, `2 / ${plus ? 7 : 2}`);

    if (plus) {
      const photoList = photos.slice(0, 10);
      for (let pageIndex = 0; pageIndex < 5; pageIndex++) {
        pdf.addPage();
        sectionHeader(pdf, W, `Documentazione fotografica · ${pageIndex + 1}/5`, "VERISCORE PLUS · DOCUMENTAZIONE FOTOGRAFICA");
        const start = pageIndex * 2;
        for (let j = 0; j < 2; j++) {
          const idx = start + j;
          const x = 18, py = 62 + j * 104, boxW = W - 36, boxH = 94;
          pdf.setFillColor(...pale); pdf.roundedRect(x, py, boxW, boxH, 6, 6, "F"); pdf.setDrawColor(...border); pdf.setLineWidth(0.7); pdf.roundedRect(x, py, boxW, boxH, 6, 6, "S");
          if (photoList[idx]) {
            try {
              const im = await imageData(db, String(photoList[idx].storage_path ?? ""));
              if (im) addImageContain(pdf, im, x + 3, py + 3, boxW - 6, boxH - 15);
              else { pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text("Immagine non disponibile", x + boxW / 2, py + boxH / 2, { align: "center" }); }
            } catch {
              pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text("Immagine non disponibile", x + boxW / 2, py + boxH / 2, { align: "center" });
            }
          } else {
            pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text("Foto non disponibile", x + boxW / 2, py + boxH / 2, { align: "center" });
          }
          pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11.5); pdf.text(`FOTO ${idx + 1}`, x + 5, py + boxH - 5);
          const caption = photoList[idx]?.caption;
          if (caption) { pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9.5); pdf.text(String(caption).slice(0, 70), x + 30, py + boxH - 5, { maxWidth: boxW - 36 }); }
        }
        drawFooter(pdf, W, H, code, `${pageIndex + 3} / 7`);
      }
    }

    const out = Buffer.from(pdf.output("arraybuffer"));
    return new NextResponse(out, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="veridrive-${code}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    console.error("PDF_CERTIFICATE_ERROR", e);
    return NextResponse.json({ error: "Errore nella generazione del PDF." }, { status: 500 });
  }
}
