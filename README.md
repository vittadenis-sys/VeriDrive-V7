# VeriDrive 1.0

Piattaforma per verifiche auto certificate, pensata per rendere più trasparente l’acquisto e la vendita di veicoli usati.

## Funzionalità

- Home professionale e responsive
- Prenotazione verifica
- Dashboard cliente e officina
- Checklist di 50 controlli
- VERISCORE calcolato in tempo reale
- Report stampabile/PDF con QR di verifica
- Integrazione predisposta per Supabase e Stripe in test mode

## Avvio locale

```bash
npm install
cp .env.example .env.local
npm run dev
```

Apri [http://localhost:3000](http://localhost:3000).

## Configurazione

Compila in `.env.local` le variabili Supabase e, per i pagamenti test, `STRIPE_SECRET_KEY`.
Lo script SQL in `supabase/schema.sql` crea le tabelle principali. Il checkout è esposto da `POST /api/checkout`.

## Struttura

- `/prenota` — richiesta di verifica
- `/dashboard` — area cliente
- `/officina` — area partner
- `/officina/checklist` — controllo tecnico a 50 punti
- `/report/demo` — report con QR e stampa PDF

> Il progetto include dati demo; prima della pubblicazione collega autenticazione, persistenza e pagamenti alle chiavi di produzione.
