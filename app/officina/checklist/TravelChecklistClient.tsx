"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { calculateTravelReliability, travelReliabilityLabel, type TravelResult } from "@/lib/travel-index";
import { checklist } from "@/lib/checklist";

const travelChecklist = checklist.slice(0, 30);

type Props = { bookingId: string };

type InspectionResponse = { inspection?: { checklist?: Array<{ id: number; result: TravelResult }>; notes?: string | null } };

export default function TravelChecklistClient({ bookingId }: Props) {
  const [values, setValues] = useState<Record<number, TravelResult>>({});
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const score = useMemo(() => calculateTravelReliability(travelChecklist.map((item) => values[item.id])), [values]);
  const completed = travelChecklist.filter((item) => values[item.id]).length;
  const canClose = completed === travelChecklist.length;

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/workshop/inspection?bookingId=${encodeURIComponent(bookingId)}`, { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json() as InspectionResponse;
        if (!active) return;
        const next: Record<number, TravelResult> = {};
        for (const item of data.inspection?.checklist ?? []) {
          if (item.id <= 30 && item.result) next[item.id] = item.result;
        }
        setValues(next);
        setNotes(data.inspection?.notes ?? "");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [bookingId]);

  async function save(close = false) {
    if (close && !canClose) return;
    setBusy(true); setMessage("");
    try {
      const results = travelChecklist.map((item) => ({ id: item.id, area: item.area, label: item.label, result: values[item.id] ?? null }));
      const response = await fetch("/api/workshop/inspection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, checklist: results, notes, close, serviceKey: "check_viaggio" }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Salvataggio non riuscito.");
      if (close) {
        const statusResponse = await fetch("/api/workshop/status", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, toStatus: "completed" }) });
        const statusData = await statusResponse.json() as { error?: string };
        if (!statusResponse.ok) throw new Error(statusData.error ?? "Impossibile chiudere la verifica.");
      }
      setMessage(close ? "Check Viaggio chiuso correttamente." : `Check Viaggio salvato. Indice ${score.toFixed(1).replace('.', ',')}/10.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operazione non riuscita.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="page"><div className="shell">
    <Link href="/officina">← Torna alla dashboard</Link>
    <div className="eyebrow" style={{ marginTop: 24 }}>CHECK VIAGGIO · Pratica {bookingId}</div>
    <h1 style={{ fontSize: "clamp(34px, 6vw, 48px)" }}>Checklist viaggio</h1>
    <div className="panel" style={{ position: "sticky", top: 86, zIndex: 2, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
      <div style={{ width: 92, height: 92, borderRadius: "50%", display: "grid", placeItems: "center", border: "8px solid currentColor" }}><strong style={{ fontSize: 26 }}>{score.toFixed(1).replace('.', ',')}</strong></div>
      <div><p style={{ marginBottom: 6 }}><b>Indice Affidabilità Viaggio · {score.toFixed(1).replace('.', ',')}/10</b></p><p style={{ margin: 0 }}>{travelReliabilityLabel(score)}</p><small style={{ display: "block", marginTop: 6, opacity: .7 }}>{completed}/30 controlli compilati. Il Check Viaggio non genera un VeriScore.</small></div>
    </div>
    {loading && <p className="notice" style={{ marginTop: 18 }}>Caricamento della pratica…</p>}
    <div className="checklist" style={{ marginTop: 24 }}>
      {travelChecklist.map((item) => <div className="check" key={item.id} style={{ display: "block" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><span style={{ minWidth: 220, flex: "1 1 260px" }}><small>{item.id}. {item.area}</small><br/><b>{item.label}</b></span><div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}><button type="button" className={`button ${values[item.id] === "ok" ? "" : "secondary"}`} onClick={() => setValues((current) => ({ ...current, [item.id]: current[item.id] === "ok" ? undefined : "ok" }))}>OK</button><button type="button" className={`button ${values[item.id] === "issue" ? "" : "secondary"}`} onClick={() => setValues((current) => ({ ...current, [item.id]: current[item.id] === "issue" ? undefined : "issue" }))}>Attenzione</button><button type="button" className={`button ${values[item.id] === "critical" ? "" : "secondary"}`} onClick={() => setValues((current) => ({ ...current, [item.id]: current[item.id] === "critical" ? undefined : "critical" }))}>Critico</button></div></div></div>)}
    </div>
    <section className="panel" style={{ marginTop: 24 }}><h3>Note finali</h3><textarea value={notes} onChange={(event) => { setNotes(event.target.value); setMessage(""); }} placeholder="Indicazioni utili per il viaggio…" rows={5} style={{ width: "100%" }}/></section>
    <div className="actions" style={{ marginTop: 24 }}><button type="button" className="button" onClick={() => void save(false)} disabled={busy || loading || !completed}>Salva Check Viaggio</button>{canClose && <button type="button" className="button" onClick={() => void save(true)} disabled={busy || loading}>Chiudi verifica</button>}</div>
    {message && <p className="notice" style={{ marginTop: 16 }}>{message}</p>}
  </div></main>;
}
