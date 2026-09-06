import Link from "next/link";
import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

async function getCertificate(code: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const response = await fetch(`${baseUrl}/api/public/veriscore-certificate?code=${encodeURIComponent(code)}`, { cache: "no-store" });
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
  };
}

function maskPlate(plate: string) {
  const clean = plate.trim().toUpperCase();
  if (clean.length <= 3) return "*".repeat(clean.length);
  return clean.split("").map((char, index) => index === 0 || index === 2 || index === clean.length - 1 ? char : "*").join("");
}

function maskVin(vin: string) {
  const clean = vin.trim().toUpperCase();
  if (clean.length <= 8) return clean;
  return `${"*".repeat(clean.length - 8)}${clean.slice(-8)}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
}

export default async function PublicCertificate({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const certificate = await getCertificate(code);

  return (
    <>
      <Header />
      <main className="page">
        <div className="shell" style={{ maxWidth: 820 }}>
          <div className="eyebrow">VERIFICA CERTIFICATO VERIDRIVE</div>
          <h1 style={{ fontSize: "clamp(38px, 6vw, 60px)" }}>Verifica pubblica</h1>

          {!certificate ? (
            <section className="panel customer-info" style={{ marginTop: 28 }}>
              <XCircle size={30} />
              <div>
                <h2>Certificato non trovato</h2>
                <p>Il codice indicato non corrisponde a un certificato VeriScore pubblico.</p>
              </div>
            </section>
          ) : (
            <>
              <section className="panel customer-info" style={{ marginTop: 28 }}>
                <div>
                  <CheckCircle2 size={34} />
                  <div className="eyebrow" style={{ marginTop: 14 }}>CERTIFICATO AUTENTICO</div>
                  <h2>{[certificate.vehicle_make, certificate.vehicle_model].filter(Boolean).join(" ") || "Veicolo"}</h2>
                  <p>{certificate.vehicle_year ?? "Anno non indicato"} · {certificate.workshop_name ?? "Officina VeriDrive"}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className="badge">{certificate.veriscore}/100</span>
                  <p style={{ marginBottom: 0, fontSize: 13, opacity: .75 }}>VeriScore</p>
                </div>
              </section>

              <section className="cards" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", marginTop: 18 }}>
                <div className="metric"><span>Codice certificato</span><strong style={{ fontSize: 18 }}>{certificate.public_code}</strong></div>
                <div className="metric"><span>Targa</span><strong>{maskPlate(certificate.vehicle_plate)}</strong></div>
                <div className="metric"><span>Telaio</span><strong style={{ fontSize: 16 }}>{maskVin(certificate.vehicle_vin)}</strong></div>
                <div className="metric"><span>Km certificati</span><strong>{certificate.vehicle_mileage.toLocaleString("it-IT")}</strong></div>
              </section>

              <section className="panel" style={{ marginTop: 18 }}>
                <h3>Dettagli della certificazione</h3>
                <p style={{ marginBottom: 8 }}><b>Data verifica:</b> {formatDate(certificate.issued_at)}</p>
                <p style={{ marginBottom: 0 }}><b>Officina:</b> {certificate.workshop_name ?? "Officina VeriDrive"}</p>
              </section>

              <section className="panel" style={{ marginTop: 18 }}>
                <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <ShieldCheck size={24} />
                  <p style={{ margin: 0 }}>La presente pagina verifica l'esistenza del certificato associato al codice indicato. I dati personali del proprietario non vengono pubblicati.</p>
                </div>
              </section>
            </>
          )}

          <div style={{ marginTop: 24 }}>
            <Link href="/verifica" className="button secondary">Verifica un altro certificato</Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
