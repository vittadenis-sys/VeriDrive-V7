import Link from "next/link";
import { Plus, ShieldCheck, Wrench } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function Dashboard() {
  return (
    <>
      <Header />
      <main className="page">
        <div className="shell">
          <div className="dashboard-hero">
            <div>
              <div className="eyebrow">AREA CLIENTE</div>
              <h1>Le tue verifiche.</h1>
              <p className="lead">Accedi per vedere pratiche, appuntamenti, risultati e certificati reali.</p>
            </div>
            <Link className="button" href="/prenota"><Plus size={18} /> Nuova verifica</Link>
          </div>

          <section className="panel customer-info" style={{ marginTop: 28 }}>
            <div>
              <div className="eyebrow">AREA RISERVATA</div>
              <h2>Le pratiche appariranno qui.</h2>
              <p>Questa area non contiene più dati di esempio. Dopo l'accesso, VeriDrive mostrerà le tue prenotazioni e i documenti collegati alle verifiche effettivamente eseguite.</p>
            </div>
            <div style={{ display: "grid", gap: 10, minWidth: 220 }}>
              <Link className="button" href="/prenota">Prenota una verifica</Link>
              <Link className="button secondary" href="/officina"><Wrench size={18} /> Area officina</Link>
            </div>
          </section>

          <section className="panel customer-info" style={{ marginTop: 18 }}>
            <ShieldCheck size={26} />
            <div>
              <div className="eyebrow">CERTIFICAZIONE</div>
              <h2>Report e QR verranno associati alla pratica reale.</h2>
              <p>Nessun certificato demo viene mostrato come se appartenesse a un cliente reale.</p>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
