import Link from "next/link";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

async function getCertificate(code: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/public/certificate?code=${encodeURIComponent(code)}`, { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()).certificate as {
    public_code: string;
    is_revoked: boolean;
    issued_at: string;
    inspections: { passed_checks: number; veriscore: number; completed_at: string | null; notes: string | null; bookings: { plate: string; vehicle_make: string | null; vehicle_model: string | null; vehicle_year: number | null; service_key: string } } | null;
  };
}

function serviceName(key: string) {
  return ({ check_viaggio: "Check Viaggio", veriscore: "Check-up + VeriScore", veriscore_plus: "Check-up + VeriScorePlus" } as Record<string, string>)[key] ?? key;
}

export default async function PublicCertificate({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const certificate = await getCertificate(code);
  const inspection = certificate?.inspections;
  const booking = inspection?.bookings;
  const valid = Boolean(certificate && inspection && booking && !certificate.is_revoked);

  return <>
    <Header />
    <main className="page">
      <div className="shell" style={{ maxWidth: 820 }}>
        <div className="eyebrow">VERIFICA CERTIFICATO VERIDRIVE</div>
        <h1 style={{ fontSize: "clamp(38px, 6vw, 60px)" }}>Verifica pubblica</h1>
        {!valid && <section className="panel customer-info" style={{ marginTop: 28 }}><XCircle size={30} /><div><h2>Certificato non valido</h2><p>Il codice indicato non corrisponde a un certificato pubblico valido.</p></div></section>}
        {valid && inspection && booking && <>
          <section className="panel customer-info" style={{ marginTop: 28 }}>
            <div><CheckCircle2 size={34} /><div className="eyebrow" style={{ marginTop: 14 }}>CERTIFICATO VALIDO</div><h2>{[booking.vehicle_make, booking.vehicle_model].filter(Boolean).join(" ") || "Veicolo"}</h2><p>{booking.plate}{booking.vehicle_year ? ` · ${booking.vehicle_year}` : ""} · {serviceName(booking.service_key)}</p></div>
            <div style={{ textAlign: "right" }}><span className="badge">{inspection.veriscore}/100</span><p style={{ marginBottom: 0, fontSize: 13, opacity: .75 }}>VeriScore</p></div>
          </section>
          <section className="cards" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", marginTop: 18 }}>
            <div className="metric"><ShieldCheck size={20} /><span>Controlli completati</span><strong>{inspection.passed_checks}/50</strong></div>
            <div className="metric"><span>Codice pubblico</span><strong style={{ fontSize: 19 }}>{certificate.public_code}</strong></div>
            <div className="metric"><span>Emesso il</span><strong style={{ fontSize: 19 }}>{new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(certificate.issued_at))}</strong></div>
          </section>
          <section className="panel" style={{ marginTop: 18 }}><h3>Informazioni sulla verifica</h3><p style={{ marginBottom: 0 }}>Questa pagina conferma l'esistenza del certificato pubblico associato al codice indicato. Le informazioni personali del cliente non vengono esposte.</p></section>
        </>}
        <div style={{ marginTop: 24 }}><Link href="/" className="button secondary">Torna a VeriDrive</Link></div>
      </div>
    </main>
    <Footer />
  </>;
}
