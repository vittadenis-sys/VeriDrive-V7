"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { checklist } from "@/lib/checklist";
import { calculateWeightedVeriscore, type CheckResult } from "@/lib/veriscore";
import { VeriScore } from "@/components/VeriScore";

type Result = CheckResult;
type Props = { bookingId: string };
type InspectionResponse = { inspection?: { checklist?: Array<{ id: number; result: Result | null }>; notes?: string | null }; booking?: { service?: string | null; plate?: string | null; vin?: string | null; vehicle_mileage?: number | null; vehicle_make?: string | null; vehicle_model?: string | null; vehicle_year?: number | null } };
type Photo = { id: string; storage_path: string; caption: string | null; check_id: number | null; preview_url?: string | null };

export default function ChecklistClient({ bookingId }: Props) {
  const [values, setValues] = useState<Record<number, Result>>({});
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vehicle, setVehicle] = useState({ plate: "", make: "", model: "", year: "", vin: "", mileage: "", serviceKey: "" });
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const isCertificateService = vehicle.serviceKey === "veriscore" || vehicle.serviceKey === "veriscore_plus";
  const isPlus = vehicle.serviceKey === "veriscore_plus";
  const weightedResults = useMemo(() => Object.fromEntries(Object.entries(values).map(([id, result]) => [Number(id), result])), [values]);
  const score = useMemo(() => calculateWeightedVeriscore(weightedResults), [weightedResults]);
  const completed = checklist.filter((item) => Boolean(values[item.id])).length;
  const hasVehicleIdentity = !isCertificateService || Boolean(vehicle.plate.trim() && vehicle.vin.trim() && vehicle.mileage.trim() && Number(vehicle.mileage) >= 0);
  const canClose = completed === checklist.length && hasVehicleIdentity && (!isPlus || photos.length === 4);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const response = await fetch(`/api/workshop/inspection?bookingId=${encodeURIComponent(bookingId)}`, { cache: "no-store" });
        const data = await response.json() as InspectionResponse & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "Impossibile caricare la pratica.");
        if (!active) return;
        const next: Record<number, Result> = {};
        for (const item of data.inspection?.checklist ?? []) if (item.result) next[item.id] = item.result;
        setValues(next);
        setNotes(data.inspection?.notes ?? "");
        const booking = data.booking;
        setVehicle({
          plate: booking?.plate ?? "",
          make: booking?.vehicle_make ?? "",
          model: booking?.vehicle_model ?? "",
          year: booking?.vehicle_year != null ? String(booking.vehicle_year) : "",
          vin: booking?.vin ?? "",
          mileage: booking?.vehicle_mileage != null ? String(booking.vehicle_mileage) : "",
          serviceKey: booking?.service ?? "",
        });
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Impossibile caricare la pratica.");
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [bookingId]);

  useEffect(() => {
    if (!isPlus) return;
    let active = true;
    (async () => {
      try {
        const response = await fetch(`/api/workshop/inspection/photos?bookingId=${encodeURIComponent(bookingId)}`, { cache: "no-store" });
        const data = await response.json() as { photos?: Photo[]; error?: string };
        if (active && response.ok) setPhotos(Array.isArray(data.photos) ? data.photos.slice(0, 4) : []);
        else if (active && data.error) setMessage(data.error);
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Impossibile caricare le foto.");
      }
    })();
    return () => { active = false; };
  }, [bookingId, isPlus]);

  function setResult(id: number, result: Exclude<Result, undefined>) {
    setValues((current) => ({ ...current, [id]: current[id] === result ? undefined : result }));
    setMessage("");
  }

  async function uploadPhotos(files: FileList | null) {
    if (!files || files.length === 0 || !isPlus) return;
    const remaining = Math.max(0, 4 - photos.length);
    const selected = Array.from(files).slice(0, remaining);
    if (selected.length === 0) { setMessage("Sono già presenti 4 foto."); return; }
    if (files.length > remaining) { setMessage(`Puoi aggiungere ancora ${remaining} ${remaining === 1 ? "foto" : "foto"}. Massimo 4 foto.`); }
    setPhotoBusy(true);
    setMessage("");
    try {
      let added: Photo[] = [];
      for (const file of selected) {
        const form = new FormData();
        form.set("bookingId", bookingId);
        form.append("photos", file);
        const response = await fetch("/api/workshop/inspection/photos", { method: "POST", body: form });
        const data = await response.json() as { error?: string; photos?: Photo[] };
        if (!response.ok) throw new Error(data.error ?? "Upload foto non riuscito.");
        const latest = Array.isArray(data.photos) ? data.photos : [];
        added = latest;
        setPhotos(latest.slice(0, 4));
      }
      setMessage(`Foto caricate. ${Math.min(photos.length + selected.length, 4)}/4`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload foto non riuscito.");
    } finally {
      setPhotoBusy(false);
    }
  }

  async function saveInspection(close = false) {
    if (close && !canClose) {
      if (isPlus && photos.length !== 4) setMessage(`La Verifica Plus richiede 4 foto: al momento ce ne sono ${photos.length}.`);
      return;
    }
    setBusy(true); setMessage("");
    try {
      const checklistResults = checklist.map((item) => ({ id: item.id, area: item.area, label: item.label, result: values[item.id] ?? null }));
      const response = await fetch("/api/workshop/inspection", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId, checklist: checklistResults, notes, close,
          vehicle: isCertificateService ? { plate: vehicle.plate.trim().toUpperCase(), make: vehicle.make.trim(), model: vehicle.model.trim(), year: vehicle.year ? Number(vehicle.year) : null, vin: vehicle.vin.trim().toUpperCase(), mileage: vehicle.mileage === "" ? null : Number(vehicle.mileage) } : undefined,
        }),
      });
      const data = await response.json() as { error?: string; veriscore?: number };
      if (!response.ok) throw new Error(data.error ?? "Salvataggio non riuscito.");
      setMessage(close ? "Verifica chiusa correttamente." : `Ispezione salvata. VeriScore ${data.veriscore ?? score}/100.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Operazione non riuscita."); }
    finally { setBusy(false); }
  }

  return <main className="page"><div className="shell">
    <Link href="/officina">← Torna alla dashboard</Link>
    <div className="eyebrow" style={{ marginTop: 24 }}>Pratica {bookingId}{isPlus ? " · VeriScore Plus" : isCertificateService ? " · VeriScore" : ""}</div>
    <h1 style={{ fontSize: "clamp(34px, 6vw, 48px)" }}>Checklist tecnica</h1>
    <section className="panel" style={{ marginTop: 18 }}><div className="eyebrow">DATI VEICOLO</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 14, marginTop: 12 }}><div><small>Targa</small><strong style={{ display: "block" }}>{vehicle.plate || "—"}</strong></div><div><small>Veicolo</small><strong style={{ display: "block" }}>{[vehicle.make, vehicle.model].filter(Boolean).join(" ") || "—"}</strong></div><div><small>Anno</small><strong style={{ display: "block" }}>{vehicle.year || "—"}</strong></div><div><small>Chilometri</small><strong style={{ display: "block" }}>{vehicle.mileage || "—"}</strong></div><div className="full"><small>VIN</small><strong style={{ display: "block", wordBreak: "break-all" }}>{vehicle.vin || "—"}</strong></div></div></section>
    {isCertificateService&&<section className="panel" style={{marginTop:18}}><div className="eyebrow">DATI VEICOLO · CERTIFICATO</div><h3>Conferma i dati prima della chiusura</h3><p style={{opacity:.75}}>Completa targa, telaio e chilometraggio prima di chiudere il certificato.</p><div className="form" style={{marginTop:12}}><label>Targa<input value={vehicle.plate} onChange={e=>setVehicle(v=>({...v,plate:e.target.value}))}/></label><label>Marca<input value={vehicle.make} onChange={e=>setVehicle(v=>({...v,make:e.target.value}))}/></label><label>Modello<input value={vehicle.model} onChange={e=>setVehicle(v=>({...v,model:e.target.value}))}/></label><label>Anno<input value={vehicle.year} inputMode="numeric" onChange={e=>setVehicle(v=>({...v,year:e.target.value}))}/></label><label className="full">Telaio / VIN<input value={vehicle.vin} onChange={e=>setVehicle(v=>({...v,vin:e.target.value.toUpperCase()}))} placeholder="Inserisci il VIN completo"/></label><label className="full">Chilometri<input value={vehicle.mileage} type="number" min="0" step="1" inputMode="numeric" onChange={e=>setVehicle(v=>({...v,mileage:e.target.value}))} placeholder="Es. 48230"/></label></div>{!hasVehicleIdentity&&<p className="notice" style={{marginTop:12}}>Per chiudere VeriScore o VeriScorePlus servono targa, VIN e chilometraggio.</p>}</section>}
    {isPlus&&<section className="panel" style={{marginTop:18}}><div className="eyebrow">VERISCORE PLUS · 4 FOTO</div><h3>Documentazione fotografica</h3><p style={{opacity:.75}}>Carica esattamente 4 foto dell'auto. Verranno associate al certificato Plus.</p><input type="file" accept="image/*" multiple disabled={photoBusy||photos.length>=4} onChange={e=>{void uploadPhotos(e.target.files); e.currentTarget.value="";}}/><div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:8,marginTop:14}}>{Array.from({length:4}).map((_,index)=>{const photo=photos[index];return <div key={index} style={{aspectRatio:"4/3",borderRadius:8,overflow:"hidden",border:"1px solid #d8e2f2",background:"#f6f9ff",display:"flex",alignItems:"center",justifyContent:"center"}}>{photo?.preview_url?<img src={photo.preview_url} alt={`Foto ${index+1}`} style={{width:"100%",height:"100%",objectFit:"cover"}}/>:<span style={{fontSize:12,opacity:.55}}>{index+1}</span>}</div>;})}</div><p style={{marginTop:10,marginBottom:0,fontWeight:700}}>{photos.length}/4 foto caricate.</p>{photoBusy&&<p className="notice" style={{marginTop:10}}>Caricamento foto…</p>}</section>}
    <div className="panel" style={{display:"flex",alignItems:"center",gap:18,flexWrap:"wrap",marginTop:18,marginBottom:24}}><VeriScore score={score} size={92}/><div><p style={{marginBottom:6}}><b>{score}/100</b></p><p style={{margin:0}}>{completed}/{checklist.length} controlli compilati</p></div></div>
    {loading&&<p className="notice" style={{marginTop:18}}>Caricamento della pratica…</p>}
    <div className="checklist" style={{marginTop:24}}>{checklist.map(item=><div className="check" key={item.id} style={{display:"block"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}><span style={{minWidth:220,flex:"1 1 260px"}}><small>{item.id}. {item.area}</small><br/><b>{item.label}</b></span><div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"flex-end"}}><button type="button" className={`button ${values[item.id]==="ok"?"":"secondary"}`} onClick={()=>setResult(item.id,"ok")}>OK</button><button type="button" className={`button ${values[item.id]==="issue"?"":"secondary"}`} onClick={()=>setResult(item.id,"issue")}>Anomalia</button><button type="button" className={`button ${values[item.id]==="critical"?"":"secondary"}`} onClick={()=>setResult(item.id,"critical")}>Anomalia grave</button></div></div></div>)}</div>
    <section className="panel" style={{marginTop:24}}><h3>Note finali</h3><textarea value={notes} onChange={event=>setNotes(event.target.value)} placeholder="Annotazioni del tecnico..." rows={5} style={{width:"100%"}}/></section>
    <div className="actions" style={{marginTop:24}}><button type="button" className="button" onClick={()=>void saveInspection(false)} disabled={busy||loading||!completed}>Salva ispezione</button><button type="button" className="button" onClick={()=>void saveInspection(true)} disabled={busy||loading||!canClose}>{isCertificateService?"Chiudi e genera certificato":"Chiudi verifica"}</button></div>
    {message&&<p className="notice" style={{marginTop:16}}>{message}</p>}
  </div></main>;
}
