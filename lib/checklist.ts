export type CheckItem={id:number; area:string; label:string};

const areas=["Documenti e identità","Motore e fluidi","Sicurezza e frenata","Pneumatici e assetto","Visibilità ed elettrico","Esito viaggio"];

const labels=[
  "Carta di circolazione e VIN",
  "Spie quadro strumenti",
  "Avviamento e minimo",
  "Livello olio motore",
  "Livello liquido refrigerante",
  "Perdite di liquidi",
  "Batteria e avviamento",
  "Pneumatici e pressione",
  "Usura pneumatici",
  "Ruota di scorta o kit",
  "Freni anteriori",
  "Freni posteriori",
  "Freno di stazionamento",
  "Frenata di prova",
  "Sterzo e assetto",
  "Sospensioni",
  "Luci anteriori",
  "Luci posteriori e stop",
  "Indicatori e quattro frecce",
  "Tergicristalli e lavavetri",
  "Cristalli e visibilità",
  "Specchi retrovisori",
  "Cinture di sicurezza",
  "Airbag e spie sicurezza",
  "ABS e controlli elettronici",
  "Climatizzazione",
  "Temperatura motore",
  "Rumori o vibrazioni anomale",
  "Scarico e fumo",
  "Autonomia e condizioni generali per il viaggio",
];

export const checklist:CheckItem[]=labels.map((label,index)=>({id:index+1,area:areas[Math.min(Math.floor(index/5),areas.length-1)],label}));