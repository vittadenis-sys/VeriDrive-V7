import Link from "next/link";
import { Header } from "@/components/Header";

export default function Workshops(){
  return <>
    <Header />
    <main className="page">
      <div className="shell">
        <Link href="/admin">← Amministrazione</Link>
        <div className="eyebrow" style={{marginTop:24}}>Rete partner</div>
        <h1 style={{fontSize:"clamp(38px,6vw,54px)"}}>Gestione officine</h1>
        <p className="lead">Le officine attive ricevono le pratiche. Da qui puoi controllare copertura e liquidazioni mensili.</p>
        <div className="panel" style={{marginTop:24}}>
          <h3>Officina principale</h3>
          <p style={{marginBottom:6}}><b>VeriDrive Faloppio — Autogerma</b></p>
          <p style={{margin:0,opacity:.75}}>La sede principale usa la stessa esperienza operativa delle officine partner.</p>
        </div>
        <div className="panel" style={{marginTop:18}}>
          <h3>Riepilogo operativo</h3>
          <p style={{marginBottom:0}}>In questa area verranno mostrati officine attive, verifiche concluse del mese, importi maturati e fatture ricevute.</p>
        </div>
      </div>
    </main>
  </>;
}
