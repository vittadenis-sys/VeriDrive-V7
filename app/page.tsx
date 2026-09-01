import Link from "next/link";
import { CarFront, Plane, ShieldCheck, SearchCheck } from "lucide-react";
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
            <h1>La tranquillità di sapere cosa stai guidando.</h1>
            <p className="lead">
              Scegli il servizio in base alla tua esigenza. VeriDrive coordina il controllo e ti consegna un risultato chiaro e documentato.
            </p>
          </div>
        </section>

        <section id="servizi">
          <div className="shell">
            <div className="eyebrow">Scegli la tua esigenza</div>
            <h2>Come possiamo aiutarti?</h2>

            <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              <article className="card">
                <div className="icon"><CarFront /></div>
                <h3>Ho già un'auto</h3>
                <p>Controlla la tua vettura prima di un viaggio o ottieni una certificazione dello stato del veicolo.</p>
                <div className="actions" style={{ marginTop: 20 }}>
                  <Link className="button secondary" href="/servizi/pre-viaggio">Controllo Pre Viaggio</Link>
                  <Link className="button secondary" href="/servizi/vericert">VeriCert</Link>
                </div>
              </article>

              <article className="card">
                <div className="icon"><SearchCheck /></div>
                <h3>Devo acquistare un'auto usata</h3>
                <p>Tre livelli di verifica indipendente per aiutarti a scegliere con più sicurezza.</p>
                <div className="actions" style={{ marginTop: 20 }}>
                  <Link className="button secondary" href="/prenota?service=entry">Livello 1</Link>
                  <Link className="button" href="/prenota?service=99">Livello 2 · €99</Link>
                  <Link className="button secondary" href="/prenota?service=premium">Livello 3</Link>
                </div>
              </article>

              <article className="card">
                <div className="icon"><Plane /></div>
                <h3>Sto organizzando un viaggio lungo</h3>
                <p>Un controllo mirato prima di partire per affrontare il viaggio con maggiore serenità.</p>
                <div className="actions" style={{ marginTop: 20 }}>
                  <Link className="button secondary" href="/servizi/pre-viaggio">Scopri il controllo</Link>
                </div>
              </article>

              <article className="card">
                <div className="icon"><ShieldCheck /></div>
                <h3>Voglio certificare la mia auto</h3>
                <p>Una certificazione digitale dello stato del veicolo, utile da conservare o condividere.</p>
                <div className="actions" style={{ marginTop: 20 }}>
                  <Link className="button secondary" href="/servizi/vericert">Scopri VeriCert</Link>
                </div>
              </article>
            </div>

            <div className="panel" style={{ marginTop: 32 }}>
              <h3>Il servizio pre-acquisto parte da €99</h3>
              <p>Stiamo completando i tre livelli e le relative prestazioni. Il prezzo di €99 è il livello centrale della V1.</p>
              <Link className="button" href="/prenota?service=99">Prenota la verifica da €99</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
