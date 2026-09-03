import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CalendarDays, FileCheck2, Gauge, Plus, ShieldCheck } from "lucide-react";

const checks = [
  { name: "Volkswagen Golf 1.5 TSI", score: 92, date: "25 agosto 2026", status: "Certificato disponibile" },
  { name: "Fiat 500 Hybrid", score: 78, date: "12 agosto 2026", status: "Certificato disponibile" },
];

function scoreTone(score: number) {
  if (score >= 90) return "Ottimo";
  if (score >= 70) return "Buono";
  return "Criticità";
}

export default function Dashboard() {
  const average = Math.round(checks.reduce((total, item) => total + item.score, 0) / checks.length);

  return (
    <>
      <Header />
      <main className="page">
        <div className="shell">
          <div className="dashboard-hero">
            <div>
              <div className="eyebrow">AREA CLIENTE</div>
              <h1>Le tue verifiche.</h1>
              <p className="lead">Tutto quello che hai verificato, raccolto in un unico posto.</p>
            </div>
            <Link className="button" href="/prenota"><Plus size={18} /> Nuova verifica</Link>
          </div>

          <div className="customer-metrics">
            <div className="metric"><FileCheck2 size={20} /><span>Verifiche totali</span><strong>{checks.length}</strong></div>
            <div className="metric"><Gauge size={20} /><span>VeriScore medio</span><strong>{average}</strong></div>
            <div className="metric"><ShieldCheck size={20} /><span>Report disponibili</span><strong>{checks.length}</strong></div>
          </div>

          <section className="dashboard-section">
            <div className="section-heading">
              <div><div className="eyebrow">STORICO</div><h2>Le tue verifiche</h2></div>
              <Link href="/prenota">Prenota un nuovo controllo →</Link>
            </div>
            <div className="customer-checks">
              {checks.map((check) => (
                <article className="customer-check" key={check.name}>
                  <div className="customer-check-main">
                    <div className="vehicle-icon"><CalendarDays size={20} /></div>
                    <div><strong>{check.name}</strong><span>{check.date}</span><span>{check.status}</span></div>
                  </div>
                  <div className="customer-check-score">
                    <div className="small-score"><span>VeriScore</span><strong>{check.score}</strong><em>{scoreTone(check.score)}</em></div>
                    <Link className="button secondary" href="/report/demo">Apri report</Link>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="panel customer-info">
            <div>
              <div className="eyebrow">IL VALORE DEL CERTIFICATO</div>
              <h2>Una verifica non finisce quando esci dall'officina.</h2>
              <p>Il risultato certificato rimane disponibile nella tua area cliente e può essere consultato tramite il report e il QR di verifica.</p>
            </div>
            <Link className="button" href="/report/demo">Vedi un esempio di certificato</Link>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
