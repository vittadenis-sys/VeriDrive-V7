export type CheckItem = { id: number; area: string; label: string };

const groups: Array<[string, string[]]> = [
  ["Sicurezza", [
    "Freni anteriori", "Freni posteriori", "Pneumatici", "Sterzo / avantreno / retrotreno",
    "Sospensioni", "Luci e stop", "ABS / ESP", "Airbag / cinture",
    "Sicurezza ruote e fissaggi", "Integrità elementi di sicurezza accessibili",
  ]],
  ["Meccanica", [
    "Motore funzionamento", "Cambio / frizione", "Perdite olio/liquidi", "Raffreddamento",
    "Batteria / ricarica", "Scarico", "Trasmissione", "Altri problemi / rumori",
    "Avviamento", "Funzionamento al minimo",
  ]],
  ["Diagnosi", [
    "Spie motore", "Errori centraline", "Emissioni / DPF", "Ricarica alternatore",
    "Diagnosi elettronica generale", "Sistemi di assistenza elettronici", "Climatizzazione / gestione elettronica",
    "Sistemi di illuminazione elettronici", "Sensori principali", "Altre anomalie diagnostiche",
  ]],
  ["Documentazione", [
    "Telaio VIN", "Chilometri coerenti", "Tagliandi / manutenzione", "Dotazioni obbligatorie",
    "Revisione", "Documentazione disponibile", "Richiami costruttore", "Numero proprietari dichiarato",
    "Chiavi disponibili", "Corrispondenza dati veicolo",
  ]],
  ["Condizioni generali", [
    "Carrozzeria", "Vetri e cristalli", "Sottoscocca", "Porte e serrature", "Interni",
    "Sedili e cinture", "Comandi e strumentazione", "Bagagliaio", "Pneumatici di scorta / kit",
    "Stato generale e anomalie residue",
  ]],
];

export const checklist: CheckItem[] = groups.flatMap(([area, labels]) =>
  labels.map((label) => ({ area, label }))
).map((item, index) => ({ ...item, id: index + 1 }));
