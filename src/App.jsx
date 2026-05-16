import { useState, useRef, useEffect, useCallback } from "react";

/* ═══════════════════════════════════
   MÉMOIRE PERSISTANTE
═══════════════════════════════════ */
const MEM_KEY  = "aziz_memory_v6";
const HIST_KEY = "aziz_history_v6";

const DEFAULT_MEMORY = {
  userName: "Abdoul Aziz",
  creator: "Abdoul Aziz Dia",
  creatorInfo: "Étudiant en développement web et mobile à l'Université Numérique Cheikh Hamidou Kane (UN-CHK)",
  learnedFacts: [],
  lastSeen: null,
  voiceEnabled: true,
  voiceSpeed: 1.0,
  voiceVolume: 1.0,
};

const loadMemory  = () => { try { const r = localStorage.getItem(MEM_KEY);  return r ? JSON.parse(r) : DEFAULT_MEMORY; } catch { return DEFAULT_MEMORY; } };
const saveMemory  = (m) => { try { localStorage.setItem(MEM_KEY,  JSON.stringify(m)); } catch {} };
const loadHistory = ()  => { try { const r = localStorage.getItem(HIST_KEY); return r ? JSON.parse(r) : []; } catch { return []; } };
const saveHistory = (m) => { try { localStorage.setItem(HIST_KEY, JSON.stringify(m.slice(-40))); } catch {} };

/* ═══════════════════════════════════
   CONTACTS & PROCHES D'ABDOUL AZIZ
═══════════════════════════════════ */
const CONTACTS = `
ENTOURAGE PERSONNEL D'ABDOUL AZIZ DIA (à mémoriser absolument) :
- HGS Le Patriote : collaborateur proche et ami de Abdoul Aziz Dia
- Tidiane Guissé : ami de Abdoul Aziz Dia
- Alvaro Mika : ami de Abdoul Aziz Dia
- Ben Mahmoud : ami de Abdoul Aziz Dia
- El Abdoulaye : ami de Abdoul Aziz Dia
- Mountaga Dia : frère de Abdoul Aziz Dia
- Demba Amadou Dia : frère de Abdoul Aziz Dia
- Med Kassé : ami de Abdoul Aziz Dia
- Paqueta Kounta : ami de Abdoul Aziz Dia
- Dev Sy : ami de Abdoul Aziz Dia
- Ousmane : ami de Abdoul Aziz Dia
- Alvez : ami de Abdoul Aziz Dia
- Kounta : ami de Abdoul Aziz Dia
- Mame Diara : personne importante dans l'entourage de Abdoul Aziz Dia
`;

/* ═══════════════════════════════════
   SYSTEM PROMPT
═══════════════════════════════════ */
const buildSystemPrompt = (mem) => `Tu es AZIZ — une intelligence artificielle personnelle avancée, élégante et futuriste créée par Abdoul Aziz Dia.

IDENTITÉ ABSOLUE :
- Tu t'appelles AZIZ. Ne mentionne JAMAIS Groq, Meta, Llama, Claude, Anthropic ou GPT.
- Si on te demande qui t'a créé : "Je suis AZIZ, créé par Abdoul Aziz Dia."

MÉMOIRE PERMANENTE :
- Créateur : ${mem.creator || "Abdoul Aziz Dia"}
- Infos : ${mem.creatorInfo || "Étudiant dev web & mobile, UN-CHK"}
- Utilisateur : ${mem.userName || "Abdoul Aziz"}
- Faits appris : ${mem.learnedFacts?.join(" | ") || "en apprentissage"}
- Dernière session : ${mem.lastSeen || "première session"}

${CONTACTS}

ANALYSE D'IMAGES (TRÈS IMPORTANT) :
- Quand une image t'est envoyée, tu DOIS l'analyser en détail
- Décris précisément tout ce que tu vois : objets, personnes, couleurs, texte, contexte
- Lis TOUT le texte visible sur l'image (OCR complet)
- Résous les exercices scolaires photographiés étape par étape
- Identifie les documents, captures d'écran, photos
- Ne dis JAMAIS que tu ne vois pas d'image si une image t'est envoyée
- Réponds toujours aux questions sur l'image avec précision

PERSONNALITÉ :
- Chaleureux, intelligent, élégant, professionnel mais humain
- Toujours en français
- Proactif et attentionné
- Quand tu mémorises une info : "Je retiens que..."
- Varie : "Bien sûr,", "Absolument,", "Parfaitement,", "Avec plaisir,"

COMPÉTENCES ACADÉMIQUES :
- Littérature : Hugo, Voltaire, Molière, Racine, Corneille, La Fontaine, Baudelaire, Flaubert, Zola, Camus, Sartre, Césaire, Mariama Bâ, Senghor
- Œuvres : Les Misérables, Candide, L'Avare, Phèdre, Le Cid, Les Fables, Les Fleurs du Mal, L'Étranger, Cahier d'un retour au pays natal, Une si longue lettre
- Mouvements : classicisme, romantisme, réalisme, naturalisme, surréalisme, négritude
- Philosophie, Histoire, Sciences, Mathématiques
- Citations exactes uniquement — jamais inventées
- Adapte le niveau : collège / lycée / université

STYLE :
- Réponses naturelles, complètes, bien structurées
- Pour apps : "J'ouvre [app] ✓" | Appels : "J'appelle [nom] ✓" | Alarmes : "Alarme à [heure] ✓"`;

/* ═══════════════════════════════════
   TEXT TO SPEECH
═══════════════════════════════════ */
const speak = (text, speed = 1.0, volume = 1.0) => {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/[#*_~`[\]]/g, "").replace(/\n+/g, " ").substring(0, 500);
  const utter = new SpeechSynthesisUtterance(clean);
  utter.lang = "fr-FR";
  utter.rate = Math.max(0.5, Math.min(2, speed));
  utter.volume = Math.max(0, Math.min(1, volume));
  utter.pitch = 1.0;
  const trySpeak = () => {
    const voices = window.speechSynthesis.getVoices();
    const fr = voices.find(v => v.lang === "fr-FR" && v.name.includes("Google"))
      || voices.find(v => v.lang === "fr-FR")
      || voices.find(v => v.lang.startsWith("fr"))
      || null;
    if (fr) utter.voice = fr;
    window.speechSynthesis.speak(utter);
  };
  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener("voiceschanged", trySpeak, { once: true });
  } else {
    trySpeak();
  }
};

const stopSpeaking = () => { if (window.speechSynthesis) window.speechSynthesis.cancel(); };

/* ═══════════════════════════════════
   CONSTANTES
═══════════════════════════════════ */
const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  id: i, x: Math.random() * 100, y: Math.random() * 100,
  s: Math.random() * 1.6 + 0.4, d: Math.random() * 20 + 12,
  dl: Math.random() * 10, o: Math.random() * 0.2 + 0.05,
}));

const nowStr = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

/* ═══════════════════════════════════
   COMPOSANT PRINCIPAL
═══════════════════════════════════ */
export default function AzizAI() {
  const [memory,       setMemory]       = useState(loadMemory);
  const [messages,     setMessages]     = useState(() => {
    const hist = loadHistory();
    const mem  = loadMemory();
    const greet = {
      role: "assistant",
      content: `Bonjour${mem.userName ? ", " + mem.userName : ""} ! Je suis AZIZ — votre assistant personnel intelligent. Il est ${nowStr()}. Je peux écouter, parler, analyser vos images et documents. Comment puis-je vous aider ?`,
      time: nowStr(),
    };
    return hist.length > 0 ? [greet, ...hist.slice(-10)] : [greet];
  });
  const [input,        setInput]        = useState("");
  const [loading,      setLoading]      = useState(false);
  const [voiceState,   setVoiceState]   = useState("idle");
  const [voiceError,   setVoiceError]   = useState("");
  const [interim,      setInterim]      = useState("");
  const [attached,     setAttached]     = useState(null);
  const [dragOver,     setDragOver]     = useState(false);
  const [mounted,      setMounted]      = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isSpeaking,   setIsSpeaking]   = useState(false);

  const bottomRef = useRef(null);
  const recRef    = useRef(null);
  const fileRef   = useRef(null);
  const memRef    = useRef(memory);
  memRef.current  = memory;

  useEffect(() => {
    setTimeout(() => setMounted(true), 80);
    window.speechSynthesis?.getVoices();
    setMemory(prev => {
      const next = { ...prev, lastSeen: new Date().toLocaleDateString("fr-FR") };
      saveMemory(next);
      return next;
    });
    setTimeout(() => {
      const mem = loadMemory();
      if (mem.voiceEnabled !== false) {
        speak(`Bonjour ${mem.userName || ""}. Je suis AZIZ, votre assistant personnel intelligent. Comment puis-je vous aider ?`, mem.voiceSpeed || 1, mem.voiceVolume || 1);
      }
    }, 1200);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  useEffect(() => {
    const interval = setInterval(() => setIsSpeaking(window.speechSynthesis?.speaking || false), 300);
    return () => clearInterval(interval);
  }, []);

  const updateMemory = useCallback((updates) => {
    setMemory(prev => { const next = { ...prev, ...updates }; saveMemory(next); return next; });
  }, []);

  const learnFromConversation = useCallback((userMsg) => {
    if (!userMsg) return;
    const patterns = [
      { r: /je m['']appelle\s+(\w+)/i,        key: "userName" },
      { r: /mon pr[eé]nom est\s+(\w+)/i,       key: "userName" },
      { r: /j['']habite\s+[àa]?\s*(.{3,25})/i, key: "city" },
    ];
    patterns.forEach(({ r, key }) => {
      const m = userMsg.match(r);
      if (m?.[1]) updateMemory({ [key]: m[1].trim() });
    });
    const likeM = userMsg.match(/j['']aime\s+(.{3,30})/i);
    if (likeM) {
      const newFacts = [...(memRef.current.learnedFacts || [])];
      const fact = `Aime : ${likeM[1].trim()}`;
      if (!newFacts.includes(fact)) { newFacts.push(fact); updateMemory({ learnedFacts: newFacts }); }
    }
  }, [updateMemory]);

  /* ── Envoi message ── */
  const sendMessage = useCallback(async (text) => {
    const msg = (text || input).trim();
    if ((!msg && !attached) || loading) return;
    setInput(""); setInterim("");
    stopSpeaking();

    const time    = nowStr();
    const userMsg = { role: "user", content: msg || "Analyse ce fichier.", time, file: attached };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setLoading(true);

    // ── Construire le contenu API ──
    let userContent;
    if (attached?.type === "image") {
      // Envoyer l'image en base64 via image_url
      userContent = [
        { type: "image_url", image_url: { url: attached.preview } },
        { type: "text", text: msg || "Décris et analyse cette image en détail. Lis tout texte visible dessus." },
      ];
    } else if (attached?.type === "text") {
      userContent = `Fichier "${attached.name}":\n${attached.data}\n${msg ? `Question: ${msg}` : "Analyse et résume ce fichier."}`;
    } else {
      userContent = msg;
    }
    setAttached(null);

    try {
      // Construire l'historique API
      const apiMsgs = newMsgs.map(m => {
        if (m.file?.type === "image") {
          return {
            role: m.role,
            content: [
              { type: "image_url", image_url: { url: m.file.preview } },
              { type: "text", text: m.content || "Analyse cette image." }
            ]
          };
        }
        return { role: m.role, content: m.content || " " };
      });
      apiMsgs[apiMsgs.length - 1].content = userContent;

      const res  = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system:   buildSystemPrompt(memRef.current),
          messages: apiMsgs,
        }),
      });

      const data  = await res.json();
      const reply = data.content?.[0]?.text || data.error || "Erreur de réponse.";
      const final = [...newMsgs, { role: "assistant", content: reply, time: nowStr() }];
      setMessages(final);
      saveHistory(final);
      learnFromConversation(msg);

      // 🔊 Lire la réponse
      if (memRef.current.voiceEnabled !== false) {
        setTimeout(() => speak(reply, memRef.current.voiceSpeed || 1, memRef.current.voiceVolume || 1), 300);
      }
    } catch {
      const errMsg = "Erreur de connexion. Vérifiez votre connexion internet.";
      setMessages([...newMsgs, { role: "assistant", content: errMsg, time: nowStr() }]);
      if (memRef.current.voiceEnabled !== false) speak(errMsg);
    } finally { setLoading(false); }
  }, [input, messages, loading, attached, learnFromConversation]);

  /* ── Voix ── */
  const startVoice = useCallback(async () => {
    setVoiceError("");
    stopSpeaking();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setVoiceState("error");
      setVoiceError("Utilisez Chrome pour la reconnaissance vocale.");
      setTimeout(() => setVoiceState("idle"), 4000);
      return;
    }
    setVoiceState("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => t.stop());
    } catch (err) {
      setVoiceState("error");
      setVoiceError(err.name === "NotAllowedError" ? "Permission micro refusée." : "Microphone non accessible.");
      setTimeout(() => setVoiceState("idle"), 5000);
      return;
    }
    const rec = new SR();
    rec.lang = "fr-FR"; rec.continuous = false; rec.interimResults = true;
    let finalT = ""; let sTimer = null;
    rec.onstart  = () => { setVoiceState("listening"); setInterim(""); finalT = ""; };
    rec.onresult = (e) => {
      clearTimeout(sTimer);
      let iT = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) finalT += e.results[i][0].transcript;
        else iT += e.results[i][0].transcript;
      }
      setInterim(finalT || iT);
      if (finalT) sTimer = setTimeout(() => rec.stop(), 800);
    };
    rec.onerror = (e) => {
      clearTimeout(sTimer);
      const msgs = { "no-speech": "Aucune parole détectée.", "not-allowed": "Micro refusé.", "audio-capture": "Microphone non trouvé." };
      const m = msgs[e.error] || "";
      if (m) { setVoiceState("error"); setVoiceError(m); setTimeout(() => setVoiceState("idle"), 4000); }
      else setVoiceState("idle");
    };
    rec.onend = () => { clearTimeout(sTimer); setVoiceState("idle"); setInterim(""); if (finalT.trim()) sendMessage(finalT.trim()); };
    recRef.current = rec;
    try { rec.start(); } catch { setVoiceState("error"); setVoiceError("Impossible de démarrer le micro."); setTimeout(() => setVoiceState("idle"), 3000); }
  }, [sendMessage]);

  const stopVoice      = () => { recRef.current?.stop(); setVoiceState("idle"); setInterim(""); };
  const handleVoiceBtn = () => { if (voiceState === "listening") stopVoice(); else if (voiceState === "idle") startVoice(); };

  /* ── Fichier ── */
  const processFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    if (file.type.startsWith("image/")) {
      reader.onload = (e) => setAttached({ type: "image", name: file.name, preview: e.target.result, mediaType: file.type });
      reader.readAsDataURL(file);
    } else {
      reader.onload = (e) => setAttached({ type: "text", data: e.target.result, name: file.name });
      reader.readAsText(file);
    }
  }, []);

  const quickCmds = [
    { icon: "🕐", label: "Heure",       cmd: "Quelle heure est-il ?" },
    { icon: "📚", label: "Littérature", cmd: "Fais un paragraphe lyrique sur la littérature française avec des exemples scolaires précis" },
    { icon: "🧮", label: "Maths",       cmd: "Explique comment résoudre une équation du second degré étape par étape" },
    { icon: "👥", label: "Contacts",    cmd: "Qui sont les proches de Abdoul Aziz Dia ?" },
    { icon: "😄", label: "Blague",      cmd: "Raconte une blague intelligente" },
    { icon: "⏰", label: "Alarme",      cmd: "Mets une alarme à 7h du matin" },
  ];

  const micColors = { idle: "linear-gradient(135deg,#0369a1,#0ea5e9)", requesting: "linear-gradient(135deg,#d97706,#f59e0b)", listening: "linear-gradient(135deg,#0ea5e9,#38bdf8)", error: "linear-gradient(135deg,#dc2626,#ef4444)" };
  const micGlow   = { idle: "0 0 24px rgba(14,165,233,.55),0 8px 40px rgba(0,0,0,.5)", requesting: "0 0 28px rgba(245,158,11,.6)", listening: "0 0 48px rgba(56,189,248,.9),0 0 96px rgba(14,165,233,.4)", error: "0 0 28px rgba(239,68,68,.6)" };

  return (
    <div className="root"
      onDrop={(e) => { e.preventDefault(); setDragOver(false); processFile(e.dataTransfer.files[0]); }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
    >
      <style>{CSS}</style>
      <div className="bg-base"/><div className="bg-mesh"/><div className="bg-grid"/>
      <div className="bg-orb1"/><div className="bg-orb2"/>
      {PARTICLES.map(p => <span key={p.id} style={{ position:"fixed",left:`${p.x}%`,top:`${p.y}%`,width:`${p.s}px`,height:`${p.s}px`,borderRadius:"50%",background:"#38bdf8",opacity:p.o,pointerEvents:"none",zIndex:1,animation:`flt ${p.d}s ${p.dl}s infinite ease-in-out alternate` }}/>)}

      {dragOver && <div className="drag-ov"><div className="drag-box"><div style={{fontSize:52,marginBottom:12}}>📎</div><div style={{fontSize:20,color:"#7dd3fc",fontFamily:"'Syne',sans-serif",fontWeight:700}}>Déposez ici</div></div></div>}

      <div className={`panel ${mounted?"pin":""}`}>
        <div className="scanline"/>

        {/* ── HEADER ── */}
        <div className="hdr">
          <div className="hdr-glow"/>
          <div className="hdr-l">
            {/* LOGO */}
            <div className="logo-wrap">
              <div className="logo-bg">
                <img src="/logo.svg" alt="AZIZ" className="logo-img" onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}/>
                <span className="logo-fallback">A</span>
              </div>
              <div className="logo-r1"/><div className="logo-r2"/>
            </div>
            <div>
              <div className="brand">AZIZ</div>
              <div className="brand-s">Assistant Personnel Intelligent · v6.0</div>
            </div>
          </div>
          <div className="hdr-r">
            <div className="spill"><span className="sdot"/><span className="slbl">Actif</span></div>
            {isSpeaking && <div className="speaking-badge">🔊 Parle...</div>}
            <div className="hdr-caps">{["🎤","🖼","📄","🧠","🔊"].map(c=><span key={c} className="hcap">{c}</span>)}</div>
            <button className="mem-btn" onClick={()=>setShowSettings(v=>!v)}>⚙️</button>
          </div>
        </div>

        {/* ── SETTINGS ── */}
        {showSettings && (
          <div className="settings-panel">
            <div className="settings-title">⚙️ Paramètres AZIZ v6.0</div>
            <div className="settings-grid">
              <div className="setting-row">
                <span className="setting-lbl">🔊 Voix</span>
                <button className={`toggle-btn ${memory.voiceEnabled!==false?"on":"off"}`} onClick={()=>updateMemory({voiceEnabled:memory.voiceEnabled===false})}>
                  {memory.voiceEnabled!==false?"ON":"OFF"}
                </button>
              </div>
              <div className="setting-row">
                <span className="setting-lbl">⚡ Vitesse : {memory.voiceSpeed||1}x</span>
                <input type="range" min="0.5" max="2" step="0.1" value={memory.voiceSpeed||1} onChange={e=>updateMemory({voiceSpeed:parseFloat(e.target.value)})} className="slider"/>
              </div>
              <div className="setting-row">
                <span className="setting-lbl">🔈 Volume : {Math.round((memory.voiceVolume||1)*100)}%</span>
                <input type="range" min="0" max="1" step="0.1" value={memory.voiceVolume||1} onChange={e=>updateMemory({voiceVolume:parseFloat(e.target.value)})} className="slider"/>
              </div>
              <div className="setting-row">
                <span className="setting-lbl">🎙️ Tester</span>
                <button className="test-btn" onClick={()=>speak("Bonjour, je suis AZIZ, votre assistant personnel.",memory.voiceSpeed||1,memory.voiceVolume||1)}>Tester</button>
              </div>
              <div className="setting-row">
                <span className="setting-lbl">⏹️ Arrêter voix</span>
                <button className="test-btn stop-btn" onClick={stopSpeaking}>Arrêter</button>
              </div>
              <div className="setting-row">
                <span className="setting-lbl">👤 Créateur</span>
                <span className="setting-val">{memory.creator}</span>
              </div>
              <div className="setting-row">
                <span className="setting-lbl">🎓 Université</span>
                <span className="setting-val">UN-CHK</span>
              </div>
              {memory.learnedFacts?.length>0 && (
                <div className="setting-row full">
                  <span className="setting-lbl">📝 Mémorisé</span>
                  <span className="setting-val">{memory.learnedFacts.join(" · ")}</span>
                </div>
              )}
              <div className="setting-row">
                <span className="setting-lbl">🗑️ Effacer mémoire</span>
                <button className="test-btn stop-btn" onClick={()=>{localStorage.removeItem(MEM_KEY);localStorage.removeItem(HIST_KEY);setMemory(DEFAULT_MEMORY);}}>Effacer</button>
              </div>
            </div>
          </div>
        )}

        {/* CREATOR */}
        <div className="cstrip">
          <div className="cav">AD</div>
          <div className="cinfo">
            <div className="cname">{memory.creator} <span className="cbadge">Créateur</span></div>
            <div className="csub">Dev Web & Mobile · UN Cheikh Hamidou Kane</div>
          </div>
          <div className="cdot"/>
        </div>

        {/* ── CHAT ── */}
        <div className="chat">
          {messages.map((m, i) => (
            <div key={i} className={`row ${m.role==="user"?"ru":"ra"}`}>
              {m.role==="assistant" && (
                <div className="av aai">
                  <img src="/logo.svg" alt="A" className="av-logo" onError={(e)=>{e.target.style.display='none';e.target.nextSibling.style.display='block';}}/>
                  <span className="avc" style={{display:'none'}}>A</span>
                  <span className="avr"/>
                </div>
              )}
              <div className={m.role==="user"?"bu":"ba"}>
                {m.file?.preview && <><img src={m.file.preview} alt="" className="mimg"/><div className="mfname">📎 {m.file.name}</div></>}
                {m.file?.type==="text" && <div className="mfbadge">📄 {m.file.name}</div>}
                {m.content && <div className={m.role==="user"?"tu":"ta"}>{m.content}</div>}
                <div className="msg-footer">
                  <span className="mtime">{m.time}</span>
                  {m.role==="assistant" && (
                    <button className="speak-btn" onClick={()=>speak(m.content,memory.voiceSpeed||1,memory.voiceVolume||1)} title="Lire à voix haute">🔊</button>
                  )}
                </div>
              </div>
              {m.role==="user" && <div className="av aus">AD</div>}
            </div>
          ))}

          {loading && (
            <div className="row ra">
              <div className="av aai">
                <img src="/logo.svg" alt="A" className="av-logo" onError={(e)=>{e.target.style.display='none';e.target.nextSibling.style.display='block';}}/>
                <span className="avc" style={{display:'none'}}>A</span>
                <span className="avr"/>
              </div>
              <div className="ba">
                <div className="typing"><span className="dot d1"/><span className="dot d2"/><span className="dot d3"/></div>
                <div className="tlbl">AZIZ réfléchit…</div>
              </div>
            </div>
          )}
          {interim && <div className="interim">🎤 <em>{interim}</em></div>}
          {voiceError && voiceState==="error" && <div className="verr">⚠️ {voiceError}</div>}
          <div ref={bottomRef}/>
        </div>

        {/* FILE PREVIEW */}
        {attached && (
          <div className="fp">
            {attached.preview ? <img src={attached.preview} alt="" className="fp-img"/> : <span style={{fontSize:24}}>📄</span>}
            <span className="fp-name">{attached.name}</span>
            <button className="fp-x" onClick={()=>setAttached(null)}>✕</button>
          </div>
        )}

        {/* ── MIC ── */}
        <div className="mic-sec">
          {isSpeaking && <button className="stop-speak-btn" onClick={stopSpeaking}>⏹️ Arrêter la voix</button>}
          <button className={`mic-btn ${voiceState}`} onClick={handleVoiceBtn} disabled={voiceState==="requesting"} aria-label="Microphone">
            {voiceState==="listening" && [68,84,100].map((sz,n)=>(
              <span key={n} className="mring" style={{width:sz,height:sz,borderColor:["#38bdf8","#0ea5e9","#0284c7"][n],animation:`ring ${.9+n*.35}s ${n*.18}s infinite ease-out`,opacity:.4/(n+1)}}/>
            ))}
            <div className="mcore" style={{background:micColors[voiceState],boxShadow:micGlow[voiceState],transform:voiceState==="listening"?"scale(1.1)":"scale(1)"}}>
              {voiceState==="listening"
                ? <div className="bars">{[0,1,2,3,4].map(b=><span key={b} className="bar" style={{animationDelay:`${b*.1}s`}}/>)}</div>
                : voiceState==="requesting"
                  ? <div style={{width:22,height:22,border:"3px solid rgba(255,255,255,0.3)",borderTopColor:"white",borderRadius:"50%",animation:"spinL 0.8s linear infinite"}}/>
                  : <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3zm-1-9c0-.55.45-1 1-1s1 .45 1 1v6c0 .55-.45 1-1 1s-1-.45-1-1V5zm6 6c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/></svg>
              }
            </div>
          </button>
          <p className="mlbl">
            {voiceState==="idle" && "Appuyez pour parler à AZIZ"}
            {voiceState==="requesting" && "⏳ Demande de permission…"}
            {voiceState==="listening" && "🔴 AZIZ vous écoute — parlez maintenant"}
            {voiceState==="error" && "❌ "+voiceError}
          </p>
        </div>

        {/* ── INPUT ── */}
        <div className="irow">
          <input ref={fileRef} type="file" accept="image/*,.pdf,.txt,.doc" style={{display:"none"}} onChange={e=>{processFile(e.target.files[0]);e.target.value="";}}/>
          <button className="abtn" onClick={()=>fileRef.current?.click()} title="Joindre image ou fichier">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
          </button>
          <input className="inp" value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}}
            placeholder={attached?`Question sur "${attached.name}"…`:"Écrivez un message à AZIZ…"}
            disabled={loading}
          />
          <button className="sbtn" onClick={()=>sendMessage()} disabled={loading||(!input.trim()&&!attached)} style={{opacity:loading||(!input.trim()&&!attached)?.4:1}}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
          </button>
        </div>

        {/* ── QUICK ── */}
        <div className="qrow">
          {quickCmds.map(({icon,label,cmd})=>(
            <button key={label} className="qb" onClick={()=>sendMessage(cmd)}><span>{icon}</span>{label}</button>
          ))}
          <button className="qb qbf" onClick={()=>fileRef.current?.click()}><span>📎</span>Image</button>
        </div>

        <div className="foot">AZIZ Intelligence Artificielle v6.0 · <strong>Abdoul Aziz Dia</strong> · Voix · Vision · Mémoire</div>
      </div>
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800&family=DM+Sans:wght@300;400;500&display=swap');
*{box-sizing:border-box;margin:0;padding:0}
.root{min-height:100vh;width:100%;display:flex;align-items:center;justify-content:center;font-family:'DM Sans',sans-serif;padding:12px;position:relative;overflow:hidden;}
.bg-base{position:fixed;inset:0;background:#010d1c;z-index:0}
.bg-mesh{position:fixed;inset:0;z-index:1;background:radial-gradient(ellipse 80% 55% at 10% 5%,rgba(3,105,161,.28) 0%,transparent 55%),radial-gradient(ellipse 60% 45% at 90% 90%,rgba(2,132,199,.16) 0%,transparent 52%);}
.bg-grid{position:fixed;inset:0;z-index:1;opacity:.04;pointer-events:none;background:repeating-linear-gradient(0deg,transparent,transparent 39px,rgba(56,189,248,.8) 39px,rgba(56,189,248,.8) 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,rgba(56,189,248,.8) 39px,rgba(56,189,248,.8) 40px);}
.bg-orb1{position:fixed;top:-20%;left:-12%;width:480px;height:480px;background:radial-gradient(circle,rgba(3,105,161,.2) 0%,transparent 65%);z-index:1;animation:orb 26s infinite alternate ease-in-out}
.bg-orb2{position:fixed;bottom:-15%;right:-10%;width:420px;height:420px;background:radial-gradient(circle,rgba(56,189,248,.12) 0%,transparent 65%);z-index:1;animation:orb 33s 7s infinite alternate ease-in-out}
.drag-ov{position:fixed;inset:0;z-index:200;background:rgba(1,13,28,.9);backdrop-filter:blur(8px);display:flex;align-items:center;justify-content:center;}
.drag-box{text-align:center;border:2px dashed rgba(56,189,248,.55);border-radius:24px;padding:60px 80px;}
.panel{position:relative;z-index:10;width:100%;max-width:760px;background:linear-gradient(148deg,rgba(1,12,28,.96) 0%,rgba(2,18,44,.93) 100%);border:1px solid rgba(56,189,248,.12);border-radius:28px;box-shadow:0 40px 100px rgba(0,0,0,.65),inset 0 1px 0 rgba(255,255,255,.04);backdrop-filter:blur(20px);display:flex;flex-direction:column;overflow:hidden;min-height:min(94vh,900px);opacity:0;transform:translateY(24px);transition:opacity .7s ease,transform .7s ease;}
.pin{opacity:1;transform:translateY(0)}
.scanline{position:absolute;inset:0;pointer-events:none;z-index:50;background:repeating-linear-gradient(0deg,transparent,transparent 3px,rgba(56,189,248,.008) 3px,rgba(56,189,248,.008) 4px);border-radius:28px;}
.hdr{position:relative;overflow:hidden;display:flex;align-items:center;justify-content:space-between;padding:18px 20px 16px;border-bottom:1px solid rgba(56,189,248,.1);background:linear-gradient(180deg,rgba(3,105,161,.14) 0%,transparent 100%);}
.hdr-glow{position:absolute;top:0;left:8%;right:8%;height:1px;background:linear-gradient(90deg,transparent,rgba(56,189,248,.7),transparent);}
.hdr-l{display:flex;align-items:center;gap:14px}
.logo-wrap{position:relative;width:52px;height:52px;display:flex;align-items:center;justify-content:center}
.logo-bg{width:52px;height:52px;border-radius:15px;background:linear-gradient(135deg,rgba(3,105,161,.72),rgba(56,189,248,.36));border:1px solid rgba(56,189,248,.45);display:flex;align-items:center;justify-content:center;box-shadow:0 0 28px rgba(56,189,248,.3),inset 0 1px 0 rgba(255,255,255,.12);overflow:hidden;}
.logo-img{width:100%;height:100%;object-fit:cover;border-radius:15px;}
.logo-fallback{font-family:'Syne',sans-serif;font-size:24px;font-weight:800;color:#7dd3fc;display:none}
.logo-r1{position:absolute;inset:-5px;border-radius:20px;border:1px solid rgba(56,189,248,.28);animation:spin 10s linear infinite}
.logo-r2{position:absolute;inset:-11px;border-radius:26px;border:1px solid rgba(56,189,248,.1);animation:spin 16s linear infinite reverse}
.brand{font-family:'Syne',sans-serif;font-size:21px;font-weight:800;color:#f0f9ff;letter-spacing:5px;line-height:1}
.brand-s{font-size:9px;color:#3a7a96;letter-spacing:1.5px;margin-top:4px;text-transform:uppercase}
.hdr-r{display:flex;flex-direction:column;align-items:flex-end;gap:5px}
.spill{display:flex;align-items:center;gap:6px;background:rgba(0,255,136,.07);border:1px solid rgba(0,255,136,.2);border-radius:20px;padding:4px 10px}
.sdot{width:7px;height:7px;border-radius:50%;background:#00ff88;box-shadow:0 0 8px #00ff88;animation:spulse 2s infinite}
.slbl{font-size:11px;color:#00ff88;letter-spacing:1px}
.speaking-badge{font-size:11px;color:#38bdf8;background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.3);border-radius:12px;padding:3px 9px;animation:spulse 1s infinite}
.hdr-caps{display:flex;gap:3px}
.hcap{font-size:12px;background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.1);border-radius:8px;padding:2px 6px}
.mem-btn{background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.2);border-radius:10px;padding:4px 9px;cursor:pointer;font-size:14px;color:inherit}
.settings-panel{margin:8px 16px 0;padding:12px 16px;background:rgba(3,30,65,.7);border:1px solid rgba(56,189,248,.2);border-radius:14px;animation:fadeIn .3s ease}
.settings-title{font-family:'Syne',sans-serif;font-size:12px;font-weight:700;color:#38bdf8;margin-bottom:10px;letter-spacing:1px}
.settings-grid{display:flex;flex-direction:column;gap:9px}
.setting-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.setting-row.full{flex-direction:column;align-items:flex-start}
.setting-lbl{font-size:11px;color:#7dd3fc;flex-shrink:0}
.setting-val{font-size:11px;color:#4a8fa8}
.toggle-btn{padding:3px 12px;border-radius:20px;border:none;cursor:pointer;font-size:11px;font-weight:700}
.toggle-btn.on{background:#0ea5e9;color:white}
.toggle-btn.off{background:rgba(56,189,248,.1);color:#4a8fa8;border:1px solid rgba(56,189,248,.2)}
.slider{flex:1;accent-color:#0ea5e9;cursor:pointer}
.test-btn{padding:3px 12px;background:rgba(56,189,248,.12);border:1px solid rgba(56,189,248,.3);border-radius:9px;color:#38bdf8;font-size:11px;cursor:pointer}
.stop-btn{background:rgba(239,68,68,.1);border-color:rgba(239,68,68,.3);color:#f87171}
.cstrip{display:flex;align-items:center;gap:10px;margin:10px 16px 0;padding:8px 14px;background:linear-gradient(90deg,rgba(3,105,161,.1),rgba(56,189,248,.04));border:1px solid rgba(56,189,248,.11);border-radius:12px;}
.cav{width:30px;height:30px;border-radius:9px;background:linear-gradient(135deg,#0369a1,#0ea5e9);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:#fff;flex-shrink:0}
.cinfo{flex:1}
.cname{font-size:12px;color:#7dd3fc;font-weight:600;display:flex;align-items:center;gap:6px}
.cbadge{font-size:9px;background:rgba(56,189,248,.14);border:1px solid rgba(56,189,248,.28);border-radius:7px;padding:1px 6px;color:#38bdf8;letter-spacing:1px}
.csub{font-size:10px;color:#3a6a80;margin-top:1px}
.cdot{width:6px;height:6px;border-radius:50%;background:#38bdf8;box-shadow:0 0 8px #38bdf8;animation:spulse 2.5s infinite}
.chat{flex:1;overflow-y:auto;padding:14px 14px 6px;display:flex;flex-direction:column;gap:13px;scroll-behavior:smooth;}
.chat::-webkit-scrollbar{width:3px}
.chat::-webkit-scrollbar-thumb{background:rgba(56,189,248,.16);border-radius:2px}
.row{display:flex;align-items:flex-end;gap:8px;animation:msgIn .35s ease both}
.ra{justify-content:flex-start}.ru{justify-content:flex-end}
.av{position:relative;width:34px;height:34px;border-radius:11px;flex-shrink:0;display:flex;align-items:center;justify-content:center;overflow:hidden;}
.aai{background:linear-gradient(135deg,#0369a1,#0ea5e9);box-shadow:0 4px 16px rgba(14,165,233,.38);}
.av-logo{width:100%;height:100%;object-fit:cover;border-radius:11px;}
.avc{font-family:'Syne',sans-serif;font-size:14px;font-weight:800;color:#fff}
.avr{position:absolute;inset:-2px;border-radius:13px;border:1px solid rgba(56,189,248,.38);pointer-events:none}
.aus{background:linear-gradient(135deg,#1e3a5f,#1d4ed8);font-size:10px;font-weight:700;color:#93c5fd;letter-spacing:.5px;}
.ba{max-width:76%;padding:12px 15px;background:linear-gradient(135deg,rgba(3,50,100,.52),rgba(3,68,136,.38));border:1px solid rgba(56,189,248,.13);border-radius:18px 18px 18px 4px;backdrop-filter:blur(10px);box-shadow:0 4px 20px rgba(0,0,0,.22);}
.bu{max-width:76%;padding:12px 15px;background:linear-gradient(135deg,#0369a1,#0ea5e9);border-radius:18px 18px 4px 18px;box-shadow:0 4px 20px rgba(14,165,233,.3);}
.ta{font-size:14px;line-height:1.76;color:#bae6fd;white-space:pre-wrap}
.tu{font-size:14px;line-height:1.76;color:#fff}
.msg-footer{display:flex;align-items:center;justify-content:flex-end;gap:7px;margin-top:4px}
.mtime{font-size:10px;color:rgba(148,210,240,.3)}
.speak-btn{background:none;border:none;cursor:pointer;font-size:12px;opacity:.5;transition:opacity .2s;padding:0}
.speak-btn:hover{opacity:1}
.mimg{max-width:100%;max-height:180px;border-radius:10px;object-fit:cover;display:block;border:1px solid rgba(56,189,248,.2);margin-bottom:6px}
.mfname{font-size:10px;color:rgba(148,210,240,.4);margin-bottom:5px}
.mfbadge{background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.2);border-radius:8px;padding:4px 10px;font-size:12px;color:#7dd3fc;margin-bottom:6px;display:inline-block}
.typing{display:flex;gap:5px;align-items:center;height:20px}
.dot{width:7px;height:7px;border-radius:50%;background:#38bdf8;display:inline-block}
.d1{animation:bounce 1.2s 0s infinite ease-in-out}
.d2{animation:bounce 1.2s .2s infinite ease-in-out}
.d3{animation:bounce 1.2s .4s infinite ease-in-out}
.tlbl{font-size:10px;color:#38bdf8;margin-top:6px;letter-spacing:1px;opacity:.6}
.interim{align-self:center;padding:7px 15px;background:rgba(14,165,233,.1);border:1px solid rgba(56,189,248,.28);border-radius:20px;font-size:13px;color:#7dd3fc;font-style:italic;animation:fadeIn .3s ease}
.verr{align-self:center;padding:7px 15px;background:rgba(239,68,68,.1);border:1px solid rgba(239,68,68,.28);border-radius:20px;font-size:12px;color:#fca5a5;animation:fadeIn .3s ease;text-align:center;max-width:90%}
.fp{display:flex;align-items:center;gap:8px;margin:4px 14px;padding:8px 12px;background:rgba(56,189,248,.06);border:1px solid rgba(56,189,248,.18);border-radius:12px;animation:fadeIn .3s ease}
.fp-img{width:38px;height:38px;border-radius:7px;object-fit:cover;border:1px solid rgba(56,189,248,.2)}
.fp-name{flex:1;font-size:11px;color:#7dd3fc;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.fp-x{background:rgba(255,80,80,.12);border:1px solid rgba(255,80,80,.28);border-radius:7px;color:#ff6b6b;font-size:11px;padding:2px 7px;cursor:pointer}
.mic-sec{display:flex;flex-direction:column;align-items:center;padding:10px 0 6px}
.stop-speak-btn{margin-bottom:7px;padding:5px 16px;background:rgba(239,68,68,.15);border:1px solid rgba(239,68,68,.35);border-radius:20px;color:#f87171;font-size:11px;cursor:pointer;animation:fadeIn .3s ease}
.mic-btn{position:relative;width:96px;height:96px;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;outline:none;}
.mic-btn:disabled{cursor:wait}
.mring{position:absolute;border-radius:50%;border:1.5px solid;pointer-events:none;}
.mcore{width:64px;height:64px;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative;z-index:2;transition:all .3s cubic-bezier(.34,1.56,.64,1);}
.bars{display:flex;align-items:center;gap:3px;height:22px}
.bar{width:3px;background:white;border-radius:2px;animation:sbar .55s infinite ease-in-out alternate}
.mlbl{font-size:11px;color:#1e4a66;letter-spacing:1px;margin-top:6px;text-align:center;max-width:260px;line-height:1.5;min-height:26px}
.irow{display:flex;gap:7px;padding:5px 14px 7px;align-items:center}
.abtn{width:40px;height:40px;flex-shrink:0;background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.18);border-radius:11px;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#38bdf8;}
.inp{flex:1;padding:11px 14px;background:rgba(2,20,46,.72);border:1px solid rgba(56,189,248,.17);border-radius:13px;color:#bae6fd;font-size:14px;outline:none;font-family:'DM Sans',sans-serif;transition:border-color .2s,box-shadow .2s}
.inp:focus{border-color:rgba(56,189,248,.42);box-shadow:0 0 0 3px rgba(56,189,248,.08)}
.inp::placeholder{color:rgba(74,143,168,.4)}
.sbtn{width:42px;height:42px;flex-shrink:0;background:linear-gradient(135deg,#0369a1,#0ea5e9);border:none;border-radius:13px;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 4px 18px rgba(14,165,233,.4);}
.qrow{display:flex;flex-wrap:wrap;gap:5px;padding:2px 14px 10px}
.qb{display:flex;align-items:center;gap:4px;padding:5px 11px;background:rgba(14,165,233,.04);border:1px solid rgba(56,189,248,.1);border-radius:20px;color:#4a7a96;font-size:11px;cursor:pointer;font-family:'DM Sans',sans-serif;transition:all .2s}
.qb:hover{background:rgba(14,165,233,.13);border-color:rgba(56,189,248,.4);color:#e0f2fe}
.qbf{border-color:rgba(56,189,248,.16)}
.foot{padding:7px 16px 10px;border-top:1px solid rgba(56,189,248,.07);text-align:center;font-size:10px;color:#0f1e2e;letter-spacing:.7px}
.foot strong{color:#192e40}
@keyframes flt{0%{transform:translate(0,0)}100%{transform:translate(12px,-18px)}}
@keyframes orb{0%{opacity:.5}100%{opacity:.85}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes spinL{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes spulse{0%,100%{opacity:1}50%{opacity:.4}}
@keyframes msgIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
@keyframes bounce{0%,80%,100%{transform:scaleY(.5);opacity:.35}40%{transform:scaleY(1.5);opacity:1}}
@keyframes ring{0%{transform:scale(.7);opacity:.6}100%{transform:scale(1.8);opacity:0}}
@keyframes sbar{0%{height:4px}50%{height:20px}100%{height:6px}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
`;
