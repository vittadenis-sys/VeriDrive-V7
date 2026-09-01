import Link from "next/link";
import { CarFront, ShieldCheck, SearchCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="shell">
            <div className="eyebrow">VeriDrive · controlli indipendenti</div>
            <h1>Verifiche indipendenti. Scelte più sicure.</h1>
            <p className="lead">
              Scegli il servizio in base alla tua esigenza. Ti aiutiamo a controllare la tua auto o a comprare un usato con maggiore consapevolezza.
            </p>
          </div>
        </section>

        <section id="servizi">
          <div className="shell">
            <div className="eyebrow">Scegli la tua esigenza</div>
            <h2>Come possiamo aiutarti?</h2>

            <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))" }}>
              <article className="card">
                <div className="icon"><CarFront /></div>
                <h3>Ho già un'auto</h3>
                <p>Servizi pensati per chi possiede già una vettura e vuole partire tranquillo o certificarne lo stato.</p>
                <div className="cards" style={{ marginTop: 20, gridTemplateColumns: "1fr" }}>
                  <Link className="card" href="/servizi/pre-viaggio" style={{ display: "block" }}>
                    <h4>Controllo Pre Viaggio</h4>
                    <p>Controllo mirato prima di un viaggio lungo.</p>
                  </Link>
                  <Link className="card" href="/servizi/vericert" style={{ display: "block" }}>
                    <h4>VeriCert</h4>
                    <p>Certificazione digitale dello stato del veicolo.</p>
                  </Link>
                </div>
              </article>

              <article className="card">
                <div className="icon"><SearchCheck /></div>
                <h3>Devo acquistare un'auto usata</h3>
                <p>Tre livelli di verifica indipendente per scegliere il servizio più adatto al tuo acquisto.</p>
                <div className="cards" style={{ marginTop: 20 }}>
                  <Link className="card" href="/prenota?service=entry" style={{ display: "block" }}>
                    <h4>Livello 1</h4>
                    <p>Prima verifica dell'auto e del suo contesto.</p>
                  </Link>
                  <Link className="card" href="/prenota?service=99" style={{ display: "block" }}>
                    <h4>Livello 2 · €99</h4>
                    <p>Il livello centrale della V1 per una verifica più completa.</p>
                  </Link>
                  <Link className="card" href="/prenota?service=premium" style={{ display: "block" }}>
                    <h4>Livello 3</h4>
                    <p>Verifica approfondita per chi vuole il massimo livello di controllo.</p>
                  </Link>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section id="prenota" className="panel">
          <div className="shell">
            <h2>Pronto a fare una scelta più sicura?</h2>
            <p>Seleziona il servizio e inizia la prenotazione.</p>
            <Link className="button" href="/prenota">Prenota una verifica</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
