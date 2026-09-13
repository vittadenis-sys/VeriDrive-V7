import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

const sections = [
  ["Oggetto del certificato", "Il Certificato Tecnico Indipendente VeriDrive descrive lo stato del veicolo rilevato durante il controllo, alla data, ora e chilometraggio indicati nel certificato e secondo il Protocollo VeriDrive applicato."],
  ["Limiti della verifica", "La verifica non garantisce l'assenza di difetti occulti, nascosti o intermittenti, né di anomalie che non siano manifestate o verificabili durante il controllo. Non sostituisce diagnosi specialistiche, smontaggi, prove prolungate, revisioni obbligatorie o la garanzia legale eventualmente applicabile."],
  ["Punteggio VeriScore", "Il VeriScore è un indice sintetico ottenuto dalla checklist tecnica e rappresenta esclusivamente il risultato del controllo nelle condizioni rilevate al momento dell'ispezione. Non costituisce una previsione del comportamento futuro del veicolo né una garanzia di assenza di guasti successivi."],
  ["Prova su strada", "La prova su strada è facoltativa e viene eseguita esclusivamente quando l'officina la ritiene opportuna e nelle condizioni consentite. Se non viene effettuata, il punteggio non subisce variazioni e il certificato può riportare la dicitura di prova non effettuata. Un eventuale esito negativo riguarda quanto rilevato durante quella specifica prova."],
  ["Controllo di integrità chilometrica", "Il controllo della coerenza chilometrica viene eseguito esclusivamente quando VeriDrive dispone di almeno una precedente certificazione dello stesso VIN. Differenze inferiori a 1.000 km non generano una segnalazione. Una differenza superiore a 1.000 km può generare un alert e, in assenza di una giustificazione registrata secondo le procedure VeriDrive, una penalizzazione prevista dal Protocollo applicabile."],
  ["VeriScorePlus", "Le fotografie dei difetti e le valutazioni economiche sono contenuti del report riservato al cliente e non fanno parte della pagina pubblica di verifica del certificato. La stima economica è puramente indicativa, non costituisce un preventivo, un'offerta commerciale o un importo vincolante e può variare in funzione di ricambi, manodopera, disponibilità dei componenti e ulteriori lavorazioni che emergano successivamente."],
  ["Certificato e autenticità", "Ogni certificato è associato a un codice univoco e a una pagina pubblica di verifica. Il certificato emesso viene registrato nel sistema VeriDrive secondo le regole di integrità e tracciabilità previste dal Protocollo applicabile. Eventuali correzioni sostanziali richiedono l'emissione di un nuovo certificato secondo le procedure VeriDrive."],
  ["Responsabilità e diritti", "Le presenti informazioni definiscono l'ambito del servizio e non escludono né limitano diritti, garanzie o responsabilità che non possano essere validamente esclusi o limitati ai sensi della normativa applicabile. Eventuali responsabilità devono essere valutate in relazione alle attività effettivamente svolte, alle informazioni disponibili e alle condizioni del veicolo al momento del controllo."],
];

export default function TerminiCertificatoPage() {
  return <>
    <Header />
    <main className="page">
      <div className="shell" style={{maxWidth:860}}>
        <Link href="/" style={{display:"inline-block",marginBottom:24}}>← Torna a VeriDrive</Link>
        <div className="eyebrow">VERIDRIVE · PROTOCOLLO V1.0</div>
        <h1>Termini del Certificato Tecnico Indipendente</h1>
        <p className="lead">Informazioni sull'ambito, sui limiti e sulle modalità di verifica del certificato VeriDrive.</p>
        <div style={{display:"grid",gap:14,marginTop:28}}>
          {sections.map(([title,body]) => <section className="panel" key={title}>
            <h2 style={{fontSize:"clamp(22px,4vw,30px)",marginBottom:10}}>{title}</h2>
            <p style={{marginBottom:0}}>{body}</p>
          </section>)}
        </div>
        <section className="panel" style={{marginTop:18}}>
          <h2 style={{fontSize:"clamp(22px,4vw,30px)",marginBottom:10}}>Informazione importante</h2>
          <p style={{marginBottom:0}}>Il certificato è una fotografia tecnica del veicolo nel momento del controllo. Non certifica condizioni future né fatti che non fossero rilevabili attraverso le procedure previste. Restano sempre applicabili le norme imperative e i diritti previsti dalla legge.</p>
        </section>
      </div>
    </main>
    <Footer />
  </>;
}
