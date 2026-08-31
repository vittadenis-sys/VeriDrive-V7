"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function BookingForm() {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(form: FormData) {
    setBusy(true);
    setMessage("");

    try {
      const response = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plate: form.get("plate"),
          make: form.get("make"),
          model: form.get("model"),
          date: form.get("date"),
          slot: form.get("slot"),
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
      <label>
        Marca
        <input name="make" required placeholder="Es. Fiat" />
      </label>
      <label>
        Modello
        <input name="model" required placeholder="Es. 500" />
      </label>
      <label>
        Targa
        <input name="plate" required placeholder="AB123CD" />
      </label>
      <label>
        Data preferita
        <input name="date" type="date" />
      </label>
      <label>
        Fascia oraria
        <select name="slot" defaultValue="">
          <option value="">Nessuna preferenza</option>
          <option>09:00–12:00</option>
          <option>14:00–18:00</option>
        </select>
      </label>
      <p className="full">
        Prezzo della verifica: <b>€79,00</b>. Dopo la prenotazione sarai portato al pagamento sicuro.
      </p>
      <button className="button full" disabled={busy} type="submit">
        {busy ? "Apertura pagamento…" : "Continua al pagamento"}
      </button>
      {message && <p className="notice full">{message}</p>}
    </form>
  );
}
