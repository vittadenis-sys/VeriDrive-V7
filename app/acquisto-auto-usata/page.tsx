import Link from "next/link";
import { ArrowRight, Calculator, Camera, FileCheck2, Gauge, SearchCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const services = [
  { id:"online", name:"Verifica Online", price:"39 €", text:"Analisi manuale di annuncio e documentazione da parte di un tecnico qualificato, entro 3 ore lavorative.", href:"/prenota?service=online", icon:SearchCheck },
  { id:"base", name:"Controllo Base", price:"99 €", text:"Controllo completo del veicolo in officina, con VeriScore e certificato digitale.", href:"/prenota?service=base", icon:FileCheck2, featured:true },
  { id:"plus", name:"Verifica Plus", price:"149 €", text:"Come il Controllo Base, con foto esclusivamente dei difetti riscontrati e stima indicativa dei costi di riparazione.", href:"/prenota?service=plus", icon:Calculator }
];

export default function PurchasePage(){
  return <><Header/><main>
    <section className="page-hero"><div className="shell"><div className="eyebrow">ACQUISTO AUTO USATA</div><h1>Prima di comprare, fai parlare l'auto.</h1><p className="lead">Dalla prima analisi dell'annuncio alla verifica completa in officina. Scegli il livello di controllo che ti serve.</p><Link className="button" href="#servizi">Confronta le verifiche <ArrowRight size={18}/></Link></div></section>
    <section id="servizi"><div className="shell"><div className="service-landing-grid">{services.map(({id,name,price,text,href,icon:Icon,featured})=><article id={id} key={id} className={`card landing-service ${featured?"featured": ""}`}><div className="icon"><Icon size={24}/></div>{featured&&<span className="recommended">PIÙ SCELTA</span>}<div className="eyebrow">{price}</div><h2>{name}</h2><p>{text}</p>{id==="plus"&&<div className="plus-features"><div><Camera size={18}/><span>Foto dei difetti riscontrati</span></div><div><Calculator size={18}/><span>Stima indicativa dei costi</span></div><div><Gauge size={18}/><span>VeriScore + certificato</span></div></div>}<Link className="button" href={href}>Scegli {name} <ArrowRight size={18}/></Link></article>)}</div></div></section>
    <section className="panel-section"><div className="shell"><div className="eyebrow">COME SCEGLIERE</div><h2>Più vuoi sapere, più sali di livello.</h2><div className="steps"><div className="step"><div className="step-number">01</div><h3>Online</h3><p>Vuoi prima capire se l'annuncio merita attenzione.</p></div><div className="step"><div className="step-number">02</div><h3>Base</h3><p>Vuoi una verifica completa del veicolo e un risultato certificato.</p></div><div className="step"><div className="step-number">03</div><h3>Plus</h3><p>Vuoi anche documentare i difetti riscontrati e avere un ordine di grandezza dei costi.</p></div><div className="step"><div className="step-number">→</div><h3>Decidi informato</h3><p>Il risultato ti aiuta a valutare l'acquisto con più elementi concreti.</p></div></div></div></section>
    <section><div className="shell cta-panel"><div><div className="eyebrow">PROSSIMO PASSO</div><h2>Hai già trovato l'auto?</h2><p className="lead">Inserisci il link dell'annuncio o la targa e prenota la verifica.</p></div><Link className="button" href="/prenota">Prenota una verifica <ArrowRight size={18}/></Link></div></section>
  </main><Footer/></>;
}
