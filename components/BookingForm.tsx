"use client";
import { useMemo, useState } from "react";
import { VERIDRIVE_SERVICES, CUSTOMER_SERVICE_GROUPS } from "@/lib/services";

type ServiceKey = keyof typeof VERIDRIVE_SERVICES;
type Workshop = { id:string; display_name:string; city:string|null; address:string|null; postal_code:string|null; availableSlots:string[]; latitude:number|null; longitude:number|null };

function distanceKm(lat1:number, lon1:number, lat2:number, lon2:number){
  const r=6371; const dLat=(lat2-lat1)*Math.PI/180; const dLon=(lon2-lon1)*Math.PI/180;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;
  return 2*r*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}

export function BookingForm(){
  const params=typeof window!=="undefined"?new URLSearchParams(window.location.search):null;
  const requestedService=params?.get("service") as ServiceKey|null;
  const requestedPath=params?.get("path");
  const initialService:ServiceKey=requestedService&&requestedService in VERIDRIVE_SERVICES?requestedService:requestedPath==="own_car"?"check_viaggio":"veriscore_plus";
  const [service,setService]=useState<ServiceKey>(initialService);
  const [referenceType,setReferenceType]=useState<"plate"|"listing">(initialService==="check_online"?"listing":"plate");
  const [urgency,setUrgency]=useState(false);
  const [date,setDate]=useState(""); const [slot,setSlot]=useState(""); const [location,setLocation]=useState("");
  const [workshops,setWorkshops]=useState<(Workshop&{distanceKm?:number})[]>([]); const [selectedWorkshop,setSelectedWorkshop]=useState("");
  const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false); const [loadingSlots,setLoadingSlots]=useState(false);
  const selected=VERIDRIVE_SERVICES[service];
  const price=useMemo(()=>(selected.priceCents+(urgency?2500:0))/100,[selected.priceCents,urgency]);
  const isOnline=service==="check_online";
  const customerServices=[...new Set([...CUSTOMER_SERVICE_GROUPS.own_car,...CUSTOMER_SERVICE_GROUPS.buying_used])] as ServiceKey[];

  async function refreshAvailability(nextService=service,nextDate=date,nextUrgency=urgency){
    if(!nextDate||VERIDRIVE_SERVICES[nextService].workshop===false){setWorkshops([]);setSelectedWorkshop("");return;}
    setLoadingSlots(true); setMessage("");
    try{
      const response=await fetch(`/api/bookings/availability?service=${encodeURIComponent(nextService)}&date=${encodeURIComponent(nextDate)}&urgency=${nextUrgency}`,{cache:"no-store"});
      const data=await response.json(); if(!response.ok) throw new Error(data.error||"Disponibilità non disponibile.");
      let nextWorkshops:(Workshop&{distanceKm?:number})[] = data.workshops??[];
      if(typeof navigator!=="undefined"&&navigator.geolocation){
        await new Promise<void>((resolve)=>navigator.geolocation.getCurrentPosition(position=>{
          const {latitude,longitude}=position.coords;
          nextWorkshops=nextWorkshops.map(workshop=>workshop.latitude!=null&&workshop.longitude!=null?{...workshop,distanceKm:distanceKm(latitude,longitude,workshop.latitude,workshop.longitude)}:workshop).sort((a,b)=>(a.distanceKm??Number.POSITIVE_INFINITY)-(b.distanceKm??Number.POSITIVE_INFINITY));
          resolve();
        },()=>resolve(),{enableHighAccuracy:false,maximumAge:300000,timeout:5000}));
      }
      setWorkshops(nextWorkshops); setSelectedWorkshop(""); setSlot("");
    }catch(error){setWorkshops([]);setMessage(error instanceof Error?error.message:"Disponibilità non disponibile.");}
    finally{setLoadingSlots(false);}
  }

  function handleServiceChange(next:ServiceKey){setService(next);setReferenceType(next==="check_online"?"listing":"plate");setUrgency(false);setWorkshops([]);setSelectedWorkshop("");setSlot("");}

  async function submit(form:FormData){
    setBusy(true);setMessage("");
    try{
      const reference=String(form.get(referenceType==="plate"?"plate":"listingUrl")??"").trim();
      if(!reference){setMessage(referenceType==="plate"?"Inserisci la targa.":"Incolla il link dell'annuncio.");return;}
      if(!isOnline&&(!date||!slot||!selectedWorkshop)){setMessage("Seleziona officina, data e orario.");return;}
      const response=await fetch("/api/bookings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service,referenceType,plate:referenceType==="plate"?reference:null,listingUrl:referenceType==="listing"?reference:null,make:form.get("make"),model:form.get("model"),date:isOnline?null:date,slot:isOnline?null:slot,location:isOnline?null:location,urgency:isOnline?false:urgency,workshopId:isOnline?null:selectedWorkshop})});
      const data=await response.json(); if(!response.ok){setMessage(data.error||"Impossibile creare la prenotazione.");return;}
      const checkoutResponse=await fetch("/api/checkout",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({bookingId:data.bookingId})});
      const checkout=await checkoutResponse.json(); if(!checkoutResponse.ok||!checkout.url){setMessage(checkout.error||"Prenotazione creata, ma impossibile aprire il pagamento.");return;}
      window.location.href=checkout.url;
    }catch{setMessage("Si è verificato un errore. Riprova tra poco.");}finally{setBusy(false);}
  }

  return <form action={submit} className="panel form">
    <div className="full booking-steps" aria-label="Passaggi prenotazione"><div className="booking-step"><span>1</span><small>Servizio</small></div><div className="booking-step"><span>2</span><small>Veicolo</small></div><div className="booking-step"><span>3</span><small>Officina</small></div><div className="booking-step"><span>4</span><small>Data e ora</small></div><div className="booking-step"><span>5</span><small>Pagamento</small></div></div>
    <div className="full"><label>Servizio<select name="service" value={service} onChange={e=>handleServiceChange(e.target.value as ServiceKey)}>{customerServices.map(key=><option key={key} value={key}>{VERIDRIVE_SERVICES[key].name} — €{VERIDRIVE_SERVICES[key].priceCents/100}</option>)}</select></label></div>
    <div className="full"><p><b>{isOnline?"Servizio digitale":"Come vuoi indicare l'auto?"}</b></p>{!isOnline&&<div style={{display:"flex",gap:12,flexWrap:"wrap"}}><button type="button" className={`button ${referenceType==="plate"?"":"secondary"}`} onClick={()=>setReferenceType("plate")}>Targa</button><button type="button" className={`button ${referenceType==="listing"?"":"secondary"}`} onClick={()=>setReferenceType("listing")}>Link annuncio</button></div>}{isOnline&&<p style={{marginBottom:0}}>Analisi manuale dell'annuncio, senza appuntamento in officina. Risposta entro 24 ore.</p>}</div>
    <label className="full">{referenceType==="plate"?"Targa":"Link annuncio"}<input name={referenceType==="plate"?"plate":"listingUrl"} required type={referenceType==="plate"?"text":"url"} placeholder={referenceType==="plate"?"AB123CD":"https://..."} autoCapitalize={referenceType==="plate"?"characters":"none"}/></label>
    <label>Marca <span style={{opacity:.7}}>(facoltativa)</span><input name="make" placeholder="Es. Volkswagen"/></label>
    <label>Modello <span style={{opacity:.7}}>(facoltativo)</span><input name="model" placeholder="Es. Golf 1.5 TSI"/></label>
    {!isOnline&&<>
      <label className="full">Dove si trova l'auto?<input name="location" value={location} onChange={e=>setLocation(e.target.value)} required placeholder="Indirizzo, CAP o città"/></label>
      <label className="full">Data preferita<input name="date" type="date" value={date} onChange={e=>{setDate(e.target.value);void refreshAvailability(service,e.target.value,urgency);}} required/></label>
      <label className="full">Officina e slot{loadingSlots?<span>Ricerca disponibilità e distanza…</span>:workshops.length===0?<span className="notice" style={{marginTop:0}}>Scegli una data per vedere le officine disponibili.</span>:<div style={{display:"grid",gap:10}}>{workshops.map(workshop=><div key={workshop.id} className={`card ${selectedWorkshop===workshop.id?"selected-option":""}`} style={{padding:14}}><button type="button" className="button secondary" style={{width:"100%",justifyContent:"space-between"}} onClick={()=>{setSelectedWorkshop(workshop.id);setSlot("");}}><span style={{textAlign:"left"}}><b>{workshop.display_name}</b><small style={{display:"block",marginTop:4,opacity:.75}}>{[workshop.address,workshop.postal_code,workshop.city].filter(Boolean).join(" · ")}{workshop.distanceKm!=null?` · ${workshop.distanceKm.toFixed(1).replace('.',',')} km`:""}</small></span><span>Seleziona</span></button>{selectedWorkshop===workshop.id&&<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:10}}>{workshop.availableSlots.map(item=><button key={item} type="button" className={`button ${slot===item?"":"secondary"}`} onClick={()=>setSlot(item)}>{item}</button>)}</div>}</div>)}</div>}</label>
      <label className="full" style={{display:"flex",gap:12,alignItems:"center"}}><input name="urgency" type="checkbox" checked={urgency} onChange={e=>{setUrgency(e.target.checked);if(date)void refreshAvailability(service,date,e.target.checked);}} style={{width:22,height:22}}/><span><b>Urgenza +25 €</b><br/><small>Disponibilità tra 24 e 48 ore, quando presente.</small></span></label>
    </>}
    <div className="full panel" style={{marginTop:8}}><p><b>Totale: €{price.toFixed(2).replace('.',',')}</b></p><p style={{marginBottom:0}}>{isOnline?"Nessun appuntamento: il servizio viene preso in carico online dopo il pagamento.":"Gli appuntamenti standard richiedono almeno 48 ore di preavviso. Puoi spostarli una sola volta, gratuitamente, almeno 24 ore prima."}</p></div>
    {selected.certificate&&<div className="full panel" style={{marginTop:0}}><p style={{marginBottom:4}}><b>Certificato VeriDrive incluso</b></p><p style={{marginBottom:0}}>VeriScore, risultato della verifica, certificato digitale e QR pubblico di verifica.</p></div>}
    {selected.photos&&<div className="full panel" style={{marginTop:0}}><p style={{marginBottom:4}}><b>VeriScorePlus</b></p><p style={{marginBottom:0}}>Foto solamente dei difetti riscontrati e stima indicativa dei costi di riparazione.</p></div>}
    {isOnline&&<div className="full notice" style={{marginTop:0}}>Risposta entro 24 ore.</div>}
    <button className="button full" disabled={busy} type="submit">{busy?"Apertura pagamento…":`Paga €${price.toFixed(2).replace('.',',')} e continua`}</button>
    {message&&<p className="notice full">{message}</p>}
  </form>;
}
