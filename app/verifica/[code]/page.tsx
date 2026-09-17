import Link from "next/link";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { createServiceClient } from "@/lib/supabase/service";

function normalizeCode(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function maskPlate(value: string) {
  const clean = value.trim().toUpperCase();
  if (!clean) return "";
  return clean.split("").map((char, index) => index === 0 || index === 2 || index === clean.length - 1 ? char : "*").join("");
}

function maskVin(value: string) {
  const clean = value.trim().toUpperCase();
  if (!clean) return "";
  if (clean.length <= 8) return clean;
  return `${"*".repeat(clean.length - 8)}${clean.slice(-8)}`;
}

async function getCertificate(code: string) {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  const db = createServiceClient();
  const { data, error } = await db
    .from("veriscore_certificates")
    .select("id,public_code,booking_id,vehicle_plate,vehicle_vin,vehicle_make,vehicle_model,vehicle_year,vehicle_mileage,veriscore,workshop_id,issued_at")
    .limit(50);

  if (error) throw new Error(error.message);

  const certificate = (data ?? []).find((row) => normalizeCode(String(row.public_code ?? "")) === normalizedCode);
  if (!certificate) return null;

  const { data: workshop } = await db.from("workshops").select("name").eq("id", certificate.workshop_id).maybeSingle();
  let service: string | null = null;
  if (certificate.booking_id) {
    const { data: booking } = await db.from("bookings").select("service").eq("id", certificate.booking_id).maybeSingle();
    service = booking?.service ?? null;
  }

  return {
    public_code: certificate.public_code,
    vehicle_plate: maskPlate(String(certificate.vehicle_plate ?? "")),
    vehicle_vin: maskVin(String(certificate.vehicle_vin ?? "")),
    vehicle_make: certificate.vehicle_make,
    vehicle_model: certificate.vehicle_model,
    vehicle_year: certificate.vehicle_year,
    vehicle_mileage: certificate.vehicle_mileage,
    veriscore: certificate.veriscore,
    workshop_name: workshop?.name ?? null,
    issued_at: certificate.issued_at,
    service,
    is_plus: service === "veriscore_plus",
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

function scoreColor(score: number) {
  if (score < 50) return "#DC2626";
  if (score < 70) return "#F59E0B";
  if (score < 85) return "#2563EB";
  return "#16A34A";
}

function scoreCircle(score: number) {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const safeScore = Math.max(0, Math.min(100, Number(score) || 0));
  const dash = (safeScore / 100) * circumference;
  return { radius, circumference, dash, color: scoreColor(safeScore) };
}

export default async function PublicCertificate({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const certificate = await getCertificate(code);
  const isPlus = Boolean(certificate?.is_plus);
  const score = certificate ? scoreCircle(Number(certificate.veriscore)) : null;

  return <>
    <Header />
    <main className="page">
      <div className="shell" style={{ maxWidth: 900 }}>
        <div className="eyebrow">VERIFICA CERTIFICATO VERIDRIVE</div>
        <h1 style={{ fontSize: "clamp(38px, 6vw, 60px)", marginBottom: 8 }}>Verifica pubblica</h1>
        {!certificate ? (
          <section className="panel customer-info" style={{ marginTop: 20 }}><XCircle size={30} /><div><h2>Certificato non trovato</h2><p>Il codice indicato non corrisponde a un certificato VeriScore pubblico.</p></div></section>
        ) : (
          <>
            <section className="panel customer-info" style={{ marginTop: 20, position: "relative", overflow: "hidden" }}>
              <div>
                <CheckCircle2 size={34} />
                <div className="eyebrow" style={{ marginTop: 12 }}>{isPlus ? "CERTIFICATO AUTENTICO · VERISCORE PLUS" : "CERTIFICATO AUTENTICO · VERISCORE"}</div>
                <h2>{[certificate.vehicle_make, certificate.vehicle_model].filter(Boolean).join(" ") || "Veicolo"}</h2>
                <p style={{ marginBottom: 0 }}>{certificate.vehicle_year ?? "Anno non indicato"} · {certificate.workshop_name ?? "Officina VeriDrive"}</p>
              </div>
              {score && <div style={{ marginTop: 22, display: "flex", justifyContent: "center" }} aria-label={`VeriScore ${Math.round(Number(certificate.veriscore) || 0)} su 100`}>
                <svg width="150" height="150" viewBox="0 0 140 140" role="img" aria-hidden="true">
                  <circle cx="70" cy="70" r={score.radius} fill="none" stroke="#DCE8FA" strokeWidth="10" />
                  <circle cx="70" cy="70" r={score.radius} fill="none" stroke={score.color} strokeWidth="10" strokeLinecap="round" strokeDasharray={`${score.dash} ${score.circumference - score.dash}`} transform="rotate(-90 70 70)" />
                  <text x="70" y="67" textAnchor="middle" fontSize="27" fontWeight="700" fill="#0F172A">{Math.round(Number(certificate.veriscore) || 0)}</text>
                  <text x="70" y="84" textAnchor="middle" fontSize="11" fill="#64748B">/100</text>
                  <text x="70" y="101" textAnchor="middle" fontSize="11" fill="#64748B">VeriScore</text>
                </svg>
              </div>}
            </section>
            <section className="cards" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", marginTop: 16 }}><div className="metric"><span>Codice certificato</span><strong style={{ fontSize: 18 }}>{certificate.public_code}</strong></div><div className="metric"><span>Targa</span><strong>{certificate.vehicle_plate}</strong></div><div className="metric"><span>Telaio</span><strong style={{ fontSize: 16 }}>{certificate.vehicle_vin}</strong></div><div className="metric"><span>Km certificati</span><strong>{certificate.vehicle_mileage.toLocaleString("it-IT")}</strong></div></section>
            <section className="panel" style={{ marginTop: 16 }}><h3>Dettagli della certificazione</h3><p style={{ marginBottom: 8 }}><b>Data verifica:</b> {formatDate(certificate.issued_at)}</p><p style={{ marginBottom: 0 }}><b>Officina:</b> {certificate.workshop_name ?? "Officina VeriDrive"}</p></section>
            <section className="panel" style={{ marginTop: 16 }}><div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}><ShieldCheck size={24} /><p style={{ margin: 0 }}>La presente pagina verifica l'esistenza del certificato associato al codice indicato. I dati personali del proprietario non vengono pubblicati.</p></div></section>
          </>
        )}
        <div style={{ marginTop: 20 }}><Link href="/verifica" className="button secondary">Verifica un altro certificato</Link></div>
      </div>
    </main>
    <Footer />
  </>;
}
