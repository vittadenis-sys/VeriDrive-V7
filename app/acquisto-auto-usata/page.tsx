import Link from "next/link";
import { ArrowRight, Calculator, Camera, FileCheck2, Gauge, SearchCheck } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const services = [
  { id:"online", name:"Check Online", price:"39 €", text:"Analisi manuale dell'annuncio e della documentazione da parte di un tecnico qualificato, con risposta entro 24 ore.", href:"/prenota?service=check_online", icon:SearchCheck },
  { id:"checkup", name:"Check-up + VeriScore", price:"99 €", text:"Controllo completo del veicolo in officina, con VeriScore e certificato digitale.", href:"/prenota?service=veriscore", icon:FileCheck2, featured:true },
  { id:"veriscoreplus", name:"Check-up + VeriScorePlus", price:"149 €", text:"Tutto il Check-up + VeriScore, con foto esclusivamente dei difetti e stima indicativa dei costi di riparazione.", href:"/prenota?service=veriscore_plus", icon:Calculator }
];

export default function PurchasePage(){return <><Header/><main>
<section className="page-hero"><div className="shell"><div className="eyebrow">STAI ACQUISTANDO UN'AUTO</div><h1>Prima di comprare, fai parlare l'auto.</h1><p className="lead">Dall'analisi dell'annuncio alla verifica completa in officina. Scegli il livello di controllo che ti serve.</p><Link className="button" href="#servizi">Confronta i servizi <ArrowRight size={18}/></Link></div></section>
<section id="servizi"><div className="shell"><div className="service-landing-grid">{services.map(({id,name,price,text,href,icon:Icon,featured})=><article id={id} key={id} className={`card landing-service ${featured?"featured":""}`}><div className="icon"><Icon size={24}/></div>{featured&&<span className="recommended">PIÙ SCELTA</span>}<div className="eyebrow">{price}</div><h2>{name}</h2><p>{text}</p>{id==="veriscoreplus"&&<div className="plus-features"><div><Camera size={18}/><span>Foto dei difetti riscontrati</span></div><div><Calculator size={18}/><span>Stima indicativa dei costi</span></div><div><Gauge size={18}/><span>VeriScore + certificato</span></div></div>}<Link className="button" href={href}>Scegli {name} <ArrowRight size={18}/></Link></article>)}</div></div></section>
<section className="panel-section"><div className="shell"><div className="eyebrow">COME SCEGLIERE</div><h2>Parti dall'annuncio o vai direttamente al controllo completo.</h2><div className="steps"><div className="step"><div className="step-number">01</div><h3>Check Online</h3><p>Vuoi capire rapidamente se l'annuncio merita attenzione.</p></div><div className="step"><div className="step-number">02</div><h3>Check-up + VeriScore</h3><p>Vuoi una verifica completa del veicolo e un risultato certificato.</p></div><div className="step"><div className="step-number">03</div><h3>VeriScorePlus</h3><p>Vuoi anche foto dei difetti e una stima indicativa dei costi di riparazione.</p></div><div className="step"><div className="step-number">→</div><h3>Decidi informato</h3><p>Hai più elementi concreti prima di acquistare.</p></div></div></div></section>
<section><div className="shell cta-panel"><div><div className="eyebrow">PROSSIMO PASSO</div><h2>Hai già trovato l'auto?</h2><p className="lead">Inserisci il link dell'annuncio oppure la targa e scegli la verifica.</p></div><Link className="button" href="/prenota">Prenota <ArrowRight size={18}/></Link></div></section>
</main><Footer/></>}
