import Link from "next/link";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

async function getCertificate(code: string) {
  const response = await fetch(`/api/public/veriscore-certificate?code=${encodeURIComponent(code)}`, { cache: "no-store" });
  if (!response.ok) return null;
  return (await response.json()).certificate as {
    public_code: string;
    vehicle_plate: string;
    vehicle_vin: string;
    vehicle_make: string | null;
    vehicle_model: string | null;
    vehicle_year: number | null;
    vehicle_mileage: number;
    veriscore: number;
    workshop_name: string | null;
    issued_at: string;
    service?: string | null;
    is_plus?: boolean;
    photos?: Array<{ id: string; caption: string | null; check_id: number | null; image_url: string | null }>;
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export default async function PublicCertificate({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const certificate = await getCertificate(code);
  const isPlus = Boolean(certificate?.is_plus);

  return <>
    <Header />
    <main className="page">
      <div className="shell" style={{ maxWidth: 900 }}>
        <div className="eyebrow">VERIFICA CERTIFICATO VERIDRIVE</div>
        <h1 style={{ fontSize: "clamp(38px, 6vw, 60px)" }}>Verifica pubblica</h1>
        {!certificate ? (
          <section className="panel customer-info" style={{ marginTop: 28 }}><XCircle size={30} /><div><h2>Certificato non trovato</h2><p>Il codice indicato non corrisponde a un certificato VeriScore pubblico.</p></div></section>
        ) : (
          <>
            <section className="panel customer-info" style={{ marginTop: 28 }}>
              <div><CheckCircle2 size={34} /><div className="eyebrow" style={{ marginTop: 14 }}>{isPlus ? "CERTIFICATO AUTENTICO · VERISCORE PLUS" : "CERTIFICATO AUTENTICO · VERISCORE"}</div><h2>{[certificate.vehicle_make, certificate.vehicle_model].filter(Boolean).join(" ") || "Veicolo"}</h2><p>{certificate.vehicle_year ?? "Anno non indicato"} · {certificate.workshop_name ?? "Officina VeriDrive"}</p></div>
              <div style={{ textAlign: "right" }}><span className="badge">{certificate.veriscore}/100</span><p style={{ marginBottom: 0, fontSize: 13, opacity: .75 }}>VeriScore</p></div>
            </section>
            <section className="cards" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", marginTop: 18 }}><div className="metric"><span>Codice certificato</span><strong style={{ fontSize: 18 }}>{certificate.public_code}</strong></div><div className="metric"><span>Targa</span><strong>{certificate.vehicle_plate}</strong></div><div className="metric"><span>Telaio</span><strong style={{ fontSize: 16 }}>{certificate.vehicle_vin}</strong></div><div className="metric"><span>Km certificati</span><strong>{certificate.vehicle_mileage.toLocaleString("it-IT")}</strong></div></section>
            <section className="panel" style={{ marginTop: 18 }}><h3>Dettagli della certificazione</h3><p style={{ marginBottom: 8 }}><b>Data verifica:</b> {formatDate(certificate.issued_at)}</p><p style={{ marginBottom: 0 }}><b>Officina:</b> {certificate.workshop_name ?? "Officina VeriDrive"}</p></section>
            {isPlus && (certificate.photos ?? []).length > 0 && <section className="panel" style={{ marginTop: 18 }}><div className="eyebrow">VERISCORE PLUS</div><h3>Documentazione fotografica</h3><p>10 fotografie dell'auto raccolte nell'ambito della verifica Plus.</p><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginTop: 14 }}>{(certificate.photos ?? []).map((photo, index) => photo.image_url ? <figure key={photo.id} style={{ margin: 0 }}><img src={photo.image_url} alt={`Documentazione ${index + 1}`} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 8 }} /><figcaption style={{ fontSize: 12, marginTop: 4, opacity: .7 }}>{photo.check_id ? `Controllo ${photo.check_id}` : `Foto ${index + 1}`}</figcaption></figure> : null)}</div></section>}
            <section className="panel" style={{ marginTop: 18 }}><div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}><ShieldCheck size={24} /><p style={{ margin: 0 }}>La presente pagina verifica l'esistenza del certificato associato al codice indicato. I dati personali del proprietario non vengono pubblicati.</p></div></section>
          </>
        )}
        <div style={{ marginTop: 24 }}><Link href="/verifica" className="button secondary">Verifica un altro certificato</Link></div>
      </div>
    </main>
    <Footer />
  </>;
}
