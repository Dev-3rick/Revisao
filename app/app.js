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
  const TABS = ["talk", "chat", "pron", "vocab", "plan", "settings"];
  function showTab(name) {
    if (name === "ask") name = "chat";
    if (!TABS.includes(name)) name = "talk";
    document.querySelectorAll("#tabbar button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.tab === name)));
    TABS.forEach((t) => ($("view-" + t).hidden = t !== name));
    if (location.hash !== "#" + name) history.replaceState(null, "", "#" + name);
    if (name !== "chat") endChatSession();
    document.body.classList.toggle("in-chat", name === "chat");
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
  let followBottom = true;
  window.addEventListener("scroll", () => {
    followBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;
  }, { passive: true });
  const scrollFeed = (force) => {
    if (!force && !followBottom) return;
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: force ? "auto" : "smooth" });
  };

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
        useWakeLock: true,
        ...(await sessionAuth(false)),
        dynamicVariables: { mode: "conversation", level: S.level, scenario: scene.brief, first_message: scene.hello, known_words: knownWords(), instructions: "Voice conversation practice." },
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

  // ---------------- CHAT (text-only agent, Claude-style) ----------------
  // Each conversation is kept on the device. The agent session is live only while a conversation is open;
  // reopening an old one starts a new session and hands the agent the earlier messages as context.
  const MODES = {
    tutor: {
      name: "Professor", desc: "Tire qualquer dúvida de inglês",
      starters: ["Quando uso since e quando uso for?", "Diferença entre make e do", "Como pedir aumento em inglês?"],
      prompt: "General English tutor. Answer in Brazilian Portuguese with English examples (with translation). Structure: short explanation, 3 to 5 examples, one common mistake Brazilians make, and finish with a 2-sentence mini exercise (no answers). When the learner answers an exercise, correct it.",
    },
    grammar: {
      name: "Gramática", desc: "Regras explicadas com exemplos",
      starters: ["Me explique o present perfect", "Como funcionam os conditionals?", "Quando usar a, an e the?"],
      prompt: "Grammar teacher. Explain the grammar point step by step in Brazilian Portuguese: when to use it, the structure (affirmative, negative, question), 4 to 6 examples with translation, contrast with similar structures, typical Brazilian mistakes. End with 3 short exercises and correct them when answered.",
    },
    fix: {
      name: "Corrigir texto", desc: "Cole um texto em inglês para revisar",
      starters: ["Corrija: Yesterday I go to the shop and buyed some breads.", "Revise meu e-mail para o chefe", "Corrija meu parágrafo sobre minhas férias"],
      prompt: "Writing corrector. The learner sends English text. Reply in Brazilian Portuguese with: 1) the corrected text in English, 2) a list of each mistake as \"wrong → right: short reason\", 3) a more natural native-like version, 4) a score from 0 to 10 for grammar and for naturalness. Be encouraging. If the learner hasn't sent text yet, ask for it.",
    },
    translate: {
      name: "Tradutor", desc: "Traduções naturais com contexto",
      starters: ["Como digo 'estou de boa' em inglês?", "Traduza: Vou dar uma passada aí mais tarde", "O que significa 'it's not my cup of tea'?"],
      prompt: "Translator and explainer between Portuguese and English. Give 2 or 3 natural options, label each as informal, neutral or formal, explain differences in Brazilian Portuguese, and give one example sentence for each. For English idioms, explain the meaning, the origin when interesting, and the Portuguese equivalent.",
    },
    vocab: {
      name: "Vocabulário", desc: "Aprenda palavras por tema",
      starters: ["10 palavras para reuniões de trabalho", "Phrasal verbs mais usados com get", "Palavras para falar de sentimentos"],
      prompt: "Vocabulary coach. Teach words or expressions by theme: for each item give the English word, pronunciation hint, meaning in Portuguese and one example. Call save_word for every item you teach. Then quiz the learner with 3 quick questions using the new words and correct the answers.",
    },
    exam: {
      name: "Simulado", desc: "Teste seu nível com perguntas",
      starters: ["Faça um teste de nível comigo", "Quiz de 5 perguntas de gramática B1", "Teste meu vocabulário de viagem"],
      prompt: "Examiner. Run a quiz: ask ONE question at a time (multiple choice or short answer), wait for the answer, say if it is right, explain briefly in Brazilian Portuguese, then ask the next. After 5 to 10 questions give a score, the estimated CEFR level and the 3 topics to study next.",
    },
    write: {
      name: "Conversa escrita", desc: "Converse só em inglês por texto",
      starters: ["Hi! Let's talk about movies.", "Can we practise a job interview?", "Tell me something interesting about London."],
      prompt: "Written conversation partner. Write ONLY in English at the learner's level, 1 to 3 sentences, always ending with a question. When the learner makes a clear mistake, call show_correction once per turn, then keep chatting naturally. Do not explain grammar unless asked.",
    },
  };
  S.chats = store.get("chats", []);
  let chatId = store.get("chatId", null);
  let draftMode = store.get("chatMode", "tutor");
  const saveChats = () => { S.chats = S.chats.sort((a, b) => b.at - a.at).slice(0, 60); store.set("chats", S.chats); store.set("chatId", chatId); };
  const current = () => S.chats.find((c) => c.id === chatId) || null;

  function md(src) {
    // Small, safe Markdown subset: headings, bold, italic, inline code, lists, paragraphs.
    const lines = esc(src).split("\n"); let html = "", list = null;
    const inline = (l) => l.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
    for (const raw of lines) {
      const l = raw.trimEnd();
      const ul = /^\s*[-*•]\s+(.*)/.exec(l), ol = /^\s*\d+[.)]\s+(.*)/.exec(l);
      if (ul || ol) {
        const tag = ul ? "ul" : "ol";
        if (list !== tag) { if (list) html += `</${list}>`; html += `<${tag}>`; list = tag; }
        html += "<li>" + inline((ul || ol)[1]) + "</li>"; continue;
      }
      if (list) { html += `</${list}>`; list = null; }
      const h = /^#{1,4}\s*(.+)/.exec(l);
      if (h) html += "<h3>" + inline(h[1]) + "</h3>";
      else if (l.trim()) html += "<p>" + inline(l) + "</p>";
    }
    return html + (list ? `</${list}>` : "");
  }
  const plain = (s) => s.replace(/\*\*|`|^#+\s*/gm, "").replace(/^\s*[-*•]\s+/gm, "").trim();

  // ----- rendering -----
  function msgHTML(m, i) {
    if (m.r === "u") return `<div class="m-user"><div class="bubble me">${esc(m.t)}</div></div>`;
    if (m.r === "fix") return `<div class="fix"><span class="label">Correção</span><span><s>${esc(m.o)}</s> → <b>${esc(m.c)}</b></span><span>${esc(m.e)}</span></div>`;
    if (m.r === "saved") return `<div class="saved">+ ${esc(m.t)} salvo no vocabulário</div>`;
    return `<div class="m-ai"><div class="m-avatar" aria-hidden="true">C</div><div class="m-body"><div class="md">${md(m.t)}</div>
      <div class="m-acts"><button data-act="say" data-i="${i}">Ouvir</button><button data-act="copy" data-i="${i}">Copiar</button></div></div></div>`;
  }
  function renderChat() {
    const c = current();
    const mode = MODES[c?.mode || draftMode] || MODES.tutor;
    $("chatTitle").textContent = c ? c.title : "Nova conversa";
    $("chatModeBtn").textContent = mode.name;
    $("chatModeBtn").disabled = Boolean(c && c.msgs.length);
    $("chatEmpty").hidden = Boolean(c && c.msgs.length);
    $("chatLog").innerHTML = c ? c.msgs.map(msgHTML).join("") : "";
    if (!c || !c.msgs.length) {
      $("modeGrid").innerHTML = Object.entries(MODES).map(([k, m]) => `<button class="mode ${k === (c?.mode || draftMode) ? "on" : ""}" data-mode="${k}"><b>${esc(m.name)}</b><span>${esc(m.desc)}</span></button>`).join("");
      $("starters").innerHTML = mode.starters.map((q) => `<button class="starter" data-q="${esc(q)}">${esc(q)}</button>`).join("");
    }
    renderDrawer();
    if (streaming) $("chatLog").append(streaming.el);
    scrollFeed();
  }
  function renderDrawer() {
    $("chatList").innerHTML = S.chats.length
      ? S.chats.map((c) => `<div class="c-item ${c.id === chatId ? "on" : ""}"><button class="c-open" data-open="${c.id}"><span class="c-title">${esc(c.title)}</span><span class="c-meta">${esc(MODES[c.mode]?.name || "")} · ${new Date(c.at).toLocaleDateString("pt-BR", { day: "numeric", month: "short" })}</span></button><button class="c-del" data-del="${c.id}" aria-label="Apagar conversa">×</button></div>`).join("")
      : `<p class="small muted">Suas conversas aparecem aqui.</p>`;
  }

  // ----- drawer, modes, starters -----
  const openDrawer = (on) => { $("chatDrawer").hidden = !on; $("chatScrim").hidden = !on; if (on) document.activeElement?.blur?.(); };
  // Swipe right from the left edge opens the conversation list; swipe left closes it.
  let swipe = null;
  document.addEventListener("touchstart", (e) => {
    if ($("view-chat").hidden || e.touches.length !== 1) return;
    const t = e.touches[0], drawerOpen = !$("chatDrawer").hidden;
    if (drawerOpen || t.clientX < 28) swipe = { x: t.clientX, y: t.clientY, drawerOpen };
  }, { passive: true });
  document.addEventListener("touchend", (e) => {
    if (!swipe) return;
    const t = e.changedTouches[0], dx = t.clientX - swipe.x, dy = Math.abs(t.clientY - swipe.y);
    if (dy < 60) { if (!swipe.drawerOpen && dx > 60) openDrawer(true); if (swipe.drawerOpen && dx < -60) openDrawer(false); }
    swipe = null;
  }, { passive: true });
  $("chatMenu").addEventListener("click", () => openDrawer(true));
  $("chatScrim").addEventListener("click", () => openDrawer(false));
  $("chatNew").addEventListener("click", () => { newChat(); openDrawer(false); });
  $("drawerNew").addEventListener("click", () => { newChat(); openDrawer(false); });
  $("chatList").addEventListener("click", (e) => {
    const o = e.target.closest("[data-open]");
    if (o) { switchChat(o.dataset.open); openDrawer(false); return; }
    const d = e.target.closest("[data-del]");
    if (d) {
      if (!d.dataset.armed) { d.dataset.armed = "1"; d.textContent = "apagar?"; setTimeout(() => d.isConnected && (delete d.dataset.armed, (d.textContent = "×")), 3000); return; }
      S.chats = S.chats.filter((c) => c.id !== d.dataset.del);
      if (chatId === d.dataset.del) { endChatSession(); chatId = null; }
      saveChats(); renderChat();
    }
  });
  $("chatModeBtn").addEventListener("click", () => { $("chatEmpty").hidden = false; $("modeGrid").scrollIntoView({ behavior: "smooth", block: "center" }); });
  $("modeGrid").addEventListener("click", (e) => {
    const b = e.target.closest("[data-mode]"); if (!b) return;
    draftMode = b.dataset.mode; store.set("chatMode", draftMode);
    const c = current(); if (c && !c.msgs.length) c.mode = draftMode;
    endChatSession(); renderChat(); $("chatInput").focus();
  });
  $("starters").addEventListener("click", (e) => { const b = e.target.closest("[data-q]"); if (b) { $("chatInput").value = b.dataset.q; sendChat(); } });
  $("chatLog").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-act]"); if (!b) return;
    const m = current()?.msgs[+b.dataset.i]; if (!m) return;
    if (b.dataset.act === "say") speak(plain(m.t).slice(0, 1500));
    if (b.dataset.act === "copy") {
      try { await navigator.clipboard.writeText(m.t); toast("Copiado"); } catch { toast("Não consegui copiar"); }
    }
  });

  function newChat() { endChatSession(); chatId = null; saveChats(); renderChat(); }
  function switchChat(id) { if (id === chatId) return; endChatSession(); chatId = id; saveChats(); renderChat(); }

  // ----- agent session -----
  let chat = null, chatApi = null, chatConvId = null, chatStarting = null, busy = false, streaming = null, replyTimer = null;
  const GREETING = "Ready.";
  function closeSession() {
    if (chat) chat.endSession().catch(() => {});
    chat = null; chatApi = null; chatConvId = null;
  }
  function endChatSession() { closeSession(); streaming?.el.remove(); streaming = null; setBusy(false); }
  function setBusy(on) {
    busy = on;
    $("chatSend").disabled = on;
    clearTimeout(replyTimer);
    if (on) replyTimer = setTimeout(() => { if (busy) { finishStream(null); setBusy(false); toast("O professor demorou para responder. Envie de novo."); } }, 60000);
  }
  function pushMsg(conv, m) { conv.msgs.push(m); conv.at = Date.now(); saveChats(); }
  function startStream() {
    if (streaming) return streaming;
    const el = document.createElement("div");
    el.className = "m-ai";
    el.innerHTML = `<div class="m-avatar" aria-hidden="true">C</div><div class="m-body"><div class="md typing"><span class="dots"><i></i><i></i><i></i></span></div></div>`;
    $("chatLog").append(el); scrollFeed();
    streaming = { el, text: "" };
    return streaming;
  }
  function finishStream(finalText) {
    const conv = S.chats.find((c) => c.id === chatConvId) || current();
    const text = (finalText ?? streaming?.text ?? "").trim();
    streaming?.el.remove(); streaming = null;
    if (text && conv) pushMsg(conv, { r: "a", t: text });
    if (conv && conv.id === chatId) renderChat();
  }
  function chatTools(convId) {
    const conv = () => S.chats.find((c) => c.id === convId);
    return {
      save_word: ({ word, translation }) => {
        const ok = addWord(word, translation, true);
        if (ok && conv()) { pushMsg(conv(), { r: "saved", t: word }); if (convId === chatId) renderChat(); }
        return ok ? "saved" : "already saved";
      },
      show_correction: ({ original, corrected, explanation }) => {
        if (conv()) { pushMsg(conv(), { r: "fix", o: original, c: corrected, e: explanation }); if (convId === chatId) renderChat(); }
        return "shown";
      },
    };
  }
  async function ensureChat(conv) {
    if (chat && chatConvId === conv.id) return chatApi;
    if (chatStarting) return chatStarting;
    closeSession();
    const mode = MODES[conv.mode] || MODES.tutor;
    const history = conv.msgs.filter((m) => m.r === "u" || m.r === "a").slice(0, -1);
    let sent = false; // ignore the agent's greeting: only text after our first message is a reply
    chatStarting = (async () => {
      const session = await EL.Conversation.startSession({
        ...(await sessionAuth(true)),
        textOnly: true,
        dynamicVariables: { mode: "chat", level: S.level, scenario: mode.name, instructions: mode.prompt, first_message: GREETING, known_words: knownWords() },
        clientTools: chatTools(conv.id),
        onAgentChatResponsePart: ({ text, type }) => {
          if (!sent || !busy) return;
          const st = startStream();
          if (type === "delta" && text) {
            st.text += text;
            const box = st.el.querySelector(".md");
            box.classList.remove("typing");
            box.innerHTML = md(st.text).replace(/<\/(p|li|h3)>(<\/[uo]l>)?$/, '<span class="caret"></span></$1>$2');
            scrollFeed();
          }
        },
        onMessage: ({ message, source }) => {
          if (source !== "ai" || !message || !sent || !busy) return;
          finishStream(message); setBusy(false); markDone("ask");
        },
        onError: (msg) => toast("Erro: " + msg),
        onDisconnect: () => {
          if (chatConvId === conv.id) { chat = null; chatConvId = null; }
          if (busy) { finishStream(null); setBusy(false); }
        },
      });
      chat = session; chatConvId = conv.id;
      if (history.length) {
        const transcript = history.slice(-20).map((m) => (m.r === "u" ? "Learner: " : "Coach: ") + m.t).join("\n").slice(-6000);
        session.sendContextualUpdate("Earlier messages in this conversation, for context. Continue from here:\n" + transcript);
      }
      await new Promise((r) => setTimeout(r, 400)); // let the greeting arrive and be dropped
      return { send: (t) => { sent = true; session.sendUserMessage(t); } };
    })();
    try { chatApi = await chatStarting; return chatApi; } finally { chatStarting = null; }
  }

  async function sendChat() {
    const text = $("chatInput").value.trim();
    if (!text || busy) return;
    if (!S.settings.agentId) { showTab("settings"); toast("Configure o ID do agente primeiro."); return; }
    if (!EL?.Conversation) { toast("Não consegui carregar o ElevenLabs. Verifique a internet."); return; }
    let conv = current();
    if (!conv) {
      conv = { id: "c" + Date.now().toString(36), title: text.slice(0, 48), mode: draftMode, msgs: [], at: Date.now() };
      S.chats.unshift(conv); chatId = conv.id;
    }
    $("chatInput").value = ""; autosize();
    pushMsg(conv, { r: "u", t: text });
    setBusy(true); followBottom = true; renderChat(); startStream(); scrollFeed(true);
    try {
      (await ensureChat(conv)).send(text);
    } catch (e) {
      streaming?.el.remove(); streaming = null; setBusy(false);
      conv.msgs.pop(); saveChats(); renderChat();
      $("chatInput").value = text; autosize();
      toast(errText(e));
    }
  }
  $("chatForm").addEventListener("submit", (e) => { e.preventDefault(); sendChat(); });
  $("chatInput").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing && window.matchMedia("(hover: hover)").matches) { e.preventDefault(); sendChat(); } });
  function autosize() { const t = $("chatInput"); t.style.height = "auto"; t.style.height = Math.min(t.scrollHeight, 160) + "px"; }
  $("chatInput").addEventListener("input", autosize);

  // ----- mic: speak your message (Scribe detects Portuguese or English) -----
  let chatRec = null;
  $("chatMic").addEventListener("click", async () => {
    if (chatRec && chatRec.state === "recording") { chatRec.stop(); return; }
    if (!hasKey()) { showTab("settings"); toast("O microfone do chat usa sua chave do ElevenLabs."); return; }
    try {
      chatRec = await startRecording(async (blob) => {
        chatRec = null; $("chatMic").classList.remove("on");
        if (blob.size < 2000) { toast("Gravação muito curta."); return; }
        $("chatInput").placeholder = "transcrevendo…";
        try {
          const j = await scribe(blob);
          const t = (j.text || "").trim();
          if (t) { $("chatInput").value = ($("chatInput").value + " " + t).trim(); autosize(); $("chatInput").focus(); }
        } catch (e) { toast(errText(e)); }
        finally { $("chatInput").placeholder = "Escreva ou fale sua mensagem…"; }
      });
      $("chatMic").classList.add("on");
    } catch (e) { toast(errText(e)); }
  });

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

  // Shared recorder + Scribe transcription (used by Pronunciation and Chat).
  const recMime = () => ["audio/mp4", "audio/webm;codecs=opus", "audio/webm"].find((m) => window.MediaRecorder?.isTypeSupported?.(m)) || "";
  async function startRecording(onBlob) {
    if (!window.MediaRecorder) throw new Error("Este aparelho não grava áudio no navegador.");
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mime = recMime();
    const r = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks = [];
    r.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    r.onstop = () => { stream.getTracks().forEach((t) => t.stop()); onBlob(new Blob(chunks, { type: r.mimeType || mime || "audio/mp4" })); };
    r.start();
    return r;
  }
  async function scribe(blob, language) {
    const ext = blob.type.includes("webm") ? "webm" : "m4a";
    const send = async (model) => {
      const fd = new FormData();
      fd.append("file", blob, "speech." + ext);
      fd.append("model_id", model);
      if (language) fd.append("language_code", language);
      fd.append("tag_audio_events", "false");
      return (await el("/v1/speech-to-text", { method: "POST", body: fd })).json();
    };
    try { return await send("scribe_v2"); }
    catch (e) { if (e.status === 400 || e.status === 422) return send("scribe_v1"); throw e; }
  }

  let rec = null;
  $("pronRec").addEventListener("click", async () => {
    if (rec && rec.state === "recording") { rec.stop(); return; }
    if (!hasKey()) { showTab("settings"); toast("A avaliação de pronúncia usa sua chave do ElevenLabs."); return; }
    try {
      rec = await startRecording((blob) => {
        rec = null;
        $("pronRec").classList.remove("on"); $("pronRec").textContent = "Gravar minha voz";
        transcribe(blob);
      });
      $("pronRec").classList.add("on"); $("pronRec").textContent = "Gravando… toque para parar";
    } catch (e) { toast(errText(e)); }
  });

  async function transcribe(blob) {
    if (blob.size < 2000) { toast("Gravação muito curta. Fale a frase inteira."); return; }
    $("pronResult").hidden = false;
    $("pronHeard").textContent = "analisando…"; $("pronScore").textContent = ""; $("pronDiff").textContent = "";
    try { scorePron(await scribe(blob, "en")); }
    catch (e) { $("pronHeard").textContent = errText(e); }
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
  function renderAll() { renderVocab(); renderFlash(); renderPlan(); renderChat(); }
  renderScenes(); renderPronTopics(); nextPron(); fillSettings(); refreshSetupBanner(); renderAll();
  showTab(location.hash.slice(1) || "talk");
  // iOS keyboard: keep the chat composer on top of the keyboard and hide the tab bar while typing.
  const vv = window.visualViewport;
  function onViewport() {
    const kb = vv ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) : 0;
    document.documentElement.style.setProperty("--kb", kb + "px");
    document.body.classList.toggle("kb-open", kb > 120 || (document.activeElement?.matches?.("textarea, input") && matchMedia("(pointer: coarse)").matches));
  }
  vv?.addEventListener("resize", onViewport); vv?.addEventListener("scroll", onViewport);
  document.addEventListener("focusin", () => { onViewport(); if (document.activeElement?.id === "chatInput") setTimeout(() => scrollFeed(true), 300); });
  document.addEventListener("focusout", () => setTimeout(onViewport, 50));

  // Leaving the app ends a voice call (no credits spent in the background) and checks for a new version on return.
  let swReg = null, endedInBackground = false;
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { if (voice) { voice.endSession().catch(() => {}); endedInBackground = true; } }
    else { swReg?.update().catch(() => {}); if (endedInBackground) { endedInBackground = false; toast("A conversa foi encerrada quando você saiu do app."); } }
  });

  // Installed apps have no reload button: offer the new version when one is ready.
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    const hadController = Boolean(navigator.serviceWorker.controller);
    navigator.serviceWorker.register("sw.js").then((r) => (swReg = r)).catch(() => {});
    navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController) $("updateBar").hidden = false; });
  }
  $("updateBtn").addEventListener("click", () => location.reload());
  if (navigator.storage?.persist) navigator.storage.persist().catch(() => {});
})();
