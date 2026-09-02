"use client";
import { useMemo, useState } from "react";

const SERVICES = {
  online: { name: "Verifica Online", price: 39 },
  base: { name: "Verifica Base", price: 99 },
  plus: { name: "Verifica Plus", price: 139 },
  previaggio: { name: "Controllo Pre Viaggio", price: 49 },
  vericert: { name: "VeriCert", price: 99 },
} as const;

const MOVE_POLICY = "Appuntamento modificabile gratuitamente una sola volta, almeno 24 ore prima.";

export function BookingForm() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialService = params?.get("service") ?? "plus";
  const [service, setService] = useState<keyof typeof SERVICES>(initialService in SERVICES ? initialService as keyof typeof SERVICES : "plus");
  const [referenceType, setReferenceType] = useState<"plate" | "listing">(service === "online" ? "listing" : "plate");
  const [urgency, setUrgency] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const price = useMemo(() => SERVICES[service].price + (urgency ? 25 : 0), [service, urgency]);

  async function submit(form: FormData) {
    setBusy(true);
    setMessage("");

    try {
      const reference = String(form.get(referenceType === "plate" ? "plate" : "listingUrl") ?? "").trim();
      if (!reference) {
        setMessage(referenceType === "plate" ? "Inserisci la targa." : "Incolla il link dell'annuncio.");
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
          date: form.get("date"),
          slot: form.get("slot"),
          location: form.get("location"),
          urgency,
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

  return (
    <form action={submit} className="panel form">
      <div className="full">
        <label>
          Servizio
          <select name="service" value={service} onChange={(event) => setService(event.target.value as keyof typeof SERVICES)}>
            <option value="previaggio">Controllo Pre Viaggio — €49</option>
            <option value="vericert">VeriCert — €99</option>
            <option value="online">Verifica Online — €39</option>
            <option value="base">Verifica Base — €99</option>
            <option value="plus">Verifica Plus — €139</option>
          </select>
        </label>
      </div>

      <div className="full">
        <p><b>1. Come vuoi indicare l'auto?</b></p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className={`button ${referenceType === "plate" ? "" : "secondary"}`} onClick={() => setReferenceType("plate")}>Targa</button>
          <button type="button" className={`button ${referenceType === "listing" ? "" : "secondary"}`} onClick={() => setReferenceType("listing")}>Link annuncio</button>
        </div>
      </div>

      {referenceType === "plate" ? (
        <label className="full">Targa<input name="plate" required placeholder="AB123CD" autoCapitalize="characters" /></label>
      ) : (
        <label className="full">Link annuncio<input name="listingUrl" required type="url" placeholder="https://..." /></label>
      )}

      <label>Marca <span style={{ opacity: 0.7 }}>(facoltativa)</span><input name="make" placeholder="Es. Volkswagen" /></label>
      <label>Modello <span style={{ opacity: 0.7 }}>(facoltativo)</span><input name="model" placeholder="Es. Golf 1.5 TSI" /></label>
      <label className="full">Dove si trova l'auto?<input name="location" required placeholder="Indirizzo, CAP o città" /></label>
      <label>Data preferita<input name="date" type="date" required /></label>
      <label>Orario preferito<input name="slot" required placeholder="Es. 14:00" /></label>

      {service !== "online" && (
        <label className="full" style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <input name="urgency" type="checkbox" checked={urgency} onChange={(event) => setUrgency(event.target.checked)} style={{ width: 22, height: 22 }} />
          <span><b>Urgenza +25 €</b><br /><small>Richiesta di disponibilità entro 24 ore.</small></span>
        </label>
      )}

      <div className="full panel" style={{ marginTop: 8 }}>
        <p><b>Totale: €{price},00</b></p>
        <p style={{ marginBottom: 0 }}>{MOVE_POLICY}</p>
      </div>

      {service === "plus" && (
        <div className="full panel" style={{ marginTop: 0 }}>
          <p style={{ marginBottom: 8 }}><b>Cosa include la Verifica Plus</b></p>
          <p style={{ marginBottom: 4 }}>✓ Controllo completo della checklist</p>
          <p style={{ marginBottom: 4 }}>✓ VeriScore e report digitale</p>
          <p style={{ marginBottom: 0 }}>✓ Foto solamente dei difetti riscontrati</p>
        </div>
      )}

      {service === "online" && (
        <div className="full panel" style={{ marginTop: 0 }}>
          <p style={{ marginBottom: 4 }}><b>Verifica Online</b></p>
          <p style={{ marginBottom: 0 }}>Analisi manuale da parte di un tecnico qualificato entro 3 ore lavorative. Servizio non garantito la domenica e nei festivi.</p>
        </div>
      )}

      <button className="button full" disabled={busy} type="submit">{busy ? "Apertura pagamento…" : `Paga €${price},00 e prenota`}</button>
      <p className="full" style={{ fontSize: 14, opacity: 0.78, marginTop: 0 }}>Il pagamento avviene online in modo sicuro. Dopo il pagamento riceverai la conferma della prenotazione.</p>
      {message && <p className="notice full">{message}</p>}
    </form>
  );
}
