import Link from "next/link";
import { ArrowRight, BadgeCheck, Building2, ClipboardList, FileCheck2, Gauge } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const creditPacks = [
  { credits: 5, label: "Starter", text: "Per iniziare a certificare le prime vetture." },
  { credits: 10, label: "Business", text: "Per un flusso regolare di verifiche in concessionaria." },
  { credits: 20, label: "Pro", text: "Per chi gestisce più vetture e vuole continuità." },
];

export default function MerchantsPage(){
  return <><Header/><main>
    <section className="page-hero"><div className="shell"><div className="eyebrow">COMMERCIANTI</div><h1>Verifica le auto che vendi con VeriDrive.</h1><p className="lead">Per i commercianti il servizio funziona a crediti: un credito corrisponde a una verifica <b>Check-up + VeriScore</b>.</p><Link className="button" href="/dashboard">Accedi all'Area Cliente <ArrowRight size={18}/></Link></div></section>
    <section><div className="shell"><div className="proof-grid"><div><div className="eyebrow">SOLO CREDITI</div><h2>Nessun prezzo per la singola verifica.</h2><p className="lead">Il commerciante acquista crediti e li utilizza sulle verifiche dei propri veicoli. Il servizio disponibile per il percorso commerciante è Check-up + VeriScore.</p></div><div className="proof-cards"><div className="mini-card"><Building2/><strong>Un credito = una verifica</strong><span>Ogni credito consente di richiedere un Check-up + VeriScore.</span></div><div className="mini-card"><Gauge/><strong>VeriScore</strong><span>Il risultato della verifica viene registrato nella pratica.</span></div><div className="mini-card"><FileCheck2/><strong>Certificato digitale</strong><span>Quando previsto, il risultato viene reso disponibile con il relativo certificato.</span></div><div className="mini-card"><BadgeCheck/><strong>Gestione semplice</strong><span>Il saldo crediti resta separato dalle pratiche già concluse.</span></div></div></div></div></section>
    <section className="panel-section"><div className="shell"><div className="eyebrow">PACCHETTI</div><h2>Scegli quanti crediti acquistare.</h2><div className="steps">{creditPacks.map(pack=><div className="step" key={pack.credits}><div className="step-number">{String(pack.credits).padStart(2,"0")}</div><h3>{pack.label}</h3><p><strong>{pack.credits} crediti</strong><br/>{pack.text}</p><Link className="button secondary" href="/dashboard" style={{marginTop:18}}>Gestisci crediti</Link></div>)}</div><p className="small-note" style={{marginTop:20}}>Il prezzo dei pacchetti viene configurato dal sistema di vendita crediti. Qui non viene mostrato un prezzo per la singola verifica.</p></div></section>
    <section><div className="shell cta-panel"><div><div className="eyebrow">PERCORSO COMMERCIALE</div><h2>Un saldo crediti. Tutte le tue verifiche.</h2><p>Il commerciante utilizza i propri crediti per richiedere le verifiche dei veicoli.</p></div><Link className="button" href="/dashboard">Vai all'Area Cliente <ArrowRight size={18}/></Link></div></section>
  </main><Footer/></>;
}
