"use client";
import { useMemo, useState } from "react";
import { VERIDRIVE_SERVICES } from "@/lib/services";

const STEPS = ["Servizio", "Veicolo", "Località", "Data", "Conferma"];
const SERVICE_KEYS = ["previaggio", "vericert", "online", "base", "plus"] as const;
type ServiceKey = (typeof SERVICE_KEYS)[number];

export function BookingForm() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const requestedService = params?.get("service") ?? "plus";
  const initialService = SERVICE_KEYS.includes(requestedService as ServiceKey) ? requestedService as ServiceKey : "plus";
  const [service, setService] = useState<ServiceKey>(initialService);
  const [referenceType, setReferenceType] = useState<"plate" | "listing">(initialService === "online" ? "listing" : "plate");
  const [urgency, setUrgency] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = VERIDRIVE_SERVICES[service];
  const price = useMemo(() => (selected.priceCents + (urgency ? 2500 : 0)) / 100, [selected.priceCents, urgency]);
  const isOnline = service === "online";

  async function submit(form: FormData) {
    setBusy(true);
    setMessage("");
    try {
      const reference = String(form.get(referenceType === "plate" ? "plate" : "listingUrl") ?? "").trim();
      if (!reference) {
        setMessage(referenceType === "plate" ? "Inserisci la targa." : "Incolla il link dell'annuncio.");
        return;
      }
      if (!isOnline && (!form.get("date") || !form.get("slot"))) {
        setMessage("Scegli data e orario per il controllo in officina.");
        return;
      }
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service,
          referenceType,
          plate: referenceType === "plate" ? reference : null,
          listingUrl: referenceType === "listing" ? reference : null,
          make: form.get("make"),
          model: form.get("model"),
          date: isOnline ? null : form.get("date"),
          slot: isOnline ? null : form.get("slot"),
          location: isOnline ? null : form.get("location"),
          urgency: isOnline ? false : urgency,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setMessage(data.error || "Impossibile creare la prenotazione.");
        return;
      }
      const checkoutResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId: data.bookingId }),
      });
      const checkout = await checkoutResponse.json();
      if (!checkoutResponse.ok || !checkout.url) {
        setMessage(checkout.error || "Prenotazione creata, ma impossibile aprire il pagamento.");
        return;
      }
      window.location.href = checkout.url;
    } catch {
      setMessage("Si è verificato un errore. Riprova tra poco.");
    } finally {
      setBusy(false);
    }
  }

  function handleServiceChange(next: ServiceKey) {
    setService(next);
    setReferenceType(next === "online" ? "listing" : "plate");
    setUrgency(false);
  }

  return (
    <form action={submit} className="panel form">
      <div className="full booking-steps" aria-label="Passaggi prenotazione">
        {STEPS.map((step, index) => (
          <div key={step} className={`booking-step ${isOnline && index >= 3 ? "muted" : ""}`}>
            <span>{index + 1}</span><small>{step}</small>
          </div>
        ))}
      </div>

      <div className="full">
        <label>Servizio
          <select name="service" value={service} onChange={(event) => handleServiceChange(event.target.value as ServiceKey)}>
            {SERVICE_KEYS.map((key) => (
              <option key={key} value={key}>{VERIDRIVE_SERVICES[key].name} — €{VERIDRIVE_SERVICES[key].priceCents / 100}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="full">
        <p><b>{isOnline ? "Servizio digitale" : "Come vuoi indicare l'auto?"}</b></p>
        {!isOnline && <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className={`button ${referenceType === "plate" ? "" : "secondary"}`} onClick={() => setReferenceType("plate")}>Targa</button>
          <button type="button" className={`button ${referenceType === "listing" ? "" : "secondary"}`} onClick={() => setReferenceType("listing")}>Link annuncio</button>
        </div>}
        {isOnline && <p style={{ marginBottom: 0 }}>Analisi manuale del link dell'annuncio, senza appuntamento in officina.</p>}
      </div>

      <label className="full">{referenceType === "plate" ? "Targa" : "Link annuncio"}
        <input name={referenceType === "plate" ? "plate" : "listingUrl"} required type={referenceType === "plate" ? "text" : "url"} placeholder={referenceType === "plate" ? "AB123CD" : "https://..."} autoCapitalize={referenceType === "plate" ? "characters" : "none"} />
      </label>

      <label>Marca <span style={{ opacity: .7 }}>(facoltativa)</span><input name="make" placeholder="Es. Volkswagen" /></label>
      <label>Modello <span style={{ opacity: .7 }}>(facoltativo)</span><input name="model" placeholder="Es. Golf 1.5 TSI" /></label>

      {!isOnline && <>
        <label className="full">Dove si trova l'auto?<input name="location" required placeholder="Indirizzo, CAP o città" /></label>
        <label>Data preferita<input name="date" type="date" required /></label>
        <label>Orario preferito<input name="slot" required placeholder="Es. 14:00" /></label>
        <label className="full" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input name="urgency" type="checkbox" checked={urgency} onChange={(event) => setUrgency(event.target.checked)} style={{ width: 22, height: 22 }} />
          <span><b>Urgenza +25 €</b><br /><small>Richiesta di disponibilità entro 24 ore.</small></span>
        </label>
      </>}

      <div className="full panel" style={{ marginTop: 8 }}>
        <p><b>Totale: €{price.toFixed(2).replace('.', ',')}</b></p>
        <p style={{ marginBottom: 0 }}>{isOnline ? "Nessun appuntamento: il servizio viene preso in carico online dopo il pagamento." : "L'appuntamento può essere spostato gratuitamente una sola volta, almeno 24 ore prima."}</p>
      </div>

      {selected.certificate && <div className="full panel" style={{ marginTop: 0 }}><p style={{ marginBottom: 4 }}><b>Certificato VeriDrive incluso</b></p><p style={{ marginBottom: 0 }}>VeriScore, risultato della verifica, certificato digitale e QR pubblico di verifica.</p></div>}
      {selected.photos && <div className="full panel" style={{ marginTop: 0 }}><p style={{ marginBottom: 4 }}><b>Verifica Plus</b></p><p style={{ marginBottom: 0 }}>Foto solamente dei difetti riscontrati e stima indicativa dei costi di riparazione.</p></div>}
      {isOnline && <div className="full notice" style={{ marginTop: 0 }}>Entro 3 ore lavorative: lunedì–venerdì 09:00–18:00, sabato 09:00–13:00. Domeniche e festivi esclusi.</div>}

      <button className="button full" disabled={busy} type="submit">{busy ? "Apertura pagamento…" : `Paga €${price.toFixed(2).replace('.', ',')} e continua`}</button>
      <p className="full" style={{ fontSize: 14, opacity: .78, marginTop: 0 }}>Il pagamento avviene online in modo sicuro.</p>
      {message && <p className="notice full">{message}</p>}
    </form>
  );
}
