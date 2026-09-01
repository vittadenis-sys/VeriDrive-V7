"use client";
import { useMemo, useState } from "react";

const MOVE_POLICY = "Appuntamento modificabile gratuitamente una sola volta fino a 24 ore prima.";

export function BookingForm() {
  const [service, setService] = useState("plus");
  const [referenceType, setReferenceType] = useState<"plate" | "listing">("plate");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const price = useMemo(() => (service === "plus" ? 99 : 0), [service]);

  async function submit(form: FormData) {
    setBusy(true);
    setMessage("");

    try {
      const reference = String(form.get(referenceType === "plate" ? "plate" : "listingUrl") ?? "").trim();
      if (!reference) {
        setMessage(referenceType === "plate" ? "Inserisci la targa." : "Incolla il link dell'annuncio.");
        return;
      }

      if (service !== "plus") {
        setMessage("Questa prenotazione V1 è disponibile al momento per il servizio da €99.");
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
          <select name="service" value={service} onChange={(event) => setService(event.target.value)}>
            <option value="plus">Verifica — €99</option>
          </select>
        </label>
      </div>

      <div className="full">
        <p><b>1. Come vuoi indicare l'auto?</b></p>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button type="button" className={`button ${referenceType === "plate" ? "" : "secondary"}`} onClick={() => setReferenceType("plate")}>
            Targa
          </button>
          <button type="button" className={`button ${referenceType === "listing" ? "" : "secondary"}`} onClick={() => setReferenceType("listing")}>
            Link annuncio
          </button>
        </div>
      </div>

      {referenceType === "plate" ? (
        <label>
          Targa
          <input name="plate" required placeholder="AB123CD" autoCapitalize="characters" />
        </label>
      ) : (
        <label className="full">
          Link annuncio
          <input name="listingUrl" required type="url" placeholder="https://..." />
        </label>
      )}

      <label>
        Marca <span style={{ opacity: 0.7 }}>(facoltativa)</span>
        <input name="make" placeholder="Es. Volkswagen" />
      </label>
      <label>
        Modello <span style={{ opacity: 0.7 }}>(facoltativo)</span>
        <input name="model" placeholder="Es. Golf 1.5 TSI" />
      </label>

      <label className="full">
        Dove si trova l'auto?
        <input name="location" required placeholder="Indirizzo, CAP o città" />
      </label>

      <label>
        Data preferita
        <input name="date" type="date" required />
      </label>
      <label>
        Fascia oraria
        <select name="slot" defaultValue="" required>
          <option value="">Seleziona</option>
          <option>09:00–12:00</option>
          <option>14:00–18:00</option>
        </select>
      </label>

      <div className="full panel" style={{ marginTop: 8 }}>
        <p><b>Prima del pagamento</b></p>
        <p style={{ marginBottom: 8 }}>Totale: <b>€{price},00</b></p>
        <p style={{ marginBottom: 0 }}>{MOVE_POLICY}</p>
      </div>

      <button className="button full" disabled={busy} type="submit">
        {busy ? "Apertura pagamento…" : `Paga €${price},00 e prenota`}
      </button>
      <p className="full" style={{ fontSize: 14, opacity: 0.78, marginTop: 0 }}>
        Il pagamento avviene online in modo sicuro. Dopo il pagamento riceverai la conferma della prenotazione.
      </p>
      {message && <p className="notice full">{message}</p>}
    </form>
  );
}
