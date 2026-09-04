"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { checklist } from "@/lib/checklist";
import { calculateVeriscore, scoreLabel } from "@/lib/veriscore";
import { VeriScore } from "@/components/VeriScore";

const PHOTO_POLICY = "Per la Verifica Plus, carica foto solo dei difetti riscontrati.";
type Result = "ok" | "issue" | "critical";
type Payload = { booking: { id:string; plate:string; vehicle_make:string|null; vehicle_model:string|null; vehicle_year:number|null; service_key:string; status:string }; inspection: { checklist: Record<string, Result>; notes:string|null; passed_checks:number; veriscore:number; completed_at:string|null } | null };

export default function Checklist() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const bookingId = params?.get("booking") ?? "";
  const [values, setValues] = useState<Record<number, Result | undefined>>({});
  const [notes, setNotes] = useState("");
  const [photoCount, setPhotoCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [closing, setClosing] = useState(false);
  const [message, setMessage] = useState("");
  const [payload, setPayload] = useState<Payload | null>(null);

  useEffect(() => {
    if (!bookingId) return;
    fetch(`/api/workshop/inspection?bookingId=${encodeURIComponent(bookingId)}`, { cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Pratica non trovata."); setPayload(data); return data; })
      .then((data: Payload) => {
        if (data.inspection) {
          const next: Record<number, Result | undefined> = {};
          Object.entries(data.inspection.checklist || {}).forEach(([id, result]) => { next[Number(id)] = result; });
          setValues(next); setNotes(data.inspection.notes ?? "");
        }
      })
      .catch((error) => setMessage(error instanceof Error ? error.message : "Impossibile caricare la pratica."));
  }, [bookingId]);

  const orderedValues = useMemo(() => checklist.map((item) => values[item.id]), [values]);
  const score = useMemo(() => calculateVeriscore(orderedValues), [orderedValues]);
  const completed = orderedValues.filter(Boolean).length;
  const canClose = completed === checklist.length && !!bookingId;

  function setResult(id: number, result: Result) {
    setValues((current) => ({ ...current, [id]: current[id] === result ? undefined : result }));
    setSaved(false); setMessage("");
  }

  async function saveInspection() {
    if (!bookingId) return setMessage("Apri la checklist da una pratica reale.");
    setSaved(false); setMessage("");
    try {
      const response = await fetch("/api/workshop/inspection", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, values, notes }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Impossibile salvare la verifica.");
      setSaved(true); setPayload((current) => current ? { ...current, inspection: data.inspection } : current);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Impossibile salvare la verifica."); }
  }

  async function closeInspection() {
    if (!canClose) return;
    setClosing(true); setMessage("");
    try {
      await saveInspection();
      const response = await fetch("/api/workshop/status", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId, toStatus: "completed" }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || "Impossibile chiudere la pratica.");
      setPayload((current) => current ? { ...current, booking: { ...current.booking, status: "completed" } } : current);
      setSaved(true); setMessage("Verifica chiusa correttamente.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Impossibile chiudere la pratica."); }
    finally { setClosing(false); }
  }

  const vehicle = payload?.booking ? [payload.booking.vehicle_make, payload.booking.vehicle_model, payload.booking.vehicle_year].filter(Boolean).join(" ") : "Pratica";

  return (
    <main className="page"><div className="shell">
      <Link href="/officina">← Torna alla dashboard</Link>
      <div className="eyebrow" style={{ marginTop: 24 }}>VERIFICA {payload?.booking?.id ?? bookingId || ""}</div>
      <h1 style={{ fontSize: "clamp(34px, 6vw, 48px)" }}>{vehicle}</h1>
      <p className="lead">La checklist viene salvata nella pratica reale e il VeriScore viene calcolato dai risultati inseriti.</p>

      <div className="panel" style={{ position: "sticky", top: 86, zIndex: 2, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
        <VeriScore score={score} size={92} /><div><p style={{ marginBottom: 6 }}><b>{score}/100 · {scoreLabel(score)}</b></p><p style={{ margin: 0 }}>{completed}/{checklist.length} controlli compilati</p>{!canClose && <small style={{ display: "block", marginTop: 6, opacity: .7 }}>Completa tutti i controlli per chiudere la pratica.</small>}</div>
      </div>

      <div className="checklist" style={{ marginTop: 24 }}>{checklist.map((item)=><div className="check" key={item.id} style={{ display:"block" }}><div style={{ display:"flex", justifyContent:"space-between", gap:12, alignItems:"center", flexWrap:"wrap" }}><span style={{ minWidth:220, flex:"1 1 260px" }}><small>{item.id}. {item.area}</small><br/><b>{item.label}</b></span><div style={{ display:"flex", gap:8, flexWrap:"wrap", justifyContent:"flex-end" }}><button type="button" className={`button ${values[item.id]==="ok"?"":"secondary"}`} onClick={()=>setResult(item.id,"ok")}>OK</button><button type="button" className={`button ${values[item.id]==="issue"?"":"secondary"}`} onClick={()=>setResult(item.id,"issue")}>Problema</button><button type="button" className={`button ${values[item.id]==="critical"?"":"secondary"}`} onClick={()=>setResult(item.id,"critical")}>Critico</button></div></div></div>)}</div>

      <section className="panel" style={{ marginTop:24 }}><h3>Foto dei difetti</h3><p>{PHOTO_POLICY}</p><input type="file" accept="image/*" multiple onChange={(event)=>setPhotoCount(event.target.files?.length ?? 0)}/><p style={{ marginTop:8, marginBottom:0 }}>{photoCount ? `${photoCount} foto selezionate.` : "Nessuna foto selezionata."}</p></section>
      <section className="panel" style={{ marginTop:24 }}><h3>Note finali</h3><textarea value={notes} onChange={(event)=>{setNotes(event.target.value);setSaved(false)}} placeholder="Annotazioni del tecnico..." rows={5} style={{ width:"100%" }}/></section>
      <div className="actions" style={{ marginTop:24 }}><button type="button" className="button" onClick={saveInspection} disabled={!bookingId || closing}>Salva ispezione</button>{canClose && <button type="button" className="button" onClick={closeInspection} disabled={closing}>{closing ? "Chiusura…" : "Chiudi verifica"}</button>}<Link className="button secondary" href={bookingId?`/report/demo?booking=${bookingId}`:"/report/demo"}>Anteprima report</Link></div>
      {saved && <p className="notice" style={{ marginTop:16 }}>Salvataggio completato.</p>}{message && <p className="notice" style={{ marginTop:16 }}>{message}</p>}
    </div></main>
  );
}
