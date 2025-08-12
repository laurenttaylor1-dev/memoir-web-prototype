import React, { useEffect, useRef, useState } from "react";

export default function App() {
  const [mode, setMode] = useState("guided");
  const [locale, setLocale] = useState(
    navigator.language?.startsWith("fr") ? "fr-FR" : "en-US"
  );
  const [plan, setPlan] = useState("free");
  const capSeconds = plan === "free" ? 120 : 3600;

  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  const [title, setTitle] = useState("");
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef(null);
  const [recognitionActive, setRecognitionActive] = useState(false);

  const [selectedPrompt, setSelectedPrompt] = useState("");
  const [photos, setPhotos] = useState([]);

  const promptsEN = [
    "Describe your home growing up.",
    "Tell me about your first job.",
    "How did you meet your partner?",
    "What big events did you live through?",
    "What advice would you give your 20-year-old self?",
  ];
  const promptsFR = [
    "Décrivez votre maison quand vous étiez enfant.",
    "Parlez de votre premier emploi.",
    "Comment avez-vous rencontré votre partenaire ?",
    "Quels grands événements avez-vous vécus ?",
    "Quel conseil donneriez-vous à vos 20 ans ?",
  ];
  const prompts = locale.startsWith("fr") ? promptsFR : promptsEN;

  const [stories, setStories] = useState(() => {
    try {
      const raw = localStorage.getItem("memoir_stories");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem("memoir_stories", JSON.stringify(stories));
  }, [stories]);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    timerRef.current = t;
    return () => clearInterval(t);
  }, [recording]);

  useEffect(() => {
    if (recording && elapsed >= capSeconds) stopAll();
  }, [elapsed, recording, capSeconds]);

  async function startAll() {
    setTranscript("");
    setElapsed(0);

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const rec = new MediaRecorder(stream);
    chunksRef.current = [];
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => stream.getTracks().forEach((t) => t.stop());
    rec.start();
    mediaRecorderRef.current = rec;

    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (SR) {
      const recog = new SR();
      recognitionRef.current = recog;
      recog.lang = locale;
      recog.interimResults = true;
      recog.continuous = true;
      let full = "";
      recog.onresult = (e) => {
        let interim = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) full += r[0].transcript + " ";
          else interim += r[0].transcript;
        }
        setTranscript((full + interim).trim());
      };
      recog.onend = () => setRecognitionActive(false);
      try {
        recog.start();
        setRecognitionActive(true);
      } catch {}
    }
    setRecording(true);
  }

  function stopAll() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
      setRecognitionActive(false);
    }
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
  }

  async function saveStory() {
    let audioURL;
    if (chunksRef.current.length) {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      audioURL = URL.createObjectURL(blob);
    }
    const photoURLs = photos.map((f) => URL.createObjectURL(f));
    const story = {
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      title: title || (locale.startsWith("fr") ? "Histoire" : "Story"),
      mode,
      prompt: mode === "guided" ? selectedPrompt : undefined,
      transcript,
      audioURL,
      photos: photoURLs,
      durationSec: elapsed,
    };
    setStories((s) => [story, ...s]);
    setTitle("");
    setSelectedPrompt("");
    setPhotos([]);
    chunksRef.current = [];
  }

  function downloadText(s) {
    const text =
      `Title: ${s.title}\nDate: ${new Date(s.createdAt).toLocaleString()}\nMode: ${s.mode}` +
      `${s.prompt ? `\nPrompt: ${s.prompt}` : ""}\nDuration: ${s.durationSec}s\n\n${s.transcript}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${s.title.replace(/[^a-z0-9]/gi, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen" style={{ padding: 16, maxWidth: 900, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <h1 style={{ margin: 0 }}>Memoir — Web Prototype</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <select value={locale} onChange={(e) => setLocale(e.target.value)}>
            <option value="en-US">English</option>
            <option value="fr-FR">Français</option>
          </select>
          <select value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="free">Free (2 min cap)</option>
            <option value="pro">Pro (longer)</option>
          </select>
        </div>
      </header>

      <div style={{ display: "flex", gap: 8, margin: "8px 0 12px" }}>
        <button
          onClick={() => setMode("guided")}
          style={{ padding: "8px 12px", borderRadius: 10, background: mode === "guided" ? "#111" : "#e8e8ea", color: mode === "guided" ? "#fff" : "#111" }}
        >
          {locale.startsWith("fr") ? "Guidé" : "Guided"}
        </button>
        <button
          onClick={() => setMode("free")}
          style={{ padding: "8px 12px", borderRadius: 10, background: mode === "free" ? "#111" : "#e8e8ea", color: mode === "free" ? "#fff" : "#111" }}
        >
          {locale.startsWith("fr") ? "Libre" : "Free"}
        </button>
      </div>

      {mode === "guided" && (
        <>
          <div style={{ color: "#555", fontSize: 12, marginBottom: 4 }}>
            {locale.startsWith("fr") ? "Sujets suggérés" : "Suggested topics"}
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 6 }}>
            { (locale.startsWith("fr") ? ["D\u00e9crivez votre maison quand vous \u00e9tiez enfant.", "Parlez de votre premier emploi.", "Comment avez-vous rencontr\u00e9 votre partenaire ?", "Quels grands \u00e9v\u00e9nements avez-vous v\u00e9cus ?", "Quel conseil donneriez-vous \u00e0 vos 20 ans ?"] : ["Describe your home growing up.", "Tell me about your first job.", "How did you meet your partner?", "What big events did you live through?", "What advice would you give your 20-year-old self?"]) .map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPrompt(p)}
                style={{ padding: "8px 10px", background: selectedPrompt === p ? "#eef3ff" : "#f7f7f8", border: "1px solid #cdd9ff", borderRadius: 10, whiteSpace: "nowrap" }}
              >
                {p}
              </button>
            ))}
          </div>
        </>
      )}

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={locale.startsWith("fr") ? "Titre de l'histoire (facultatif)" : "Story title (optional)"}
        style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 10, margin: "8px 0" }}
      />

      <div style={{ minHeight: 140, border: "1px solid #ddd", borderRadius: 10, padding: 12, marginBottom: 8, fontSize: 18 }}>
        {transcript || (locale.startsWith("fr") ? "Votre texte apparaîtra ici…" : "Your words will appear here…")}
      </div>

      <div style={{ marginBottom: 8 }}>
        <label style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
          <input type="file" accept="image/*" multiple onChange={(e) => setPhotos(Array.from(e.target.files || []))} />
          <span>{locale.startsWith("fr") ? "Ajouter des photos" : "Add photos"}</span>
        </label>
        {photos.length > 0 && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
            {photos.map((f, i) => (
              <span key={i} style={{ fontSize: 12, background: "#f0f0f0", borderRadius: 8, padding: "4px 8px" }}>{f.name}</span>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, margin: "12px 0" }}>
        <button
          onClick={() => (recording ? stopAll() : startAll())}
          style={{ width: 160, height: 160, borderRadius: 999, color: "#fff", fontWeight: 700, fontSize: 20, border: 0, background: recording ? "#d33" : "#1f6feb", boxShadow: "0 6px 20px rgba(0,0,0,.12)" }}
          aria-pressed={recording}
        >
          {recording ? (locale.startsWith("fr") ? "Arrêter" : "Stop") : (locale.startsWith("fr") ? "Enregistrer" : "Record")}
        </button>

        {recording && (
          <div style={{ width: "100%", maxWidth: 480 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#555" }}>
              <span>{locale.startsWith("fr") ? "Temps restant" : "Remaining"}</span>
              <span>{Math.max(0, capSeconds - elapsed)}s</span>
            </div>
            <div style={{ height: 8, background: "#e5e5e5", borderRadius: 6, overflow: "hidden" }}>
              <div style={{ height: "100%", background: "#1f6feb", width: `${(elapsed / capSeconds) * 100}%` }} />
            </div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
              {recognitionActive
                ? (locale.startsWith("fr") ? "Transcription en cours…" : "Transcribing…")
                : (locale.startsWith("fr") ? "Reconnaissance vocale indisponible" : "Speech recognition unavailable")}
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button onClick={saveStory} disabled={!transcript} style={{ padding: "10px 14px", borderRadius: 10, border: 0, background: "#1f6feb", color: "#fff", opacity: transcript ? 1 : 0.5 }}>
          {locale.startsWith("fr") ? "Enregistrer l'histoire" : "Save story"}
        </button>
        <button onClick={() => { setTranscript(""); setTitle(""); setSelectedPrompt(""); setPhotos([]); }} style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #ddd", background: "#fff" }}>
          {locale.startsWith("fr") ? "Réinitialiser" : "Clear"}
        </button>
      </div>

      <section>
        <h2 style={{ marginBottom: 8 }}>{locale.startsWith("fr") ? "Histoires" : "Stories"}</h2>
        {stories.length === 0 && (
          <p style={{ color: "#555" }}>
            {locale.startsWith("fr") ? "Commencez par enregistrer votre première histoire." : "Start by recording your first story."}
          </p>
        )}
        <ul style={{ display: "grid", gap: 12, padding: 0, listStyle: "none" }}>
          {stories.map((s) => (
            <li key={s.id} style={{ background: "#fff", border: "1px solid #ddd", borderRadius: 12, padding: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{s.title}</div>
                  <div style={{ color: "#666", fontSize: 12 }}>{new Date(s.createdAt).toLocaleString()}</div>
                  {s.prompt && <div style={{ marginTop: 6 }}>{s.prompt}</div>}
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => downloadText(s)} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd" }}>
                    {locale.startsWith("fr") ? "Exporter (TXT)" : "Export (TXT)"}
                  </button>
                  <button onClick={() => setStories((prev) => prev.filter((x) => x.id !== s.id))} style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #ddd" }}>
                    {locale.startsWith("fr") ? "Supprimer" : "Delete"}
                  </button>
                </div>
              </div>
              <p style={{ marginTop: 8, whiteSpace: "pre-wrap" }}>{s.transcript}</p>
              {s.audioURL && <audio controls src={s.audioURL} style={{ marginTop: 8 }} />}
              {s.photos?.length > 0 && (
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {s.photos.map((url, i) => (
                    <img key={i} src={url} alt="photo" style={{ width: 84, height: 84, objectFit: "cover", borderRadius: 8, border: "1px solid #ddd" }} />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </section>

      <footer style={{ margin: "32px 0", textAlign: "center", color: "#666", fontSize: 12 }}>
        {locale.startsWith("fr")
          ? "Prototype : enregistreur de mémoires — FR/EN, cap de 2 minutes (offre gratuite)."
          : "Prototype: memoir recorder — EN/FR, 2-minute cap (Free plan)."}
      </footer>
    </div>
  );
}
