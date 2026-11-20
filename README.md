# WOD Tracker

PWA per iPhone: pianifichi i workout CrossFit, registri i risultati (serie, ripetizioni, kg, tempo, round) e guardi i progressi. Funziona **offline**: i dati si salvano sul telefono e vengono inviati al database online appena c'è rete.

## Cosa c'è

| Sezione | A cosa serve |
|---|---|
| **Oggi** | Workout del giorno, inserimento risultati (più serie), note, livello Rx/scalato, timer di recupero |
| **Settimana** | Lun–dom, duplica settimana, salva come modello |
| **Libreria** | 1.838 workout (Girls, Hero, WOD 2021–2026) con ricerca e filtri, più i tuoi workout |
| **Programmi** | Modelli di settimana riutilizzabili |
| **Progressi** | Grafici per workout, per movimento e per periodo, con record personali |

Le misure proposte dipendono dal formato (For time → tempo, AMRAP → round + rip., Forza → serie con rip. e kg) e si cambiano per ogni workout. Impostazioni (tocca il badge in alto): sincronizza ora, esporta CSV, esci.

## Architettura

- **Next.js 15** (App Router, una sola pagina client) + Tailwind v4 + Recharts.
- **Offline-first**: tutto passa da IndexedDB (Dexie). Service worker (`public/sw.js`) per l'app shell e il catalogo.
- **Sync** (`lib/sync.ts`): una tabella Supabase `docs (user_id, kind, id, data jsonb, updated, deleted)`. Pull incrementale per `server_ts`, poi push delle righe `dirty`. Conflitti: vince `updated` più recente (anche lato server, vedi trigger in `supabase/schema.sql`).
- Su iOS non esiste la sincronizzazione in background: l'app sincronizza all'apertura, quando torna la rete, dopo ogni modifica e ogni minuto se aperta.
- Senza variabili Supabase l'app gira in **modalità solo locale**.

## Setup

### 1. Supabase

1. Crea un progetto su https://supabase.com (piano gratuito).
2. SQL Editor → incolla ed esegui `supabase/schema.sql`.
3. Authentication → Providers → Email: attivo. Crea il tuo utente dalla schermata di login dell'app, poi **disattiva "Allow new users to sign up"** (Authentication → Sign In / Providers) così nessun altro può registrarsi.
4. Project Settings → API: copia **Project URL** e **anon public key**.

### 2. Locale

```bash
cp .env.example .env.local   # incolla URL e anon key
npm install
npm run dev                  # http://localhost:3002
```

### 3. Vercel

Importa il repository su Vercel e aggiungi le due variabili d'ambiente:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 4. iPhone

Apri l'URL di Vercel in **Safari** → Condividi → **Aggiungi a Home**. Apri l'app una volta con la rete (così scarica il catalogo), poi funziona anche offline.

## Note

- Il catalogo (`public/workouts.json`) proviene dall'archivio CrossFit.com: uso personale, tieni il repository privato.
- Il service worker è attivo solo in produzione (`npm run build && npm start`).
