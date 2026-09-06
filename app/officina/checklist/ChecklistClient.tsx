"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { checklist } from "@/lib/checklist";
import { checkViaggioChecklist, calculateTravelReliability, travelReliabilityLabel, type TravelCheckResult } from "@/lib/check-viaggio";
import { calculateVeriscore, scoreLabel } from "@/lib/veriscore";
import { VeriScore } from "@/components/VeriScore";

type Result = "ok" | "issue" | "critical" | undefined;
type Props = { bookingId: string };
type BookingInfo = { service_key: string };
type InspectionResponse = { inspection?: { checklist?: Array<{ id: number; result: Result | null }>; notes?: string | null } };

export default function ChecklistClient({ bookingId }: Props) {
  const [serviceKey, setServiceKey] = useState<string>("");
  const [values, setValues] = useState<Record<number, Result>>({});
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const isTravel = serviceKey === "check_viaggio";
  const items = isTravel ? checkViaggioChecklist : checklist;
  const travelValues = values as Record<number, TravelCheckResult>;
  const score = useMemo(() => isTravel ? calculateTravelReliability(travelValues) : calculateVeriscore(checklist.map((item) => values[item.id] === "ok")), [isTravel, travelValues, values]);
  const completed = Object.values(values).filter(Boolean).length;
  const canClose = completed === items.length;

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const bookingResponse = await fetch(`/api/workshop/booking?bookingId=${encodeURIComponent(bookingId)}`, { cache: "no-store" });
        if (bookingResponse.ok) {
          const booking = await bookingResponse.json() as BookingInfo;
          if (active) setServiceKey(booking.service_key);
        }
        const response = await fetch(`/api/workshop/inspection?bookingId=${encodeURIComponent(bookingId)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as InspectionResponse;
        const saved = data.inspection?.checklist ?? [];
        if (!active) return;
        const next: Record<number, Result> = {};
        for (const item of saved) if (item.result) next[item.id] = item.result;
        setValues(next);
        setNotes(data.inspection?.notes ?? "");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [bookingId]);

  function setResult(id: number, result: Exclude<Result, undefined>) {
    setValues((current) => ({ ...current, [id]: current[id] === result ? undefined : result }));
    setMessage("");
  }

  async function saveInspection(close = false) {
    if (close && !canClose) return;
    setBusy(true); setMessage("");
    try {
      const checklistResults = items.map((item) => ({ id: item.id, area: item.area, label: item.label, result: values[item.id] ?? null }));
      const response = await fetch("/api/workshop/inspection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, checklist: checklistResults, notes, close }),
      });
      const data = await response.json() as { error?: string; veriscore?: number; travelReliability?: number };
      if (!response.ok) throw new Error(data.error ?? "Salvataggio non riuscito.");
      if (close) {
        const statusResponse = await fetch("/api/workshop/status", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ bookingId, toStatus: "completed" }),
        });
        const statusData = await statusResponse.json() as { error?: string };
        if (!statusResponse.ok) throw new Error(statusData.error ?? "Impossibile chiudere la verifica.");
      }
      setMessage(close ? "Verifica chiusa correttamente." : isTravel ? `Ispezione salvata. Indice Affidabilità Viaggio ${data.travelReliability ?? score}/10.` : `Ispezione salvata. VeriScore ${data.veriscore ?? score}/100.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operazione non riuscita.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="page">
      <div className="shell">
        <Link href="/officina">← Torna alla dashboard</Link>
        <div className="eyebrow" style={{ marginTop: 24 }}>Pratica {bookingId}</div>
        <h1 style={{ fontSize: "clamp(34px, 6vw, 48px)" }}>{isTravel ? "Check Viaggio" : "Checklist tecnica"}</h1>

        <div className="panel" style={{ position: "sticky", top: 86, zIndex: 2, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
          {isTravel ? <div style={{ minWidth: 92, fontSize: 42, fontWeight: 800, lineHeight: 1 }}>{score.toFixed(1)}<span style={{ fontSize: 18, opacity: .65 }}>/10</span></div> : <VeriScore score={score} size={92} />}
          <div>
            <p style={{ marginBottom: 6 }}><b>{isTravel ? travelReliabilityLabel(score) : `${score}/100 · ${scoreLabel(score)}`}</b></p>
            <p style={{ margin: 0 }}>{completed}/{items.length} controlli compilati</p>
            {!canClose && <small style={{ display: "block", marginTop: 6, opacity: .7 }}>Completa tutti i controlli per chiudere la pratica.</small>}
          </div>
        </div>

        {loading && <p className="notice" style={{ marginTop: 18 }}>Caricamento della pratica…</p>}

        {isTravel && <div className="notice" style={{ marginTop: 18 }}>Controllo viaggio rapido: 9 verifiche essenziali. La voce <b>Spie / Diagnosi</b> vale 2 punti e <b>Altri problemi rilevati</b> vale 1 punto.</div>}

        <div className="checklist" style={{ marginTop: 24 }}>
          {items.map((item) => (
            <div className="check" key={item.id} style={{ display: "block" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ minWidth: 220, flex: "1 1 260px" }}><small>{item.id}. {item.area}</small><br /><b>{item.label}</b>{"weight" in item && isTravel && <small style={{ display: "block", marginTop: 4, opacity: .7 }}>{item.weight.toFixed(1)} punti</small>}</span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                  <button type="button" className={`button ${values[item.id] === "ok" ? "" : "secondary"}`} onClick={() => setResult(item.id, "ok")}>OK</button>
                  <button type="button" className={`button ${values[item.id] === "issue" ? "" : "secondary"}`} onClick={() => setResult(item.id, "issue")}>Problema</button>
                  <button type="button" className={`button ${values[item.id] === "critical" ? "" : "secondary"}`} onClick={() => setResult(item.id, "critical")}>Critico</button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <section className="panel" style={{ marginTop: 24 }}>
          <h3>Note finali</h3>
          <textarea value={notes} onChange={(event) => { setNotes(event.target.value); setMessage(""); }} placeholder="Annotazioni del tecnico..." rows={5} style={{ width: "100%" }} />
        </section>

        <div className="actions" style={{ marginTop: 24 }}>
          <button type="button" className="button" onClick={() => void saveInspection(false)} disabled={busy || loading || !completed}>Salva ispezione</button>
          {canClose && <button type="button" className="button" onClick={() => void saveInspection(true)} disabled={busy || loading}>Chiudi verifica</button>}
        </div>

        {message && <p className="notice" style={{ marginTop: 16 }}>{message}</p>}
      </div>
    </main>
  );
}
