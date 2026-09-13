import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  return [parseInt(clean.slice(0, 2), 16), parseInt(clean.slice(2, 4), 16), parseInt(clean.slice(4, 6), 16)];
}

function fitText(pdf: jsPDF, value: string, maxWidth: number, fontSize: number) {
  pdf.setFontSize(fontSize);
  return pdf.splitTextToSize(value, maxWidth) as string[];
}

function scoreColors(score: number) {
  if (score >= 80) return { main: "#16a34a", pale: "#dcfce7", label: "OTTIMO" };
  if (score >= 60) return { main: "#eab308", pale: "#fef9c3", label: "BUONO" };
  return { main: "#dc2626", pale: "#fee2e2", label: "CRITICITÀ" };
}

function drawScoreGauge(pdf: jsPDF, cx: number, cy: number, score: number) {
  const { main, pale, label } = scoreColors(score);
  const mainRgb = hexToRgb(main);
  const paleRgb = hexToRgb(pale);
  const outerR = 20;
  const innerR = 14;
  pdf.setFillColor(...paleRgb);
  pdf.circle(cx, cy, outerR, "F");
  pdf.setDrawColor(224, 231, 239);
  pdf.setLineWidth(5);
  pdf.circle(cx, cy, outerR - 3, "S");
  pdf.setDrawColor(...mainRgb);
  pdf.setLineWidth(5);
  const segments = Math.max(1, Math.round((score / 100) * 40));
  const start = -Math.PI / 2;
  const end = start + (Math.PI * 2 * score) / 100;
  const points: Array<[number, number]> = [];
  for (let i = 0; i <= segments; i++) {
    const angle = start + ((end - start) * i) / segments;
    points.push([cx + (outerR - 3) * Math.cos(angle), cy + (outerR - 3) * Math.sin(angle)]);
  }
  for (let i = 1; i < points.length; i++) pdf.line(points[i - 1][0], points[i - 1][1], points[i][0], points[i][1]);
  pdf.setFillColor(255, 255, 255);
  pdf.circle(cx, cy, innerR, "F");
  pdf.setTextColor(...hexToRgb("#17233c"));
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(16);
  pdf.text(String(score), cx, cy + 2, { align: "center" });
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(6.5);
  pdf.text("VERISCORE", cx, cy + 8, { align: "center" });
  pdf.setTextColor(...mainRgb);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(7);
  pdf.text(label, cx, cy + 25, { align: "center" });
}

function resultScore(result: string | undefined) {
  if (result === "ok") return 1;
  if (result === "issue") return 0.5;
  if (result === "critical") return 0;
  return 0;
}

function groupSummaries(checklist: unknown) {
  if (!Array.isArray(checklist)) return [] as Array<{ area: string; passed: number; total: number; score: number }>;
  const groups = new Map<string, { passed: number; total: number }>();
  for (const raw of checklist) {
    const item = raw as { area?: string; result?: string | null };
    const area = item.area || "Altro";
    const current = groups.get(area) ?? { passed: 0, total: 0 };
    current.total += 1;
    if (item.result === "ok") current.passed += 1;
    groups.set(area, current);
  }
  return [...groups.entries()].map(([area, data]) => ({ area, ...data, score: data.total ? Math.round((data.passed / data.total) * 100) : 0 }));
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

    const { data: booking } = await db.from("bookings").select("id,customer_id,service,overall_notes").eq("id", certificate.booking_id).eq("customer_id", customer.id).maybeSingle();
    if (!booking) return NextResponse.json({ error: "Certificato non associato al cliente." }, { status: 404 });

    const { data: workshop } = await db.from("workshops").select("name,city,postal_code").eq("id", certificate.workshop_id).maybeSingle();
    const isPlus = booking.service === "veriscore_plus";
    const groups = groupSummaries((() => { try { return typeof booking.overall_notes === "string" ? JSON.parse(booking.overall_notes).checklist : (booking.overall_notes as any)?.checklist; } catch { return null; } })());

    const { data: photos } = isPlus ? await db.from("photos").select("id,storage_path,caption,check_id,created_at").eq("inspection_id", certificate.booking_id).order("created_at", { ascending: true }).limit(10) : { data: [] as Record<string, unknown>[] };

    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const W = pdf.internal.pageSize.getWidth();
    const H = pdf.internal.pageSize.getHeight();
    const navy = hexToRgb("#0b1f3a");
    const blue = hexToRgb("#2463eb");
    const cyan = hexToRgb("#38bdf8");
    const pale = hexToRgb("#eef5ff");
    const text = hexToRgb("#17233c");
    const muted = hexToRgb("#64748b");

    pdf.setFillColor(...navy); pdf.rect(0, 0, W, 46, "F");
    pdf.setTextColor(255,255,255); pdf.setFont("helvetica","bold"); pdf.setFontSize(28); pdf.text("VeriDrive", 18, 19);
    pdf.setFont("helvetica","normal"); pdf.setFontSize(10.5); pdf.setTextColor(210,225,255); pdf.text(isPlus ? "CERTIFICATO VERISCORE PLUS" : "CERTIFICATO VERISCORE", 18, 29);
    pdf.setFillColor(...blue); pdf.roundedRect(W-77, 8, 59, 28, 6, 6, "F");
    pdf.setTextColor(255,255,255); pdf.setFont("helvetica","bold"); pdf.setFontSize(18); pdf.text(`${certificate.veriscore}/100`, W-47, 20, { align: "center" }); pdf.setFontSize(7); pdf.text("VERISCORE", W-47, 28, { align: "center" });

    pdf.setTextColor(...text); pdf.setFont("helvetica","normal"); pdf.setFontSize(11); pdf.text("Codice certificato", 18, 58);
    pdf.setFont("helvetica","bold"); pdf.setFontSize(21); pdf.text(String(certificate.public_code), 18, 69);
    drawScoreGauge(pdf, W-42, 65, Number(certificate.veriscore));

    pdf.setFillColor(...pale); pdf.roundedRect(16, 80, W-32, 60, 7, 7, "F");
    pdf.setTextColor(...text); pdf.setFont("helvetica","bold"); pdf.setFontSize(11); pdf.text("DATI DEL VEICOLO", 22, 91);
    const details: Array<[string,string]> = [
      ["Veicolo", [certificate.vehicle_make,certificate.vehicle_model].filter(Boolean).join(" ") || "Non indicato"],
      ["Anno", String(certificate.vehicle_year ?? "Non indicato")],
      ["Targa", String(certificate.vehicle_plate)],
      ["VIN / Telaio", String(certificate.vehicle_vin)],
      ["Chilometraggio", `${Number(certificate.vehicle_mileage).toLocaleString("it-IT")} km`],
      ["Officina", workshop?.name ?? "Officina VeriDrive"],
    ];
    let idx=0; for(const [label,value] of details){ const x=idx%2===0?22:W/2+3; const yy=101+Math.floor(idx/2)*13; pdf.setTextColor(...muted); pdf.setFont("helvetica","normal"); pdf.setFontSize(8); pdf.text(label,x,yy); pdf.setTextColor(...text); pdf.setFont("helvetica","bold"); pdf.setFontSize(10); pdf.text(value,x,yy+5,{maxWidth:72}); idx++; }

    pdf.setFillColor(...cyan); pdf.roundedRect(16, 150, W-32, 14, 5, 5, "F"); pdf.setTextColor(...navy); pdf.setFont("helvetica","bold"); pdf.setFontSize(10.5); pdf.text(isPlus ? "VERISCORE PLUS · CERTIFICATO CON DOCUMENTAZIONE" : "VERIFICA TECNICA CERTIFICATA", 22, 159);
    pdf.setTextColor(...text); pdf.setFont("helvetica","normal"); pdf.setFontSize(10);
    const description = isPlus ? "Certificato con verifica tecnica completa e documentazione fotografica raccolta dall'officina." : "Certificato del risultato della verifica tecnica eseguita dall'officina aderente a VeriDrive.";
    pdf.text(fitText(pdf,description,W-44,10),22,176);
    pdf.setTextColor(...muted); pdf.setFontSize(9); pdf.text(`Data emissione: ${new Intl.DateTimeFormat("it-IT",{day:"2-digit",month:"2-digit",year:"numeric"}).format(new Date(certificate.issued_at))}`,22,194);

    pdf.setTextColor(...text); pdf.setFont("helvetica","bold"); pdf.setFontSize(12); pdf.text("RIEPILOGO PUNTEGGI", 22, 210);
    let gy=218;
    for(const g of groups){
      const tone = scoreColors(g.score); pdf.setFillColor(...hexToRgb(tone.pale)); pdf.roundedRect(22, gy-5, W-76, 11, 4, 4, "F");
      pdf.setTextColor(...text); pdf.setFont("helvetica","bold"); pdf.setFontSize(9); pdf.text(g.area,28,gy+1);
      pdf.setFont("helvetica","normal"); pdf.setTextColor(...muted); pdf.text(`${g.passed}/${g.total}`,W-65,gy+1);
      pdf.setTextColor(...hexToRgb(tone.main)); pdf.setFont("helvetica","bold"); pdf.text(`${g.score}%`,W-38,gy+1);
      gy += 14;
    }

    const qrText = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://veridrive.it"}/verifica/${encodeURIComponent(certificate.public_code)}`;
    const qrData = await QRCode.toDataURL(qrText, { margin: 1, width: 256 });
    pdf.addImage(qrData, "PNG", W-65, H-61, 35, 35);
    pdf.setTextColor(...navy); pdf.setFont("helvetica","bold"); pdf.setFontSize(7); pdf.text("SCANSIONA PER VERIFICARE", W-47.5, H-22, { align: "center" });

    pdf.setFillColor(...navy); pdf.roundedRect(16, H-25, 115, 15, 4, 4, "F"); pdf.setTextColor(255,255,255); pdf.setFont("helvetica","bold"); pdf.setFontSize(7); pdf.text("VERIFICA PUBBLICA",22,H-16); pdf.setFont("helvetica","normal"); pdf.text(`veridrive.it/verifica/${certificate.public_code}`,50,H-16);

    if(isPlus){
      pdf.addPage();
      pdf.setFillColor(...navy); pdf.rect(0,0,W,34,"F");
      pdf.setTextColor(255,255,255); pdf.setFont("helvetica","bold"); pdf.setFontSize(22); pdf.text("VeriDrive",18,15); pdf.setFont("helvetica","normal"); pdf.setFontSize(10); pdf.text("VERISCORE PLUS · DOCUMENTAZIONE FOTOGRAFICA",18,24);
      pdf.setTextColor(...text); pdf.setFont("helvetica","bold"); pdf.setFontSize(15); pdf.text("10 FOTO DEL VEICOLO",18,49);
      const cellW=42, cellH=52, gap=5, startX=16, startY=60;
      for(let i=0;i<10;i++){
        const row=Math.floor(i/2), col=i%2; const x=startX+col*(cellW+gap); const y=startY+row*(cellH+gap+6);
        pdf.setFillColor(...pale); pdf.roundedRect(x,y,cellW,cellH,4,4,"F");
        const photo=photos?.[i] as Record<string,unknown>|undefined;
        let imageData:string|null=null;
        if(photo?.storage_path){ const { data:signed }=await db.storage.from("inspection-photos").createSignedUrl(String(photo.storage_path),300); if(signed?.signedUrl){ try{ const r=await fetch(signed.signedUrl); if(r.ok){ const b=new Uint8Array(await r.arrayBuffer()); let bin=""; for(let j=0;j<b.length;j+=0x8000) bin+=String.fromCharCode(...b.subarray(j,j+0x8000)); imageData=`data:${r.headers.get("content-type")??"image/jpeg"};base64,${btoa(bin)}`; } }catch{/* ignore */} } }
        if(imageData){ pdf.addImage(imageData,"JPEG",x+1,y+1,cellW-2,cellH-2,undefined,"FAST"); } else { pdf.setTextColor(...muted); pdf.setFontSize(9); pdf.text("Foto non disponibile",x+cellW/2,y+cellH/2,{align:"center",maxWidth:cellW-8}); }
        pdf.setTextColor(...text); pdf.setFont("helvetica","bold"); pdf.setFontSize(8); pdf.text(`Foto ${i+1}`,x+2,y+cellH+5);
      }
    }

    const bytes = pdf.output("arraybuffer");
    return new NextResponse(bytes,{status:200,headers:{"Content-Type":"application/pdf","Content-Disposition":`attachment; filename="${certificate.public_code}${isPlus?"-PLUS":""}.pdf"`,"Cache-Control":"private, no-store"}});
  } catch(error){
    console.error("CUSTOMER_CERTIFICATE_PDF_ERROR",error);
    return NextResponse.json({error:error instanceof Error?error.message:"Impossibile generare il certificato."},{status:500});
  }
}
