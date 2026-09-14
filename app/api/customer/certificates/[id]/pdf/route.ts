import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

function rgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
function theme(score: number) {
  if (score >= 80) return { main: "#16a34a", pale: "#dcfce7", label: "OTTIMO" };
  if (score >= 60) return { main: "#eab308", pale: "#fef9c3", label: "BUONO" };
  return { main: "#dc2626", pale: "#fee2e2", label: "CRITICITÀ" };
}
function drawGauge(pdf: jsPDF, cx: number, cy: number, score: number) {
  const t = theme(score), m = rgb(t.main), p = rgb(t.pale), r = 15;
  pdf.setFillColor(...p); pdf.circle(cx, cy, r, "F");
  pdf.setDrawColor(226, 232, 240); pdf.setLineWidth(2.8); pdf.circle(cx, cy, r - 2, "S");
  pdf.setDrawColor(...m);
  const end = -Math.PI / 2 + Math.PI * 2 * score / 100;
  const steps = Math.ceil(36 * score / 100);
  for (let i = 0; i < steps; i++) {
    const a1 = -Math.PI / 2 + Math.PI * 2 * i / 36;
    const a2 = Math.min(end, -Math.PI / 2 + Math.PI * 2 * (i + 0.7) / 36);
    if (a2 <= a1) continue;
    pdf.setLineWidth(1.8);
    pdf.line(cx + (r - 2) * Math.cos(a1), cy + (r - 2) * Math.sin(a1), cx + (r - 2) * Math.cos(a2), cy + (r - 2) * Math.sin(a2));
  }
  pdf.setFillColor(255, 255, 255); pdf.circle(cx, cy, r - 6, "F");
  pdf.setTextColor(...rgb("#17233c")); pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.text(String(score), cx, cy + 1.5, { align: "center" });
  pdf.setFont("helvetica", "normal"); pdf.setFontSize(5.5); pdf.text("VERISCORE", cx, cy + 6.5, { align: "center" });
  pdf.setTextColor(...m); pdf.setFont("helvetica", "bold"); pdf.setFontSize(5.8); pdf.text(t.label, cx, cy + r + 6, { align: "center" });
}
function getChecklist(value: unknown) {
  try { const p = typeof value === "string" ? JSON.parse(value) : value; return Array.isArray(p?.checklist) ? p.checklist : []; } catch { return []; }
}
function groupsOf(checklist: unknown) {
  const out = new Map<string, { ok: number; total: number }>();
  for (const r of Array.isArray(checklist) ? checklist : []) {
    const i = r as { area?: string; result?: string | null };
    const a = i.area || "Altro"; const g = out.get(a) || { ok: 0, total: 0 }; g.total++; if (i.result === "ok") g.ok++; out.set(a, g);
  }
  return [...out.entries()].map(([area, g]) => ({ area, ...g, pct: g.total ? Math.round(g.ok / g.total * 100) : 0 }));
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

    const { data: photos } = plus
      ? await db.from("photos").select("id,storage_path,caption,check_id,created_at").eq("inspection_id", (await db.from("inspections").select("id").eq("booking_id", certificate.booking_id).maybeSingle()).data?.id ?? "").order("created_at", { ascending: true }).limit(10)
      : { data: [] as Array<{ id: string; storage_path: string; caption?: string | null; check_id?: number | null; created_at?: string }> };

    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const W = pdf.internal.pageSize.getWidth(), H = pdf.internal.pageSize.getHeight();
    const navy = rgb("#0b1f3a"), blue = rgb("#2563eb"), cyan = rgb("#38bdf8"), pale = rgb("#f7f9fc"), text = rgb("#17233c"), muted = rgb("#64748b"), border = rgb("#e2e8f0");

    // PAGE 1 — compact, readable on phone
    pdf.setFillColor(...navy); pdf.rect(0, 0, W, 30, "F");
    pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(24); pdf.text("VeriDrive", 16, 14);
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5); pdf.setTextColor(205, 220, 245); pdf.text(plus ? "CERTIFICATO VERISCORE PLUS" : "CERTIFICATO VERISCORE", 16, 22);
    pdf.setFillColor(...blue); pdf.roundedRect(W - 64, 6, 48, 18, 5, 5, "F"); pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.text(`${certificate.veriscore}/100`, W - 40, 14, { align: "center" }); pdf.setFontSize(5.5); pdf.text("VERISCORE", W - 40, 20, { align: "center" });

    pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.text("CERTIFICATO UFFICIALE", 16, 40);
    pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(19); pdf.text(String(certificate.public_code), 16, 50);

    pdf.setFillColor(...pale); pdf.roundedRect(16, 59, W - 32, 50, 6, 6, "F"); pdf.setDrawColor(...border); pdf.setLineWidth(0.5); pdf.roundedRect(16, 59, W - 32, 50, 6, 6, "S");
    pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(10); pdf.text("DATI DEL VEICOLO", 22, 69);
    const d = [["Veicolo", [certificate.vehicle_make, certificate.vehicle_model].filter(Boolean).join(" ") || "Non indicato"], ["Anno", String(certificate.vehicle_year ?? "Non indicato")], ["Targa", String(certificate.vehicle_plate)], ["VIN / Telaio", String(certificate.vehicle_vin)], ["Chilometraggio", `${Number(certificate.vehicle_mileage).toLocaleString("it-IT")} km`], ["Officina", workshop?.name ?? "Officina VeriDrive"]];
    d.forEach(([label, value], i) => { const x = i % 2 === 0 ? 22 : W / 2 + 1, yy = 78 + Math.floor(i / 2) * 10; pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(6.8); pdf.text(label, x, yy); pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.2); pdf.text(value, x, yy + 4, { maxWidth: 72 }); });

    pdf.setFillColor(...cyan); pdf.roundedRect(16, 117, W - 32, 11, 4, 4, "F"); pdf.setTextColor(...navy); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.2); pdf.text(plus ? "VERISCORE PLUS · VERIFICA + DOCUMENTAZIONE" : "VERIFICA TECNICA CERTIFICATA", 21, 124.5);
    pdf.setTextColor(...text); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8.5);
    const desc = pdf.splitTextToSize(plus ? "Certificato con verifica tecnica completa e documentazione fotografica raccolta dall'officina." : "Certificato del risultato della verifica tecnica eseguita dall'officina aderente a VeriDrive.", W - 42);
    pdf.text(desc, 21, 139);
    pdf.setTextColor(...muted); pdf.setFontSize(7.8); pdf.text(`Data emissione: ${new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(certificate.issued_at))}`, 21, 154);
    drawGauge(pdf, 39, 176, Number(certificate.veriscore));
    pdf.setTextColor(...muted); pdf.setFontSize(6.5); pdf.text("VeriScore sintetico", 39, 197, { align: "center" });
    const qr = await QRCode.toDataURL(`${process.env.NEXT_PUBLIC_APP_URL || "https://veridrive.it"}/verifica/${encodeURIComponent(String(certificate.public_code))}`, { margin: 1, width: 160 });
    pdf.addImage(qr, "PNG", W - 47, 173, 26, 26);
    pdf.setTextColor(...muted); pdf.setFont("helvetica", "bold"); pdf.setFontSize(5.8); pdf.text("SCANSIONA", W - 34, 203, { align: "center" });
    pdf.setFillColor(...navy); pdf.roundedRect(16, H - 17, W - 32, 9, 3, 3, "F"); pdf.setTextColor(255, 255, 255); pdf.setFontSize(6.4); pdf.text("veridrive.it/verifica/" + certificate.public_code, 21, H - 11);

    // PAGE 2 — scores + up to 10 photo placeholders, compact and consistent
    pdf.addPage(); pdf.setFillColor(...navy); pdf.rect(0, 0, W, 26, "F"); pdf.setTextColor(255, 255, 255); pdf.setFont("helvetica", "bold"); pdf.setFontSize(18); pdf.text("VeriDrive", 16, 12); pdf.setFont("helvetica", "normal"); pdf.setFontSize(8); pdf.text(plus ? "VERISCORE PLUS · SCHEDA E FOTO" : "VERISCORE · SCHEDA TECNICA", 16, 19);
    pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(13); pdf.text("Punteggi per area", 16, 40);
    let y = 50;
    for (const g of groups.slice(0, 5)) {
      const t = theme(g.pct); pdf.setFillColor(...rgb(t.pale)); pdf.roundedRect(16, y, W - 32, 14, 4, 4, "F");
      pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(8.8); pdf.text(g.area, 21, y + 9); pdf.setFont("helvetica", "normal"); pdf.text(`${g.ok}/${g.total}`, W - 48, y + 9); pdf.setTextColor(...rgb(t.main)); pdf.setFont("helvetica", "bold"); pdf.text(`${g.pct}%`, W - 24, y + 9); y += 18;
    }
    if (plus) {
      y += 6; pdf.setTextColor(...text); pdf.setFont("helvetica", "bold"); pdf.setFontSize(12); pdf.text("Documentazione fotografica · 10 foto", 16, y); y += 8;
      const gap = 5, cellW = (W - 32 - gap) / 2, cellH = 35, cols = 2;
      const count = Math.min(10, photos?.length ?? 0);
      for (let i = 0; i < 10; i++) {
        const row = Math.floor(i / cols), col = i % cols;
        const x = 16 + col * (cellW + gap), py = y + row * (cellH + 7);
        pdf.setFillColor(248, 250, 252); pdf.roundedRect(x, py, cellW, cellH, 4, 4, "F"); pdf.setDrawColor(...border); pdf.setLineWidth(0.4); pdf.roundedRect(x, py, cellW, cellH, 4, 4, "S");
        pdf.setTextColor(...muted); pdf.setFont("helvetica", "normal"); pdf.setFontSize(7.2); pdf.text(i < count ? "Foto veicolo" : "Foto non disponibile", x + cellW / 2, py + cellH / 2 - 1, { align: "center" });
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(6.4); pdf.text(`Foto ${i + 1}`, x + 2, py + cellH - 3);
      }
    }

    const bytes = pdf.output("arraybuffer");
    return new NextResponse(bytes, { status: 200, headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${certificate.public_code}${plus ? "-PLUS" : ""}.pdf"`, "Cache-Control": "private,no-store" } });
  } catch (error) {
    console.error("CUSTOMER_CERTIFICATE_PDF_ERROR", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Impossibile generare il certificato." }, { status: 500 });
  }
}
