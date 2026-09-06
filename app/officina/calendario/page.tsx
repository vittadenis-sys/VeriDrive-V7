import Link from "next/link";
import { Header } from "@/components/Header";
import { WorkshopClosures } from "@/components/WorkshopClosures";
import AgendaPage from "@/app/officina/calendario/AgendaPage";

export default function Calendar() {
  return <><Header/><main className="page"><div className="shell" style={{maxWidth:850}}>
    <Link href="/officina">← Dashboard officina</Link>
    <div className="eyebrow" style={{marginTop:24}}>Disponibilità</div>
    <h1 style={{fontSize:44}}>Calendario e chiusure</h1>
    <p className="lead">Gli appuntamenti vengono organizzati su slot da un'ora. Le chiusure escludono automaticamente le nuove prenotazioni.</p>
    <AgendaPage />
    <WorkshopClosures />
  </div></main></>;
}
