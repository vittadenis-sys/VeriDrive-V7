import Link from "next/link";
import { CarFront, SearchCheck, ShieldCheck, ArrowRight, ClipboardCheck, FileCheck2, QrCode, Wrench } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const ownerServices = [
  {
    href: "/servizi/pre-viaggio",
    name: "Controllo Pre Viaggio",
    price: "49 €",
    description: "Un controllo mirato per partire più tranquillo, con esito chiaro e indicazione delle criticità.",
  },
  {
    href: "/servizi/vericert",
    name: "VeriCert",
    price: "99 €",
    description: "La verifica completa del veicolo, con checklist, VeriScore e certificazione digitale.",
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
    name: "Verifica Base",
    price: "99 €",
    description: "Controllo completo del veicolo in officina, checklist, VeriScore e report digitale.",
    featured: true,
  },
  {
    key: "plus",
    name: "Verifica Plus",
    price: "139 €",
    description: "Come la Base, con foto esclusivamente dei difetti riscontrati e una documentazione più approfondita.",
  },
];

const steps = [
  { icon: ClipboardCheck, title: "Prenoti", text: "Inserisci targa o link dell'annuncio, luogo e momento della verifica." },
  { icon: Wrench, title: "Controlliamo", text: "Una verifica indipendente viene eseguita seguendo una checklist strutturata." },
  { icon: FileCheck2, title: "Ricevi il report", text: "Ottieni esito, VeriScore e, dove previsto, le foto dei difetti riscontrati." },
  { icon: QrCode, title: "Verifichi il certificato", text: "Il QR pubblico permette di controllare l'autenticità della certificazione." },
];

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <section className="hero">
          <div className="shell">
            <div className="eyebrow">VERIDRIVE · VERIFICHE INDIPENDENTI</div>
            <h1>Controlla. Compra. Vendi.<br />Con più sicurezza.</h1>
            <p className="lead">
              Verifiche auto semplici, professionali e tracciabili. Tu scegli cosa ti serve, noi trasformiamo il controllo in informazioni che puoi capire e condividere.
            </p>
            <div className="actions">
              <Link className="button" href="#percorsi">Scopri le verifiche</Link>
              <Link className="button secondary" href="/prenota">Prenota una verifica</Link>
            </div>
            <div className="trust-row">
              <div><ShieldCheck size={18} /> Controlli indipendenti</div>
              <div><ShieldCheck size={18} /> VeriScore</div>
              <div><ShieldCheck size={18} /> QR di verifica</div>
            </div>
          </div>
        </section>

        <section id="percorsi">
          <div className="shell">
            <div className="eyebrow">SCEGLI IL TUO PERCORSO</div>
            <h2>Di cosa hai bisogno?</h2>
            <p className="lead">Due percorsi chiari, pensati per chi possiede già un'auto e per chi sta per comprarne una usata.</p>

            <div className="journeys">
              <article className="journey card">
                <div className="journey-heading">
                  <div className="icon"><CarFront size={24} /></div>
                  <div>
                    <div className="eyebrow">HO GIÀ UN'AUTO</div>
                    <h3>Voglio controllare la mia auto</h3>
                  </div>
                </div>
                <p>Prima di un viaggio oppure perché vuoi certificare lo stato della vettura con un documento verificabile.</p>
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
                    <div className="eyebrow">DEVO COMPRARE UN'AUTO</div>
                    <h3>Voglio verificare un usato</h3>
                  </div>
                </div>
                <p>Prima di acquistare, scegli il livello di controllo più adatto al tuo budget e alla tua esigenza.</p>
                <div className="service-list">
                  {purchaseServices.map((service) => (
                    <Link key={service.key} className={`service-item ${service.featured ? "featured" : ""}`} href={`/prenota?service=${service.key}`}>
                      <div>
                        {service.featured && <span className="recommended">CONSIGLIATA</span>}
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
            <h2>Dal controllo al certificato, senza complicazioni.</h2>
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

        <section>
          <div className="shell">
            <div className="proof-grid">
              <div>
                <div className="eyebrow">PERCHÉ VERIDRIVE</div>
                <h2>Non ti diamo solo un parere. Ti lasciamo una prova.</h2>
                <p className="lead">Ogni verifica è pensata per produrre un risultato leggibile, condivisibile e collegato a una certificazione pubblicamente verificabile.</p>
              </div>
              <div className="proof-cards">
                <div className="mini-card"><ShieldCheck /><strong>VeriScore</strong><span>Un punteggio immediato per leggere il risultato a colpo d'occhio.</span></div>
                <div className="mini-card"><QrCode /><strong>QR verificabile</strong><span>Il certificato può essere controllato online tramite codice pubblico.</span></div>
                <div className="mini-card"><FileCheck2 /><strong>Report digitale</strong><span>Checklist e risultato raccolti in un documento chiaro.</span></div>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="shell cta-panel">
            <div>
              <div className="eyebrow">PRONTO A PARTIRE?</div>
              <h2>Fai verificare l'auto prima di decidere.</h2>
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
