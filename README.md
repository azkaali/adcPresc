# adcPresc — Patient Diagnosis & Prescription System

A prescription system for a rheumatology clinic. Prescriptions print with instructions in both English and Urdu. It runs on the clinic computer and keeps all data on that machine.

## What it does

| Need | How the app handles it |
|---|---|
| Dashboard | Today's and this month's prescription counts, frequently used diagnoses (one click to prescribe), recent prescriptions. |
| Diagnosis options, frequently used on top | Diagnoses are always sorted by how often you use them. The most used appear as one-click chips on the prescription form and carry a ★ Frequent badge on the Diagnoses page. |
| Maintain and edit diagnoses | Each diagnosis stores disease name, condition, conclusion after lab, its usual medicines, and advice. Edit it on the Diagnoses page, or tick *"Also update the diagnosis"* while saving a prescription. |
| Medication in English and Urdu (dosage, potency) | Every medicine line has potency, dosage (English + Urdu) and duration (English + Urdu). The **Quick dose** pickers (amount, how often, when) write both languages at once, and you can still type freely. |
| Fast medicine search by brand or generic name | One search bar with a **Brand / Generic** switch (or `Alt+B` / `Alt+G`). The whole list is in memory, so results appear as you type. It ignores punctuation, tolerates missing letters (`plaqunil` finds Plaquenil), and ranks the medicines you prescribe most at the top. Use ↑ ↓ and Enter to add. |
| Add a medicine if it doesn't exist | The last option in the dropdown is always **Add "…" as a new medicine**, prefilled with what you typed. It is added and placed on the prescription in one step. |
| Save the detailed prescription | Patient details, diagnosis, findings, lab conclusion, medicines, advice and follow-up are saved. You can print (A4, with your letterhead), edit, delete, or **Repeat for follow-up**. History is searchable by name, phone, MR no., diagnosis or Rx number. |
| Voice (advanced) | A 🎤 button on text fields and on every search. English fields listen in English; Urdu fields listen in Urdu. |

Time-savers:
- When you add a medicine, the dosage you used **last time** is filled in automatically.
- `Ctrl+S` saves.
- The app warns you before you leave a page with unsaved changes.

## Starting the app (Windows)

1. Install **Node.js** (the LTS version from https://nodejs.org). This is needed once.
2. Double-click **`start.bat`**. The first run installs everything, which takes a minute. The app then opens in your browser at http://localhost:3000.
3. Keep the black window open while you use the app. Close it to stop the app.

Next, open **Settings** and enter the doctor's name, qualifications, PMDC number and clinic details. These print at the top of every prescription.

From a terminal, the same steps are `npm install` once, then `npm start`.

## Voice input

- Works in **Google Chrome** and **Microsoft Edge**. It does not work in Firefox.
- The browser asks for microphone permission the first time.
- Speech recognition is done by the browser's online service, so voice input needs an internet connection. Everything else works offline.

## Your data and backups

- Everything is stored in one file: `data/clinic.db`.
- **Settings → Download backup** saves a complete copy. Do this regularly and keep copies off the computer, for example on a USB drive or in cloud storage.
- **To restore:** close the app, replace `data/clinic.db` with the backup file (renamed to `clinic.db`), and start the app again.

## Starter data — please review

On first start, the app adds:
- about 45 common rheumatology medicines;
- six **sample** diagnoses: RA, gout, knee OA, ankylosing spondylitis, SLE and fibromyalgia.

These are examples to save setup time, not clinical recommendations. Review, edit or delete them, and add your own local brands. They are added only once and never come back after you delete them.

## Using it from other computers in the clinic

By default, only the computer running the app can open it. To let another computer on the same network (for example, reception) use it, start the app with `HOST` set. In PowerShell:

```powershell
$env:HOST = "0.0.0.0"; npm start
```

Then open `http://<this-computer's-IP>:3000` on the other computer. The app has **no login**, so only do this on a private clinic network you trust.

## For developers

```
npm run dev        # API on :3000 + Vite dev server on :5173 with hot reload
npm test           # API and search tests (node:test)
npm run typecheck  # client + server
npm run build      # production build into dist/
```

- **Stack:** React 19 + TypeScript + Vite front end; Express 5 API on Node's built-in SQLite (`node:sqlite`), so there are no native modules to compile; TypeScript is run directly by Node 22.18+.
- **Urdu font:** Noto Nastaliq Urdu is bundled, so printing works offline.
- `server/`: `db.ts` (schema), `api.ts` (all endpoints), `seed.ts` (starter data), `app.ts` / `index.ts`.
- `src/`: `pages/` (screens), `components/` (`MedicineSearch`, `MedicationEditor`, `DiagnosisPicker`, `VoiceButton`, …), `lib/search.ts` (medicine ranking), `lib/dosage.ts` (English/Urdu phrase lists — add your own phrases here).
- `shared/types.ts`: types used by both sides.
