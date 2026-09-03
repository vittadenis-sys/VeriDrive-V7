"use client";
import { useEffect, useMemo, useState } from "react";

type Workshop = { id:string; name:string; display_name:string|null; address:string|null; city:string|null; postal_code:string|null; is_primary:boolean; radius_km:number };

export function AdminWorkshopPanel(){
  const [workshops,setWorkshops]=useState<Workshop[]>([]);
  const [message,setMessage]=useState("");
  const [loading,setLoading]=useState(true);
  const [merchantId,setMerchantId]=useState("");
  const [creditBusy,setCreditBusy]=useState(false);
  useEffect(()=>{fetch("/api/workshops").then(r=>r.json()).then(d=>setWorkshops(d.workshops??[])).catch(()=>setMessage("Impossibile caricare le officine.")).finally(()=>setLoading(false));},[]);
  const primary=useMemo(()=>workshops.find(w=>w.is_primary),[workshops]);
  async function addPromo(){
    if(!merchantId.trim()){setMessage("Inserisci l'ID commerciante.");return;}
    setCreditBusy(true);setMessage("");
    const r=await fetch("/api/admin/merchants/credits",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({merchantId:merchantId.trim(),type:"promo"})});
    const d=await r.json(); setMessage(r.ok?"Credito promo +1 aggiunto.":(d.error??"Operazione non riuscita.")); setCreditBusy(false);
  }
  return <>
    <section className="panel" style={{marginBottom:18}}>
      <div className="eyebrow">Officina principale</div>
      <h2 style={{marginTop:8}}>{primary?.display_name??"VeriDrive Faloppio — Autogerma"}</h2>
      <p style={{marginBottom:0}}>{primary?.address??"Indirizzo da configurare"}{primary?.city?`, ${primary.city}`:""}</p>
    </section>
    <section className="panel">
      <div className="eyebrow">Credito commerciante</div>
      <h2 style={{marginTop:8}}>Aggiungi +1 credito promo</h2>
      <p>Il credito promo dura 15 giorni ed è utilizzabile solo presso l'officina principale.</p>
      <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:12}}>
        <input value={merchantId} onChange={e=>setMerchantId(e.target.value)} placeholder="ID commerciante" />
        <button className="button" onClick={addPromo} disabled={creditBusy}>{creditBusy?"Salvataggio…":"+1 credito promo"}</button>
      </div>
      {message&&<p className="notice" style={{marginTop:12}}>{message}</p>}
    </section>
    <section style={{marginTop:18}}><div className="eyebrow">Rete attiva</div><h2>Officine</h2>{loading?<p>Caricamento…</p>:<div className="cards">{workshops.map(w=><div className="card" key={w.id}><h3>{w.display_name??`VeriDrive ${w.city??""} — ${w.name}`}</h3><p>{w.address??"Indirizzo non impostato"}{w.city?`, ${w.city}`:""}</p><small>{w.is_primary?"Officina principale":"Partner attivo"}</small></div>)}</div>}</section>
  </>;
}
