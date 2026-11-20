/* English Speak Lab — PWA client.
 * Talks to ElevenLabs directly from the device:
 *  - ElevenLabs Agent (voice): real-time conversation with corrections via client tools
 *  - ElevenLabs Agent (text-only): questions answered in Portuguese
 *  - Text to Speech: sentences and words (cached on the device to save credits)
 *  - Speech to Text (Scribe): pronunciation check with per-word confidence
 * Everything the learner owns (settings, vocabulary, progress) lives in localStorage.
 */
(() => {
  "use strict";
  const API = "https://api.elevenlabs.io";
  const EL = window.ElevenLabsClient;
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

  // ---------------- storage ----------------
  const store = {
    get(k, d) { try { const v = localStorage.getItem("esl:" + k); return v == null ? d : JSON.parse(v); } catch { return d; } },
    set(k, v) { try { localStorage.setItem("esl:" + k, JSON.stringify(v)); } catch {} },
  };
  const S = {
    settings: store.get("settings", { agentId: "", apiKey: "", voiceId: "", voiceName: "" }),
    level: store.get("level", "A2"),
    scene: store.get("scene", "free"),
    vocab: store.get("vocab", []),
    days: store.get("days", {}),
    talkSeconds: store.get("talkSeconds", 0),
  };
  const save = (k) => store.set(k, S[k]);

  let toastTimer;
  function toast(msg) {
    const t = $("toast"); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2600);
  }

  // ---------------- navigation ----------------
  const TABS = ["talk", "ask", "pron", "vocab", "plan", "settings"];
  function showTab(name) {
    if (!TABS.includes(name)) name = "talk";
    document.querySelectorAll("#tabbar button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
    TABS.forEach((t) => ($("view-" + t).hidden = t !== name));
    if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
    if (name !== "ask") endAskSession();
    if (name === "vocab") renderFlash();
    if (name === "plan") renderPlan();
    window.scrollTo(0, 0);
  }
  $("tabbar").addEventListener("click", (e) => { const b = e.target.closest("[data-tab]"); if (b) showTab(b.dataset.tab); });
  document.addEventListener("click", (e) => { const g = e.target.closest("[data-go]"); if (g) showTab(g.dataset.go); });
  window.addEventListener("hashchange", () => showTab(location.hash.slice(1)));

  $("level").value = S.level;
  $("level").addEventListener("change", () => { S.level = $("level").value; save("level"); renderPronTopics(); nextPron(); });

  function refreshSetupBanner() { $("setupBanner").hidden = Boolean(S.settings.agentId); }

  // ---------------- iOS audio unlock ----------------
  // iOS only lets audio play after a tap. We prime one shared <audio> and an AudioContext on the first tap.
  const player = new Audio();
  player.setAttribute("playsinline", "");
  let audioUnlocked = false;
  function silentWav() {
    // 0.1 s of 8 kHz mono silence as a valid WAV file.
    const n = 800, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
    const w = (o, str) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    w(36, "data"); v.setUint32(40, n, true); for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
    return new Blob([buf], { type: "audio/wav" });
  }
  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    try {
      player.src = URL.createObjectURL(silentWav());
      player.play().catch(() => {});
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) { const c = new Ctx(); c.resume().then(() => c.close()).catch(() => {}); }
    } catch {}
  }
  document.addEventListener("touchend", unlockAudio, { once: true, passive: true });
  document.addEventListener("click", unlockAudio, { once: true });

  // ---------------- ElevenLabs REST helpers ----------------
  const hasKey = () => Boolean(S.settings.apiKey);
  async function el(path, opts = {}) {
    const res = await fetch(API + path, { ...opts, headers: { "xi-api-key": S.settings.apiKey, ...(opts.headers || {}) } });
    if (!res.ok) {
      let detail = ""; try { const j = await res.json(); detail = j?.detail?.message || j?.detail?.status || (typeof j?.detail === "string" ? j.detail : ""); } catch {}
      const err = new Error(detail || "HTTP " + res.status); err.status = res.status; throw err;
    }
    return res;
  }
  function errText(e) {
    if (e?.status === 401) return "Chave de API recusada. Confira em Ajustes e as permissões da chave.";
    if (e?.status === 402 || /quota|credit/i.test(e?.message || "")) return "Sem créditos no ElevenLabs para isso agora.";
    if (e?.status === 429) return "Muitas chamadas seguidas. Espere um pouco.";
    if (e?.name === "NotAllowedError") return "Microfone bloqueado. Libere em Ajustes do iPhone > Safari > Microfone.";
    return e?.message ? "Erro: " + e.message : "Algo deu errado. Tente de novo.";
  }

  // Text to Speech with a device cache, so repeated sentences cost no credits.
  const TTS_MODEL = "eleven_flash_v2_5";
  async function speak(text, speed = 1) {
    if (!text) return;
    if (!hasKey() || !S.settings.voiceId) return speakFallback(text, speed);
    const key = `${API}/__tts/${S.settings.voiceId}/${TTS_MODEL}/${speed}/${encodeURIComponent(text)}`;
    try {
      let blob;
      const cache = "caches" in window ? await caches.open("tts-v1") : null;
      const hit = cache && (await cache.match(key));
      if (hit) blob = await hit.blob();
      else {
        const res = await el(`/v1/text-to-speech/${encodeURIComponent(S.settings.voiceId)}?output_format=mp3_44100_64`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "audio/mpeg" },
          body: JSON.stringify({ text, model_id: TTS_MODEL, voice_settings: { stability: 0.5, similarity_boost: 0.75, speed } }),
        });
        blob = await res.blob();
        cache?.put(key, new Response(blob, { headers: { "Content-Type": "audio/mpeg" } })).catch(() => {});
      }
      if (player.src.startsWith("blob:")) URL.revokeObjectURL(player.src);
      player.src = URL.createObjectURL(blob);
      player.playbackRate = 1;
      await player.play();
    } catch (e) {
      toast(errText(e));
      speakFallback(text, speed);
    }
  }
  function speakFallback(text, speed) {
    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = "en-US"; u.rate = speed;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch {}
  }

  // Session credentials: a private agent gets a short-lived token from the API key; a public agent uses its id.
  async function sessionAuth(textOnly) {
    const id = encodeURIComponent(S.settings.agentId);
    if (hasKey()) {
      try {
        if (textOnly) {
          const j = await (await el(`/v1/convai/conversation/get-signed-url?agent_id=${id}`)).json();
          if (j.signed_url) return { signedUrl: j.signed_url };
        } else {
          const j = await (await el(`/v1/convai/conversation/token?agent_id=${id}`)).json();
          if (j.token) return { conversationToken: j.token, connectionType: "webrtc" };
        }
      } catch (e) { if (e.status === 401) throw e; /* public agent or key without agent permission: fall through */ }
    }
    return textOnly ? { agentId: S.settings.agentId } : { agentId: S.settings.agentId, connectionType: "webrtc" };
  }

  // ---------------- vocabulary (Leitner boxes) ----------------
  const GAPS = [0, 1, 3, 7, 14, 30]; // days until next review, per box
  const slug = (s) => s.toLowerCase().trim().replace(/\s+/g, " ");
  function addWord(en, pt, quiet) {
    en = String(en || "").trim(); pt = String(pt || "").trim();
    if (!en) return false;
    if (S.vocab.some((v) => slug(v.en) === slug(en))) return false;
    S.vocab.unshift({ en, pt, box: 0, due: Date.now(), added: Date.now() });
    save("vocab"); renderVocab();
    if (!quiet) toast(`Salvo: ${en}`);
    return true;
  }
  const knownWords = () => S.vocab.slice(0, 40).map((v) => v.en).join(", ") || "none yet";

  // Client tools the agent can call during a conversation (names must match the agent setup).
  function clientTools(feed) {
    return {
      save_word: ({ word, translation }) => {
        const ok = addWord(word, translation, true);
        if (ok) feed.insertAdjacentHTML("beforeend", `<div class="saved">+ ${esc(word)} salvo no vocabulário</div>`);
        scrollFeed(feed);
        return ok ? "saved" : "already saved";
      },
      show_correction: ({ original, corrected, explanation }) => {
        feed.insertAdjacentHTML("beforeend", `<div class="fix"><span class="label">Correção</span><span><s>${esc(original)}</s> → <b>${esc(corrected)}</b></span><span>${esc(explanation)}</span></div>`);
        scrollFeed(feed);
        return "shown";
      },
    };
  }
  const scrollFeed = () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

  // ---------------- TALK (voice agent) ----------------
  const SCENES = [
    { id: "free", name: "Papo livre", brief: "a friendly casual chat about the learner's day, interests and plans", hello: "Hi! How's your day going so far?" },
    { id: "interview", name: "Entrevista", brief: "a job interview for a software position; you are the interviewer", hello: "Hi, thanks for coming in. Could you start by telling me a little about yourself?" },
    { id: "restaurant", name: "Restaurante", brief: "a restaurant; you are the waiter taking the order", hello: "Good evening! Welcome in. Table for how many?" },
    { id: "travel", name: "Aeroporto e hotel", brief: "airport check-in followed by a hotel front desk; you play the staff", hello: "Hello! Can I see your passport, please? Where are you flying today?" },
    { id: "meeting", name: "Reunião", brief: "a short work meeting about a project status; you are a colleague", hello: "Hey, thanks for joining. So, how's the project going on your side?" },
    { id: "doctor", name: "Médico", brief: "a doctor's appointment; you are the doctor", hello: "Hello, please have a seat. What brings you in today?" },
    { id: "debate", name: "Opinião", brief: "a friendly debate where you ask for the learner's opinion on everyday topics and gently challenge it", hello: "Here's a question for you: is it better to work from home or from an office? What do you think?" },
  ];
  function renderScenes() {
    $("scenes").innerHTML = SCENES.map((s) => `<button class="chip" data-s="${s.id}" aria-pressed="${s.id === S.scene}">${esc(s.name)}</button>`).join("");
  }
  $("scenes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-s]"); if (!b || voice) return;
    S.scene = b.dataset.s; save("scene"); renderScenes();
  });

  let voice = null, voiceStarted = 0, muted = false, starting = false;
  function setOrb(mode, text) { $("orb").dataset.mode = mode; $("orbState").textContent = text; }

  $("orb").addEventListener("click", async () => {
    if (starting) return;
    if (voice) { voice.endSession().catch(() => {}); return; }
    if (!S.settings.agentId) { showTab("settings"); toast("Configure o ID do agente primeiro."); return; }
    if (!EL?.Conversation) { toast("Não consegui carregar o ElevenLabs. Verifique a internet."); return; }
    starting = true;
    setOrb("connecting", "Conectando…");
    try {
      // Ask for the mic inside the tap, which iOS requires.
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      const scene = SCENES.find((s) => s.id === S.scene) || SCENES[0];
      const feed = $("talkFeed");
      feed.innerHTML = "";
      voice = await EL.Conversation.startSession({
        ...(await sessionAuth(false)),
        dynamicVariables: { mode: "conversation", level: S.level, scenario: scene.brief, first_message: scene.hello, known_words: knownWords() },
        clientTools: clientTools(feed),
        onConnect: () => { voiceStarted = Date.now(); setOrb("listening", "Pode falar"); $("muteBtn").hidden = false; },
        onModeChange: ({ mode }) => setOrb(mode, mode === "speaking" ? "Professor falando… (pode interromper)" : muted ? "Microfone silenciado" : "Ouvindo você"),
        onMessage: ({ message, source }) => {
          if (!message) return;
          feed.insertAdjacentHTML("beforeend", `<div class="bubble ${source === "user" ? "me" : "ai"}">${esc(message)}</div>`);
          scrollFeed(feed);
        },
        onError: (msg) => toast("Erro na conversa: " + msg),
        onDisconnect: () => {
          if (voiceStarted) {
            const secs = Math.round((Date.now() - voiceStarted) / 1000);
            S.talkSeconds += secs; save("talkSeconds");
            if (secs >= 60) markDone("talk");
          }
          voice = null; voiceStarted = 0; muted = false;
          $("muteBtn").hidden = true; $("muteBtn").textContent = "Silenciar microfone";
          setOrb("", "Toque para começar a conversa");
        },
      });
    } catch (e) {
      voice = null;
      setOrb("", "Toque para tentar de novo");
      toast(errText(e));
    } finally { starting = false; }
  });
  $("muteBtn").addEventListener("click", () => {
    if (!voice) return;
    muted = !muted; voice.setMicMuted(muted);
    $("muteBtn").textContent = muted ? "Ativar microfone" : "Silenciar microfone";
    setOrb(muted ? "connecting" : "listening", muted ? "Microfone silenciado" : "Ouvindo você");
  });

  // ---------------- ASK (text-only agent) ----------------
  const ASK_EX = ["Diferença entre make e do", "Present perfect: quando usar?", "Como pedir aumento em inglês?", "Phrasal verbs com get", "Como pronunciar th?", "Me dê um teste rápido de nível"];
  $("askExamples").innerHTML = ASK_EX.map((q) => `<button class="chip" data-q="${esc(q)}">${esc(q)}</button>`).join("");
  $("askExamples").addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (b) { $("askInput").value = b.dataset.q; sendAsk(); } });

  let ask = null, askStarting = null, askWaiting = null;
  function md(s) {
    const lines = esc(s).split("\n"); let html = "", list = false;
    for (let l of lines) {
      l = l.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/^#{1,4}\s*(.+)$/, "<strong>$1</strong>");
      if (/^\s*[-*•]\s+/.test(l)) { if (!list) { html += "<ul>"; list = true; } html += "<li>" + l.replace(/^\s*[-*•]\s+/, "") + "</li>"; continue; }
      if (list) { html += "</ul>"; list = false; }
      if (l.trim()) html += "<p>" + l + "</p>";
    }
    return html + (list ? "</ul>" : "");
  }
  async function ensureAsk() {
    if (ask) return ask;
    if (askStarting) return askStarting;
    const feed = $("askFeed");
    askStarting = (async () => {
      const conv = await EL.Conversation.startSession({
        ...(await sessionAuth(true)),
        textOnly: true,
        dynamicVariables: { mode: "questions", level: S.level, scenario: "answering questions about English", first_message: "Pode mandar sua dúvida.", known_words: knownWords() },
        clientTools: clientTools(feed),
        onMessage: ({ message, source }) => {
          if (source !== "ai" || !message) return;
          if (askWaiting) { askWaiting.remove(); askWaiting = null; }
          feed.insertAdjacentHTML("beforeend", `<div class="bubble ai">${md(message)}</div>`);
          scrollFeed(feed);
          markDone("ask");
        },
        onError: (msg) => toast("Erro: " + msg),
        onDisconnect: () => { ask = null; },
      });
      ask = conv; return conv;
    })();
    try { return await askStarting; } finally { askStarting = null; }
  }
  function endAskSession() { if (ask) { ask.endSession().catch(() => {}); ask = null; } }
  async function sendAsk() {
    const text = $("askInput").value.trim(); if (!text) return;
    if (!S.settings.agentId) { showTab("settings"); toast("Configure o ID do agente primeiro."); return; }
    const feed = $("askFeed");
    $("askInput").value = "";
    feed.insertAdjacentHTML("beforeend", `<div class="bubble me">${esc(text)}</div>`);
    askWaiting?.remove();
    feed.insertAdjacentHTML("beforeend", `<div class="bubble ai thinking">pensando…</div>`);
    askWaiting = feed.lastElementChild;
    scrollFeed(feed);
    try {
      const conv = await ensureAsk();
      conv.sendUserMessage(text);
    } catch (e) {
      askWaiting?.remove(); askWaiting = null;
      toast(errText(e)); $("askInput").value = text;
    }
  }
  $("askForm").addEventListener("submit", (e) => { e.preventDefault(); sendAsk(); });
  $("askInput").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendAsk(); } });

  // ---------------- PRONUNCIATION ----------------
  const tier = () => (S.level <= "A2" ? "A" : S.level <= "B2" ? "B" : "C");
  let pronTopic = store.get("pronTopic", "daily"), pronIdx = -1, pronItem = null;
  function renderPronTopics() {
    $("pronTopics").innerHTML = Object.entries(window.SENTENCES).map(([k, t]) => `<button class="chip" data-t="${k}" aria-pressed="${k === pronTopic}">${esc(t.name)}</button>`).join("");
  }
  $("pronTopics").addEventListener("click", (e) => {
    const b = e.target.closest("[data-t]"); if (!b) return;
    pronTopic = b.dataset.t; store.set("pronTopic", pronTopic); pronIdx = -1; renderPronTopics(); nextPron();
  });
  function nextPron() {
    const list = window.SENTENCES[pronTopic]?.[tier()] || [];
    if (!list.length) return;
    pronIdx = (pronIdx + 1) % list.length;
    const [en, pt, tip] = list[pronIdx];
    pronItem = { en, pt, tip };
    $("pronMeta").textContent = `${window.SENTENCES[pronTopic].name} · ${pronIdx + 1}/${list.length}`;
    $("pronText").textContent = en; $("pronPt").textContent = pt; $("pronTip").textContent = "Dica: " + tip;
    $("pronResult").hidden = true;
  }
  $("pronListen").addEventListener("click", () => speak(pronItem?.en, 1));
  $("pronSlow").addEventListener("click", () => speak(pronItem?.en, 0.8));
  $("pronNext").addEventListener("click", nextPron);

  let rec = null, recChunks = [];
  const recMime = () => ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";
  $("pronRec").addEventListener("click", async () => {
    if (rec && rec.state === "recording") { rec.stop(); return; }
    if (!hasKey()) { showTab("settings"); toast("A avaliação de pronúncia usa sua chave do ElevenLabs."); return; }
    if (!window.MediaRecorder) { toast("Este aparelho não grava áudio no navegador."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = recMime();
      rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recChunks = [];
      rec.ondataavailable = (e) => e.data.size && recChunks.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        $("pronRec").classList.remove("on"); $("pronRec").textContent = "Gravar minha voz";
        const blob = new Blob(recChunks, { type: rec.mimeType || mime || "audio/mp4" });
        rec = null;
        transcribe(blob);
      };
      rec.start();
      $("pronRec").classList.add("on"); $("pronRec").textContent = "Gravando… toque para parar";
    } catch (e) { toast(errText(e)); }
  });

  async function transcribe(blob) {
    if (blob.size < 2000) { toast("Gravação muito curta. Fale a frase inteira."); return; }
    $("pronResult").hidden = false;
    $("pronHeard").textContent = "analisando…"; $("pronScore").textContent = ""; $("pronDiff").textContent = "";
    const ext = blob.type.includes("webm") ? "webm" : "m4a";
    const send = async (model) => {
      const fd = new FormData();
      fd.append("file", blob, "speech." + ext);
      fd.append("model_id", model);
      fd.append("language_code", "en");
      fd.append("tag_audio_events", "false");
      return (await el("/v1/speech-to-text", { method: "POST", body: fd })).json();
    };
    try {
      let j;
      try { j = await send("scribe_v2"); } catch (e) { if (e.status === 400 || e.status === 422) j = await send("scribe_v1"); else throw e; }
      scorePron(j);
    } catch (e) { $("pronHeard").textContent = errText(e); }
  }

  const norm = (s) => String(s).toLowerCase().replace(/[’']/g, "'").replace(/[^a-z0-9' -]+/g, " ").replace(/-/g, " ").split(/\s+/).filter(Boolean);
  function scorePron(j) {
    const target = norm(pronItem.en);
    const heard = [];
    (j.words || []).filter((w) => w.type === "word").forEach((w) => norm(w.text).forEach((t) => heard.push({ t, lp: typeof w.logprob === "number" ? w.logprob : 0 })));
    if (!heard.length) norm(j.text || "").forEach((t) => heard.push({ t, lp: 0 }));
    // Longest common subsequence: which target words were heard, in order.
    const m = target.length, n = heard.length;
    const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) for (let k = n - 1; k >= 0; k--) dp[i][k] = target[i] === heard[k].t ? dp[i + 1][k + 1] + 1 : Math.max(dp[i + 1][k], dp[i][k + 1]);
    const status = new Array(m).fill("miss");
    let i = 0, k = 0;
    while (i < m && k < n) {
      if (target[i] === heard[k].t) { status[i] = heard[k].lp < -0.7 ? "weak" : "ok"; i++; k++; }
      else if (dp[i + 1][k] >= dp[i][k + 1]) i++; else k++;
    }
    const pts = status.reduce((a, s) => a + (s === "ok" ? 1 : s === "weak" ? 0.5 : 0), 0);
    const pct = m ? Math.round((pts / m) * 100) : 0;
    $("pronHeard").textContent = j.text?.trim() || "(nada reconhecido)";
    $("pronScore").textContent = pct + "%";
    $("pronScore").style.color = pct >= 85 ? "var(--good)" : pct >= 60 ? "var(--warn)" : "var(--bad)";
    $("pronDiff").innerHTML = target.map((w, x) => `<span class="${status[x]}">${esc(w)}</span>`).join(" ");
    if (pct >= 85) markDone("pron");
  }

  // ---------------- VOCAB UI ----------------
  $("vForm").addEventListener("submit", (e) => {
    e.preventDefault();
    if (addWord($("vEn").value, $("vPt").value)) { $("vEn").value = ""; $("vPt").value = ""; renderFlash(); }
    else toast("Essa palavra já está salva.");
  });
  $("vList").addEventListener("click", (e) => {
    const s = e.target.closest("[data-vs]"); if (s) speak(S.vocab[+s.dataset.vs]?.en);
    const d = e.target.closest("[data-vd]");
    if (d) {
      if (d.dataset.armed) { S.vocab.splice(+d.dataset.vd, 1); save("vocab"); renderVocab(); renderFlash(); }
      else { d.dataset.armed = "1"; d.textContent = "confirmar?"; setTimeout(() => { if (d.isConnected) { delete d.dataset.armed; d.textContent = "apagar"; } }, 3000); }
    }
  });
  function renderVocab() {
    $("vTotal").textContent = S.vocab.length + " salvas";
    $("vList").innerHTML = S.vocab.length
      ? S.vocab.map((v, i) => `<div class="vrow"><span class="en">${esc(v.en)} <span class="box">caixa ${v.box}</span></span><span class="pt">${esc(v.pt)}</span><span class="acts"><button data-vs="${i}">ouvir</button><button class="del" data-vd="${i}">apagar</button></span></div>`).join("")
      : `<p class="small muted">Nenhuma palavra ainda. Na conversa, diga "save that word" e o professor salva aqui.</p>`;
  }
  let flash = null;
  const due = () => S.vocab.filter((v) => v.due <= Date.now());
  function renderFlash() {
    const list = due();
    flash = list[0] || null;
    $("flashBack").hidden = true;
    if (!flash) {
      $("flashCount").textContent = "Revisão em dia";
      $("flashFront").textContent = S.vocab.length ? "Nada para revisar agora" : "Comece salvando palavras";
      $("flashBtns").innerHTML = ""; return;
    }
    $("flashCount").textContent = list.length + " para revisar hoje";
    $("flashFront").textContent = flash.en;
    $("flashBack").textContent = flash.pt || "(sem tradução)";
    $("flashBtns").innerHTML = `<button class="btn" data-f="say">Ouvir</button><button class="btn primary" data-f="show">Mostrar</button>`;
  }
  $("flashBtns").addEventListener("click", (e) => {
    const b = e.target.closest("[data-f]"); if (!b || !flash) return;
    const f = b.dataset.f;
    if (f === "say") speak(flash.en);
    if (f === "show") {
      $("flashBack").hidden = false;
      $("flashBtns").innerHTML = `<button class="btn" data-f="say">Ouvir</button><button class="btn" data-f="miss">Errei</button><button class="btn primary" data-f="hit">Acertei</button>`;
    }
    if (f === "hit" || f === "miss") {
      flash.box = f === "hit" ? Math.min(flash.box + 1, GAPS.length - 1) : 0;
      flash.due = f === "hit" ? Date.now() + GAPS[flash.box] * 86400000 : Date.now() + 10 * 60000;
      save("vocab"); markDone("vocab"); renderVocab(); renderFlash();
    }
  });

  // ---------------- PLAN ----------------
  const ROUTINE = [
    { id: "vocab", t: "Revisar palavras", d: "Passe pelos cartões do dia.", min: 5 },
    { id: "pron", t: "Pronúncia", d: "Uma frase com 85% ou mais.", min: 10 },
    { id: "talk", t: "Conversar por voz", d: "Pelo menos 1 minuto; o ideal são 10.", min: 10 },
    { id: "ask", t: "Tirar 1 dúvida", d: "O que travou na conversa vira pergunta.", min: 5 },
    { id: "input", t: "Ouvir inglês real", d: "Vídeo, podcast ou série com legenda em inglês.", min: 15 },
  ];
  function markDone(id) {
    const k = dayKey(); const set = new Set(S.days[k] || []);
    if (set.has(id)) return;
    set.add(id); S.days[k] = [...set]; trimDays(); save("days");
  }
  function trimDays() { const keys = Object.keys(S.days).sort().slice(-180); S.days = Object.fromEntries(keys.map((k) => [k, S.days[k]])); }
  $("checks").addEventListener("change", (e) => {
    const c = e.target.closest("[data-c]"); if (!c) return;
    const k = dayKey(); const set = new Set(S.days[k] || []);
    c.checked ? set.add(c.dataset.c) : set.delete(c.dataset.c);
    S.days[k] = [...set]; save("days"); renderPlan();
  });
  function renderPlan() {
    const done = new Set(S.days[dayKey()] || []);
    $("today").textContent = new Date().toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short" });
    $("checks").innerHTML = ROUTINE.map((r) => `<label class="check"><input type="checkbox" id="c-${r.id}" data-c="${r.id}" ${done.has(r.id) ? "checked" : ""}><span><span class="t">${esc(r.t)}</span><br><span class="small muted">${esc(r.d)}</span></span><span class="mins">${r.min} min</span></label>`).join("");
    const studied = (d) => (S.days[dayKey(d)] || []).length > 0;
    let streak = 0; const d = new Date();
    if (!studied(d)) d.setDate(d.getDate() - 1);
    while (studied(d)) { streak++; d.setDate(d.getDate() - 1); }
    $("streak").textContent = streak;
    $("totalDays").textContent = Object.values(S.days).filter((x) => x.length).length;
    $("talkMins").textContent = Math.round(S.talkSeconds / 60);
    let cells = "";
    for (let i = 6; i >= 0; i--) {
      const x = new Date(); x.setDate(x.getDate() - i);
      const n = (S.days[dayKey(x)] || []).length;
      cells += `<div class="day ${n >= 4 ? "done" : n ? "part" : ""}">${x.toLocaleDateString("pt-BR", { weekday: "short" }).slice(0, 3)}</div>`;
    }
    $("week").innerHTML = cells;
  }

  // ---------------- SETTINGS ----------------
  function fillSettings() {
    $("sAgent").value = S.settings.agentId; $("sKey").value = S.settings.apiKey;
    if (S.settings.voiceId) $("sVoice").innerHTML = `<option value="${esc(S.settings.voiceId)}">${esc(S.settings.voiceName || S.settings.voiceId)}</option>`;
  }
  $("setForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const opt = $("sVoice").selectedOptions[0];
    S.settings = { agentId: $("sAgent").value.trim(), apiKey: $("sKey").value.trim(), voiceId: $("sVoice").value, voiceName: opt?.value ? opt.textContent : "" };
    save("settings"); refreshSetupBanner();
    $("sStatus").textContent = "Salvo neste aparelho.";
    toast("Ajustes salvos");
  });
  $("sLoadVoices").addEventListener("click", async () => {
    S.settings.apiKey = $("sKey").value.trim();
    if (!hasKey()) { toast("Cole sua chave de API primeiro."); return; }
    $("sStatus").textContent = "Carregando vozes…";
    try {
      let voices;
      try { voices = (await (await el("/v2/voices?page_size=100")).json()).voices; }
      catch { voices = (await (await el("/v1/voices")).json()).voices; }
      voices = (voices || []).sort((a, b) => (a.labels?.language === "en" ? -1 : 0) - (b.labels?.language === "en" ? -1 : 0));
      $("sVoice").innerHTML = voices.map((v) => `<option value="${esc(v.voice_id)}" ${v.voice_id === S.settings.voiceId ? "selected" : ""}>${esc(v.name)}${v.labels?.accent ? " · " + esc(v.labels.accent) : ""}</option>`).join("");
      $("sStatus").textContent = `${voices.length} vozes. Escolha uma e toque em Salvar.`;
    } catch (e) { $("sStatus").textContent = errText(e); }
  });
  $("bExport").addEventListener("click", async () => {
    const data = JSON.stringify({ v: 1, level: S.level, vocab: S.vocab, days: S.days, talkSeconds: S.talkSeconds });
    $("backupBox").value = data;
    try { await navigator.clipboard.writeText(data); toast("Backup copiado"); }
    catch { $("backupBox").select(); toast("Selecionado: copie manualmente"); }
  });
  $("bImport").addEventListener("click", () => {
    try {
      const d = JSON.parse($("backupBox").value);
      if (!Array.isArray(d.vocab) || typeof d.days !== "object") throw 0;
      Object.assign(S, { vocab: d.vocab, days: d.days, talkSeconds: d.talkSeconds || 0, level: d.level || S.level });
      ["vocab", "days", "talkSeconds", "level"].forEach(save);
      $("level").value = S.level; renderAll(); toast("Backup restaurado");
    } catch { toast("Backup inválido. Cole o texto completo."); }
  });

  // ---------------- boot ----------------
  function renderAll() { renderVocab(); renderFlash(); renderPlan(); }
  renderScenes(); renderPronTopics(); nextPron(); fillSettings(); refreshSetupBanner(); renderAll();
  showTab(location.hash.slice(1) || "talk");
  if ("serviceWorker" in navigator && location.protocol === "https:") navigator.serviceWorker.register("sw.js").catch(() => {});
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
})();
