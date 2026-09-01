import Link from "next/link";
import { CarFront, ShieldCheck, SearchCheck, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const usedCarLevels = [
  {
    key: "entry",
    name: "Livello 1",
    description: "Una prima verifica per orientarti prima di scegliere.",
    price: "49 €",
  },
  {
    key: "plus",
    name: "Livello 2",
    description: "La verifica centrale della V1, più completa e approfondita.",
    price: "99 €",
    featured: true,
  },
  {
    key: "premium",
    name: "Livello 3",
    description: "Il livello più approfondito per chi vuole il massimo controllo.",
    price: "149 €",
  },
];

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
              Scegli il percorso che fa per te: controlla la tua auto oppure verifica un usato prima di acquistarlo.
            </p>
          </div>
        </section>

        <section id="servizi">
          <div className="shell">
            <div className="eyebrow">Scegli la tua esigenza</div>
            <h2>Come possiamo aiutarti?</h2>

            <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", alignItems: "stretch" }}>
              <article className="card">
                <div className="icon"><CarFront /></div>
                <h3>Ho già un'auto</h3>
                <p>Servizi essenziali per controllare la tua vettura prima di partire o certificarne lo stato.</p>

                <div className="cards" style={{ marginTop: 24, gridTemplateColumns: "1fr" }}>
                  <Link className="card" href="/servizi/pre-viaggio" style={{ display: "block" }}>
                    <h4>Controllo Pre Viaggio</h4>
                    <p>Un controllo mirato prima di un viaggio lungo.</p>
                    <span className="actions" style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8 }}>Scopri il servizio <ArrowRight size={16} /></span>
                  </Link>
                  <Link className="card" href="/servizi/vericert" style={{ display: "block" }}>
                    <h4>VeriCert</h4>
                    <p>Certificazione digitale dello stato del veicolo.</p>
                    <span className="actions" style={{ marginTop: 12, display: "inline-flex", alignItems: "center", gap: 8 }}>Scopri il servizio <ArrowRight size={16} /></span>
                  </Link>
                </div>
              </article>

              <article className="card">
                <div className="icon"><SearchCheck /></div>
                <h3>Devo acquistare un'auto usata</h3>
                <p>Tre livelli di verifica indipendente. Scegli la profondità del controllo in base a quanto vuoi approfondire.</p>

                <div className="cards" style={{ marginTop: 24, gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12 }}>
                  {usedCarLevels.map((level) => (
                    <Link
                      key={level.key}
                      className="card"
                      href={`/prenota?service=${level.key}`}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        border: level.featured ? "2px solid #2563EB" : undefined,
                      }}
                    >
                      <div>
                        {level.featured && <div className="eyebrow">Consigliato</div>}
                        <h4>{level.name}</h4>
                        <div className="score" style={{ fontSize: "2rem", margin: "12px 0" }}>{level.price}</div>
                        <p>{level.description}</p>
                      </div>
                      <span className="actions" style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8 }}>Scopri <ArrowRight size={16} /></span>
                    </Link>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="shell">
            <h2>Hai già scelto il servizio?</h2>
            <p>Inizia la prenotazione e segui i passaggi guidati.</p>
            <Link className="button" href="/prenota">Prenota una verifica</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
