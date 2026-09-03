import Link from "next/link";
import { CarFront, SearchCheck, ShieldCheck, ArrowRight, ClipboardCheck, FileCheck2, QrCode, Wrench, Gauge, Camera, Calculator } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const ownerServices = [
  {
    href: "/prenota?service=previaggio",
    name: "Controllo Viaggio",
    price: "49 €",
    description: "Controllo della tua auto prima di partire, per individuare le principali criticità di sicurezza.",
  },
  {
    href: "/prenota?service=vericert",
    name: "Check-up + VeriScore",
    price: "99 €",
    description: "Controllo completo del veicolo con checklist, VeriScore e certificato digitale.",
  },
];

const purchaseServices = [
  {
    key: "online",
    name: "Verifica Online",
    price: "39 €",
    description: "Analisi manuale di annuncio e documentazione da parte di un tecnico qualificato, entro 3 ore lavorative.",
  },
  {
    key: "base",
    name: "Controllo Base",
    price: "99 €",
    description: "Lo stesso controllo completo previsto dal servizio certificato, con VeriScore e certificato digitale.",
    featured: true,
  },
  {
    key: "plus",
    name: "Verifica Plus",
    price: "149 €",
    description: "Come il Controllo Base, con foto esclusivamente dei difetti riscontrati e stima indicativa dei costi di riparazione.",
  },
];

const steps = [
  { icon: ClipboardCheck, title: "Prenoti", text: "Inserisci targa o link dell'annuncio, posizione e momento della verifica." },
  { icon: Wrench, title: "Verifichiamo", text: "Quando serve l'officina, la pratica viene affidata automaticamente alla partner più vicina disponibile." },
  { icon: FileCheck2, title: "Ricevi il certificato", text: "Per i servizi previsti ottieni checklist, VeriScore e certificato digitale con QR." },
  { icon: QrCode, title: "Verifichi online", text: "Il QR pubblico permette di controllare l'autenticità del certificato." },
];

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="shell hero-grid">
            <div className="hero-copy">
              <div className="eyebrow">VERIDRIVE · VERIFICHE AUTO INDIPENDENTI</div>
              <h1>Conosci davvero l'auto prima di decidere.</h1>
              <p className="lead">
                Controlli professionali, VeriScore e certificazione digitale per comprare un'auto usata con più informazioni e meno sorprese.
              </p>
              <div className="actions">
                <Link className="button" href="#percorsi">Scopri le verifiche</Link>
                <Link className="button secondary" href="/prenota">Prenota una verifica</Link>
              </div>
              <div className="trust-row">
                <div><ShieldCheck size={18} /> Controlli indipendenti</div>
                <div><Gauge size={18} /> VeriScore</div>
                <div><QrCode size={18} /> Certificato verificabile</div>
              </div>
            </div>
            <div className="hero-visual" aria-label="Anteprima di un controllo auto VeriDrive">
              <div className="inspection-scene">
                <div className="scene-glow" />
                <div className="inspection-car">
                  <div className="car-roof" />
                  <div className="car-body" />
                  <div className="wheel wheel-a" />
                  <div className="wheel wheel-b" />
                  <div className="headlight" />
                </div>
                <div className="inspection-card">
                  <div className="inspection-card-top"><span>VERIDRIVE CHECK</span><span>LIVE</span></div>
                  <div className="inspection-row"><Gauge size={18} /><span>VeriScore</span><strong>92/100</strong></div>
                  <div className="inspection-row"><ShieldCheck size={18} /><span>Controlli</span><strong>48/50</strong></div>
                  <div className="inspection-row"><QrCode size={18} /><span>Certificato</span><strong>VERIFICATO</strong></div>
                </div>
              </div>
              <div className="hero-note"><span>✓</span> Metodo standardizzato · esito chiaro · storico verificabile</div>
            </div>
          </div>
        </section>

        <section className="quick-proof">
          <div className="shell quick-proof-grid">
            <div><strong>Controllo tecnico</strong><span>Checklist strutturata</span></div>
            <div><strong>VeriScore®</strong><span>Un punteggio facile da capire</span></div>
            <div><strong>Certificato digitale</strong><span>PDF + QR pubblico</span></div>
            <div><strong>Foto solo quando previste</strong><span>Difetti rilevati nella Plus</span></div>
          </div>
        </section>

        <section id="percorsi">
          <div className="shell">
            <div className="eyebrow">SCEGLI IL TUO PERCORSO</div>
            <h2>Due situazioni. Un metodo di verifica.</h2>
            <p className="lead">Scegli se vuoi controllare un'auto che già possiedi oppure verificare un'auto usata prima di acquistarla.</p>

            <div className="journeys">
              <article className="journey card">
                <div className="journey-heading">
                  <div className="icon"><CarFront size={24} /></div>
                  <div>
                    <div className="eyebrow">HO GIÀ UN'AUTO</div>
                    <h3>Controlla la tua vettura</h3>
                  </div>
                </div>
                <p>Prima di un viaggio oppure con un check-up completo e certificato.</p>
                <div className="service-list">
                  {ownerServices.map((service) => (
                    <Link key={service.href} className="service-item" href={service.href}>
                      <div>
                        <strong>{service.name}</strong>
                        <span>{service.description}</span>
                      </div>
                      <div className="service-price">{service.price}<ArrowRight size={18} /></div>
                    </Link>
                  ))}
                </div>
              </article>

              <article className="journey card">
                <div className="journey-heading">
                  <div className="icon"><SearchCheck size={24} /></div>
                  <div>
                    <div className="eyebrow">DEVO COMPRARE UN'AUTO USATA</div>
                    <h3>Verifica prima di acquistare</h3>
                  </div>
                </div>
                <p>Dalla verifica online al controllo completo in officina, scegli il livello che ti serve.</p>
                <div className="service-list">
                  {purchaseServices.map((service) => (
                    <Link key={service.key} className={`service-item ${service.featured ? "featured" : ""}`} href={`/prenota?service=${service.key}`}>
                      <div>
                        {service.featured && <span className="recommended">PIÙ SCELTA</span>}
                        <strong>{service.name}</strong>
                        <span>{service.description}</span>
                      </div>
                      <div className="service-price">{service.price}<ArrowRight size={18} /></div>
                    </Link>
                  ))}
                </div>
              </article>
            </div>
          </div>
        </section>

        <section className="panel-section">
          <div className="shell">
            <div className="eyebrow">COME FUNZIONA</div>
            <h2>Tu scegli il servizio. VeriDrive organizza il controllo.</h2>
            <div className="steps">
              {steps.map(({ icon: Icon, title, text }, index) => (
                <div className="step" key={title}>
                  <div className="step-number">0{index + 1}</div>
                  <div className="step-icon"><Icon size={22} /></div>
                  <h3>{title}</h3>
                  <p>{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="plus-showcase">
          <div className="shell plus-grid">
            <div className="plus-copy">
              <div className="eyebrow">VERIFICA PLUS · 149 €</div>
              <h2>Non solo scopri i difetti. Capisci quanto possono pesare.</h2>
              <p className="lead">La Plus aggiunge le foto dei soli difetti riscontrati e una <strong>stima indicativa dei costi di riparazione</strong>.</p>
              <p className="small-note">La stima è orientativa e non costituisce un preventivo di riparazione.</p>
              <div className="plus-features">
                <div><Camera size={19} /><span>Foto dei difetti riscontrati</span></div>
                <div><Calculator size={19} /><span>Stima indicativa dei costi</span></div>
                <div><Gauge size={19} /><span>VeriScore + certificato</span></div>
              </div>
              <Link className="button" href="/prenota?service=plus">Scopri la Verifica Plus <ArrowRight size={18} /></Link>
            </div>
            <div className="repair-card" aria-label="Esempio indicativo di stima riparazioni">
              <div className="repair-header"><span>Difetto rilevato</span><span>Stima indicativa</span></div>
              <div className="repair-line"><div><strong>Paraurti anteriore</strong><span>Graffi profondi · ripristino</span></div><b>€450–700</b></div>
              <div className="repair-line"><div><strong>Faro destro</strong><span>Supporto danneggiato</span></div><b>€180–320</b></div>
              <div className="repair-total"><span>Ordine di grandezza complessivo</span><strong>€630–1.020</strong></div>
              <small>Valore indicativo. Non è un preventivo.</small>
            </div>
          </div>
        </section>

        <section>
          <div className="shell">
            <div className="proof-grid">
              <div>
                <div className="eyebrow">PERCHÉ VERIDRIVE</div>
                <h2>Non ti diamo solo un parere. Ti lasciamo una prova.</h2>
                <p className="lead">Per i servizi certificati il risultato diventa un documento digitale verificabile, con VeriScore e QR pubblico.</p>
              </div>
              <div className="proof-cards">
                <div className="mini-card"><ShieldCheck /><strong>Metodo standardizzato</strong><span>Lo stesso approccio di controllo per rendere i risultati confrontabili.</span></div>
                <div className="mini-card"><QrCode /><strong>QR verificabile</strong><span>Il certificato può essere controllato online tramite il suo codice pubblico.</span></div>
                <div className="mini-card"><FileCheck2 /><strong>Certificato digitale</strong><span>Checklist, risultato e VeriScore raccolti in un documento condivisibile.</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="shell cta-panel">
            <div>
              <div className="eyebrow">PRONTO A PARTIRE?</div>
              <h2>Conosci prima. Decidi meglio.</h2>
              <p>Inserisci i dati della vettura e scegli il servizio più adatto.</p>
            </div>
            <Link className="button" href="/prenota">Prenota una verifica <ArrowRight size={18} /></Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
