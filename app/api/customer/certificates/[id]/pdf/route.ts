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
  const t = scoreTheme(score), m = rgb(t.main), p = rgb(t.pale), r = 24;
  pdf.setFillColor(...p); pdf.circle(cx, cy, r, "F");
  pdf.setDrawColor(214, 222, 232); pdf.setLineWidth(4); pdf.circle(cx, cy, r - 2.5, "S");
  pdf.setDrawColor(...m);
  const end = -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(100, score)) / 100;
  const steps = Math.ceil(40 * Math.max(0, Math.min(100, score)) / 100);
  for (let i = 0; i < steps; i++) {
    const a1 = -Math.PI / 2 + Math.PI * 2 * i / 40;
    const a2 = Math.min(end, -Math.PI / 2 + Math.PI * 2 * (i + 0.62) / 40);
    if (a2 <= a1) continue;
    pdf.setLineWidth(2.8);
    pdf.line(cx + (r - 2.5) * Math.cos(a1), cy + (r - 2.5) * Math.sin(a1), cx + (r - 2.5) * Math.cos(a2), cy + (r - 2.5) * Math.sin(a2));
  }
  pdf.setFillColor(255, 255, 255); pdf.circle(cx, cy, r - 9, "F");
  pdf.setTextColor(...rgb("#17233c")); pdf.setFont("helvetica", "bold"); pdf.setFontSize(22); pdf.text(String(score), cx, cy + 3, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.5); pdf.text("VERISCORE", cx, cy + 11, { align: "center" });
  pdf.setTextColor(...m); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.text(t.label, cx, cy + r + 9, { align: "center" });
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
  pdf.setFillColor(...rgb("#10233f")); pdf.rect(0, 0, W, 28, "F");
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(22); pdf.text("VeriDrive", 16, 14);
  if (subtitle) { pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.text(subtitle, 16, 22); }
  pdf.setTextColor(...rgb("#17233c")); pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.text(title, 16, 43);
}
function drawFooter(pdf: jsPDF, W: number, H: number, code: string, pageLabel: string) {
  pdf.setFillColor(...rgb("#10233f")); pdf.roundedRect(16, H - 16, W - 32, 8, 3, 3, "F");
  pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.2);
  pdf.text(`veridrive.it/verifica/${code}`, 21, H - 10.7);
  pdf.text(pageLabel, W - 21, H - 10.7, { align: "right" });
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
    const code = String(certificate.public_code);
    const date = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(certificate.issued_at));

    // PAGE 1 — certificate hero
    pdf.setFillColor(...navy); pdf.rect(0, 0, W, 38, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(28); pdf.text("VeriDrive", 16, 17);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(9); pdf.setTextColor(205, 219, 239); pdf.text(plus ? "CERTIFICATO VERISCORE PLUS" : "CERTIFICATO VERISCORE", 16, 27);
    pdf.setFillColor(...rgb(st.pale)); pdf.roundedRect(W - 73, 6, 57, 25, 6, 6, "F");
    pdf.setTextColor(...rgb(st.main)); pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.text(`${certificate.veriscore}/100`, W - 44.5, 16, { align: "center" });
    pdf.setFontSize(6); pdf.text("VERISCORE", W - 44.5, 24, { align: "center" });

    pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(9); pdf.text("CERTIFICATO UFFICIALE", 16, 50);
    pdf.setTextColor(...text); pdf.setFontSize(24); pdf.text(code, 16, 63);

    pdf.setFillColor(...pale); pdf.roundedRect(16, 73, W - 32, 63, 8, 8, "F"); pdf.setDrawColor(...border); pdf.setLineWidth(0.6); pdf.roundedRect(16, 73, W - 32, 63, 8, 8, "S");
    pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.text("DATI DEL VEICOLO", 23, 86);
    const d = [
      ["VEICOLO", [certificate.vehicle_make, certificate.vehicle_model].filter(Boolean).join(" ") || "Non indicato"],
      ["ANNO", String(certificate.vehicle_year ?? "Non indicato")],
      ["TARGA", String(certificate.vehicle_plate)],
      ["VIN / TELAIO", String(certificate.vehicle_vin)],
      ["CHILOMETRAGGIO", `${Number(certificate.vehicle_mileage).toLocaleString("it-IT")} km`],
      ["OFFICINA", workshop?.name ?? "Officina VeriDrive"],
    ];
    d.forEach(([label, value], i) => {
      const x = i % 2 === 0 ? 23 : W / 2 + 2;
      const yy = 98 + Math.floor(i / 2) * 13;
      pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7.5); pdf.text(label, x, yy);
      pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(11.5); pdf.text(String(value), x, yy + 5.5, { maxWidth: 70 });
    });

    pdf.setFillColor(...blue); pdf.roundedRect(16, 145, W - 32, 12, 4, 4, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.8); pdf.text(plus ? "VERISCORE PLUS · VERIFICA + DOCUMENTAZIONE" : "VERIFICA TECNICA CERTIFICATA", 22, 153);
    pdf.setTextColor(...text); pdf.setFont("helvetica", "normal"); pdf.setFontSize(11); const desc = pdf.splitTextToSize(plus ? "Verifica tecnica completa con documentazione fotografica raccolta dall'officina." : "Risultato della verifica tecnica eseguita dall'officina aderente a VeriDrive.", W - 44); pdf.text(desc, 22, 168);
    pdf.setTextColor(...muted); pdf.setFontSize(9.5); pdf.text(`Data emissione: ${date}`, 22, 184);
    drawGauge(pdf, 48, 221, Number(certificate.veriscore));
    pdf.setTextColor(...muted); pdf.setFontSize(8); pdf.text("Indice sintetico", 48, 258, { align: "center" });
    const qr = await QRCode.toDataURL(`${process.env.NEXT_PUBLIC_APP_URL || "https://veridrive.it"}/verifica/${encodeURIComponent(code)}`, { margin: 1, width: 192 });
    pdf.addImage(qr, "PNG", W - 58, 205, 34, 34, undefined, "FAST");
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(7); pdf.text("VERIFICA ONLINE", W - 41, 246, { align: "center" });
    drawFooter(pdf, W, H, code, "1 / " + (plus ? "7" : "2"));

    // PAGE 2 — full-page score summary
    pdf.addPage();
    sectionHeader(pdf, W, "Risultato della verifica", plus ? "VERISCORE PLUS · SCHEDA TECNICA" : "VERISCORE · SCHEDA TECNICA");
    pdf.setFillColor(...rgb(st.pale)); pdf.roundedRect(16, 54, W - 32, 30, 7, 7, "F");
    pdf.setTextColor(...rgb(st.main)); pdf.setFont("helvetica", "bold"); pdf.setFontSize(24); pdf.text(`${certificate.veriscore}/100`, 27, 73);
    pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.text(st.label, 78, 67);
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9.5); pdf.text("Valutazione sintetica dei 50 controlli tecnici.", 78, 76);
    let sy = 98;
    for (const g of groups.slice(0, 6)) {
      const t = scoreTheme(g.pct), main = rgb(t.main), bg = rgb(t.pale);
      pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.text(g.area, 21, sy + 7);
      pdf.setFont("helvetica", "bold"); pdf.text(`${g.ok}/${g.total}`, W - 50, sy + 7);
      pdf.setTextColor(...main); pdf.text(`${g.pct}%`, W - 24, sy + 7);
      pdf.setFillColor(230, 235, 240); pdf.roundedRect(21, sy + 12, W - 42, 7, 3.5, 3.5, "F");
      const barW = (W - 42) * g.pct / 100; if (barW > 0) { pdf.setFillColor(...main); pdf.roundedRect(21, sy + 12, barW, 7, 3.5, 3.5, "F"); }
      sy += 33;
    }
    pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.text("Note", 21, Math.min(sy + 8, 257));
    const rawNotes = getChecklist(booking.overall_notes);
    const checklistNotes = (() => { try { const p = typeof booking.overall_notes === "string" ? JSON.parse(booking.overall_notes) : booking.overall_notes; return typeof p?.checklist_notes === "string" ? p.checklist_notes : ""; } catch { return ""; } })();
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(9.5);
    const noteText = pdf.splitTextToSize(checklistNotes || "Nessuna nota aggiuntiva inserita dall'officina.", W - 42);
    pdf.text(noteText.slice(0, 7), 21, Math.min(sy + 19, 268));
    drawFooter(pdf, W, H, code, "2 / " + (plus ? "7" : "2"));

    // PLUS — 5 dedicated photo pages, two large images each
    if (plus) {
      for (let pageIndex = 0; pageIndex < 5; pageIndex++) {
        pdf.addPage();
        sectionHeader(pdf, W, `Documentazione fotografica · ${pageIndex + 1}/5`, "VERISCORE PLUS · FOTO DEL VEICOLO");
        const start = pageIndex * 2;
        for (let j = 0; j < 2; j++) {
          const idx = start + j;
          const x = 16, py = 57 + j * 108, boxW = W - 32, boxH = 94;
          pdf.setFillColor(...pale); pdf.roundedRect(x, py, boxW, boxH, 7, 7, "F"); pdf.setDrawColor(...border); pdf.setLineWidth(0.7); pdf.roundedRect(x, py, boxW, boxH, 7, 7, "S");
          if (photos[idx]) {
            try {
              const im = await imageData(db, String(photos[idx].storage_path ?? ""));
              if (im) addImageContain(pdf, im, x + 4, py + 4, boxW - 8, boxH - 18);
              else { pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text("Immagine non disponibile", x + boxW / 2, py + boxH / 2, { align: "center" }); }
            } catch { pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text("Immagine non disponibile", x + boxW / 2, py + boxH / 2, { align: "center" }); }
          } else {
            pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(10); pdf.text("Foto non disponibile", x + boxW / 2, py + boxH / 2, { align: "center" });
          }
          pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8); pdf.text(`FOTO ${idx + 1}`, x + 6, py + boxH - 6);
          if (photos[idx]?.caption) { pdf.setFont("helvetica", "normal"); pdf.setTextColor(...muted); pdf.text(String(photos[idx].caption), x + 29, py + boxH - 6, { maxWidth: boxW - 35 }); }
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
