export type CheckItem = { id:number; area:string; label:string; weight:number };

const groups: Array<[string, Array<[string, number]>]> = [
  ["Sicurezza", [
    ["Freni anteriori", 4], ["Freni posteriori", 3], ["Pneumatici", 4], ["Sterzo / avantreno / retrotreno", 4],
    ["Sospensioni", 4], ["Luci e stop", 2], ["ABS / ESP", 3], ["Airbag / cinture", 3],
    ["Sicurezza ruote e fissaggi", 1], ["Integrità elementi di sicurezza accessibili", 2],
  ]],
  ["Meccanica", [
    ["Motore funzionamento", 8], ["Cambio / frizione", 5], ["Perdite olio/liquidi", 5], ["Raffreddamento", 4],
    ["Batteria / ricarica", 3], ["Scarico", 3], ["Trasmissione", 4], ["Altri problemi / rumori", 5],
    ["Avviamento", 0], ["Funzionamento al minimo", 0],
  ]],
  ["Diagnosi", [
    ["Spie motore", 5], ["Errori centraline", 5], ["Emissioni / DPF", 5], ["Ricarica alternatore", 5],
    ["Diagnosi elettronica generale", 0], ["Sistemi di assistenza elettronici", 0], ["Climatizzazione / gestione elettronica", 0],
    ["Sistemi di illuminazione elettronici", 0], ["Sensori principali", 0], ["Altre anomalie diagnostiche", 0],
  ]],
  ["Documentazione", [
    ["Telaio VIN", 3], ["Chilometri coerenti", 4], ["Tagliandi / manutenzione", 4], ["Dotazioni obbligatorie", 2],
    ["Revisione", 0], ["Documentazione disponibile", 0], ["Richiami costruttore", 0], ["Numero proprietari dichiarato", 0],
    ["Chiavi disponibili", 0], ["Corrispondenza dati veicolo", 0],
  ]],
  ["Condizioni generali", [
    ["Carrozzeria", 0], ["Vetri e cristalli", 0], ["Sottoscocca", 0], ["Porte e serrature", 0], ["Interni", 0],
    ["Sedili e cinture", 0], ["Comandi e strumentazione", 0], ["Bagagliaio", 0], ["Pneumatici di scorta / kit", 0],
    ["Stato generale e anomalie residue", 0],
  ]],
];

export const checklist: CheckItem[] = groups.flatMap(([area, entries]) =>
  entries.map(([label, weight]) => ({ area, label, weight }))
).map((item, index) => ({ ...item, id:index + 1 }));
