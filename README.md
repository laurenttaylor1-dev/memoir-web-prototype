# Memoir — Web Prototype (React + Vite + Tailwind)

This is a simple, elder‑friendly web app to record spoken stories, transcribe them (Web Speech API), attach photos, and save/export text. English + French.

## Local run (Mac/Windows)
1. Install Node.js LTS from https://nodejs.org
2. Open a terminal in this folder and run:
   ```bash
   npm install
   npm run dev
   ```
3. Open the URL shown (e.g., http://localhost:5173)

## Deploy to Vercel (free)
1. Push this folder to a GitHub repository.
2. In Vercel, click "New Project" → "Continue with GitHub" → select your repo.
3. Framework: **Vite**. Build: `npm run build`. Output: `dist`.
4. Click **Deploy**. Your live link appears in ~30 seconds.

## Notes
- Browser transcription uses Web Speech API; accuracy varies. For better accuracy, replace with a server transcription (e.g., Whisper) later.
- Microphone permission is required; on iOS/Safari, you must tap the Record button to start.
