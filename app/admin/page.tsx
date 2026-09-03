import Link from "next/link";
import { Header } from "@/components/Header";
import { AdminWorkshopPanel } from "@/components/AdminWorkshopPanel";

export default function Admin(){
  return <><Header/><main className="page"><div className="shell">
    <div className="eyebrow">Amministrazione VeriDrive</div>
    <h1 style={{fontSize:44}}>Controllo operativo</h1>
    <div className="metrics">
      <div className="metric">Ordini da fatturare<strong>—</strong></div>
      <div className="metric">Liquidazioni aperte<strong>—</strong></div>
      <div className="metric">Officine attive<strong>—</strong></div>
    </div>
    <section style={{padding:"32px 0"}}>
      <div className="cards">
        <Link className="card" href="/admin/workshops"><h3>Officine</h3><p>Rete partner, copertura e impostazioni.</p></Link>
        <Link className="card" href="/admin/bookings"><h3>Prenotazioni</h3><p>Pratiche e assegnazione alle officine.</p></Link>
        <Link className="card" href="/admin/payouts"><h3>Liquidazioni</h3><p>Compensi alle officine partner.</p></Link>
        <Link className="card" href="/admin/certificates"><h3>Certificati</h3><p>Controllo e revoca dei certificati.</p></Link>
        <a className="card" href="/api/admin/export?table=bookings"><h3>Esporta CSV</h3><p>Scarica le prenotazioni per contabilità e analisi.</p></a>
      </div>
    </section>
    <AdminWorkshopPanel/>
  </div></main></>;
}
