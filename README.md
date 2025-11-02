# Gcube V3 (PWA)

**Nyheter i V3**
- 📸 Auto-kalibrering (gray-world vitbalans) för exaktare färger.
- 🎛️ Förbättrad skanner + manuell korrigering.
- 🧊 3D-kub (2D-canvas visualisering av U/F/R) för snabb kontroll.
- 🧮 **Experimentell solver (web worker)** – demo-rörelser + plug-in-gränssnitt för Kociemba.
- 🧠 AI-coach med enkla rekommendationer baserat på tider (PB/Ao5/Ao12).
- ⏱️ Timer, scramble, LocalStorage + export/import.
- 📦 PWA (installera på iPhone utan App Store), klar för Vercel.

## Byt till Kociemba-solver (valfritt)
1. Ersätt filen `/solver_worker.js` med en web worker som implementerar Kociemba (två-fas).
2. Behåll samma API: `onmessage -> if type==='solve' { state }` och `postMessage({type:'solution', moves:[...], note:''})`.

## Deploy (Vercel)
1. Skapa nytt projekt och peka mot denna mapp (statisk). HTTPS behövs (Vercel fixar).
2. Öppna i iPhone Safari → **Dela** → **Lägg till på hemskärmen**.