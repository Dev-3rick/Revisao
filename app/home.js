/* Home: level card + "Dúvida rápida" (quick everyday help).
 * Quick help asks the ElevenLabs agent (text mode) for one JSON answer and renders it as a card
 * with audio, pronunciation, alternatives, an example, save-word and in-place pronunciation practice.
 */
(() => {
  "use strict";
  const SL = window.SL;
  const { $, esc, toast, errText, speak } = SL;

  const QMODES = {
    say: {
      name: "Como digo", hint: "Como digo isso em inglês?", ph: "Ex.: quero avisar que vou chegar atrasado na reunião",
      task: "The learner describes, usually in Portuguese, something they want to say in English right now. \"answer\" is the most natural way a native speaker would say it in that situation.",
    },
    pron: {
      name: "Pronúncia", hint: "Como se fala esta palavra ou frase?", ph: "Ex.: comfortable · I would have",
      task: "The learner wants to pronounce an English word or phrase. \"answer\" is that word or phrase written correctly. Focus on ipa, sounds_like and tips (stress, silent letters, linking, sounds Brazilians get wrong).",
    },
    check: {
      name: "Corrigir", hint: "Escreva em inglês para eu conferir", ph: "Ex.: I have 25 years and I work with marketing",
      task: "The learner wrote an English sentence and wants to know if it is correct. Set \"verdict\" to \"correct\", \"almost\" or \"wrong\". \"answer\" is the corrected natural version (the same sentence if already correct). The explanation lists what changed and why.",
    },
    mean: {
      name: "Significado", hint: "O que significa e como usar?", ph: "Ex.: I'm swamped · to figure out",
      task: "The learner wants to understand an English word or expression. \"answer\" is the word or expression itself. The explanation gives the meaning in Portuguese, when people use it and the register.",
    },
  };
  let qMode = SL.store.get("qMode", "say");
  let recent = SL.store.get("quick", []);

  const SCHEMA = `Reply with ONLY one JSON object, no other text, in this shape:
{"answer": string, "verdict": "correct" | "almost" | "wrong" | null, "ipa": string, "sounds_like": string, "tips": string, "alternatives": [{"text": string, "tone": "informal" | "neutro" | "formal"}], "explanation": string, "example": {"en": string, "pt": string}, "save": {"en": string, "pt": string} | null}
Rules: "sounds_like" is an approximation written with Portuguese spelling (e.g. "comfortable" -> "CÂMF-ter-bou"), with the stressed syllable in capitals. "tips", "explanation" and "example.pt" are in Brazilian Portuguese; keep "explanation" under 60 words. Give 0 to 3 alternatives. "verdict" is null unless the learner asked to check a sentence. "save" is the key word or expression worth keeping, or null. Adapt the English to the learner's level and, when it fits, to their work and daily situations.`;

  function renderModes() {
    $("qModes").innerHTML = Object.entries(QMODES).map(([k, m]) => `<button type="button" role="tab" data-qm="${k}" aria-selected="${k === qMode}">${esc(m.name)}</button>`).join("");
    $("qHint").textContent = QMODES[qMode].hint;
    $("qInput").placeholder = QMODES[qMode].ph;
  }
  $("qModes").addEventListener("click", (e) => {
    const b = e.target.closest("[data-qm]"); if (!b) return;
    qMode = b.dataset.qm; SL.store.set("qMode", qMode); renderModes(); $("qInput").focus();
  });

  // ----- ask -----
  let asking = false;
  async function ask() {
    const q = $("qInput").value.trim();
    if (!q || asking) return;
    asking = true; $("qGo").disabled = true; $("qGo").textContent = "Pensando…";
    $("qResult").innerHTML = `<div class="card qcard"><div class="dots"><i></i><i></i><i></i></div><p class="small muted">Montando a melhor resposta para você…</p></div>`;
    try {
      const raw = await SL.askAgentOnce(`${QMODES[qMode].task}\n${SCHEMA}`, q);
      const r = SL.parseJSON(raw);
      const item = { q, mode: qMode, r: r && r.answer ? r : null, text: r && r.answer ? "" : raw, at: Date.now() };
      if (item.r && qMode === "check" && item.r.verdict && item.r.verdict !== "correct") SL.logEvent("fix", { src: "dúvida rápida", o: q, c: item.r.answer, e: item.r.explanation || "" });
      recent = [item, ...recent.filter((x) => x.q !== q)].slice(0, 30);
      SL.store.set("quick", recent);
      renderResult(item); renderRecent();
      SL.markDone("ask");
      if (item.r?.save?.en) { /* offered as a button, not saved automatically */ }
    } catch (e) {
      $("qResult").innerHTML = `<div class="card qcard"><p>${esc(e.code === "no_agent" ? e.message : errText(e))}</p>${e.code === "no_agent" ? '<button class="btn" data-go="settings">Abrir Ajustes</button>' : ""}</div>`;
    } finally { asking = false; $("qGo").disabled = false; $("qGo").textContent = "Responder"; }
  }
  $("qForm").addEventListener("submit", (e) => { e.preventDefault(); ask(); });
  $("qInput").addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); ask(); } });

  // ----- result card -----
  const inl = (t) => esc(t).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*]+)\*/g, "$1<em>$2</em>");
  const VERDICT = { correct: ["ok", "Está correto"], almost: ["almost", "Quase: pequenos ajustes"], wrong: ["no", "Precisa ajustar"] };
  let current = null;
  function renderResult(item) {
    current = item;
    if (!item.r) { $("qResult").innerHTML = `<div class="card qcard"><div class="md">${SL.md(item.text || "")}</div></div>`; return; }
    const r = item.r, v = VERDICT[r.verdict];
    const alts = (r.alternatives || []).filter((a) => a?.text);
    $("qResult").innerHTML = `<div class="card qcard">
      <div class="row between"><span class="label">${esc(QMODES[item.mode]?.name || "")} · ${esc(item.q.length > 60 ? item.q.slice(0, 60) + "…" : item.q)}</span></div>
      ${v ? `<span class="verdict ${v[0]}">${v[1]}</span>` : ""}
      <p class="q-answer">${esc(r.answer)}</p>
      <div class="row">
        <button class="btn" data-q="play">Ouvir</button>
        <button class="btn" data-q="slow">Devagar</button>
        ${SL.S.settings.myVoiceId ? `<button class="btn" data-q="mine">Minha voz</button>` : ""}
        <button class="btn primary" data-q="practice">Praticar</button>
        ${r.save?.en ? `<button class="btn" data-q="save">+ Salvar</button>` : ""}
      </div>
      <div id="qPractice" hidden></div>
      ${r.ipa || r.sounds_like ? `<div class="q-pron">${r.ipa ? `<span class="ipa">${esc(r.ipa)}</span>` : ""}${r.sounds_like ? `<span>soa como <b>${esc(r.sounds_like)}</b></span>` : ""}</div>` : ""}
      ${r.tips ? `<p class="small">${inl(r.tips)}</p>` : ""}
      ${alts.length ? `<div class="q-alts">${alts.map((a, i) => `<div class="q-alt"><span class="tone">${esc(a.tone || "")}</span><span class="grow">${esc(a.text)}</span><button class="mini-play" data-alt="${i}" aria-label="Ouvir alternativa">▶</button></div>`).join("")}</div>` : ""}
      ${r.explanation ? `<p class="q-expl">${inl(r.explanation)}</p>` : ""}
      ${r.example?.en ? `<div class="q-ex"><button class="mini-play" data-q="ex" aria-label="Ouvir exemplo">▶</button><div><p>${esc(r.example.en)}</p><p class="small muted">${esc(r.example.pt || "")}</p></div></div>` : ""}
      <button class="link small" data-q="more">Perguntar mais no Chat</button>
    </div>`;
    $("qResult").scrollIntoView({ behavior: "smooth", block: "start" });
  }
  let rec = null;
  $("qResult").addEventListener("click", async (e) => {
    const r = current?.r; if (!r) return;
    const alt = e.target.closest("[data-alt]");
    if (alt) { speak(r.alternatives[+alt.dataset.alt]?.text); return; }
    const b = e.target.closest("[data-q]"); if (!b) return;
    const act = b.dataset.q;
    if (act === "play") speak(r.answer, 1);
    if (act === "slow") speak(r.answer, 0.8);
    if (act === "mine") SL.speakMine(r.answer, 0.95);
    if (act === "ex") speak(r.example.en);
    if (act === "save") { if (SL.addWord(r.save.en, r.save.pt)) { b.textContent = "Salvo"; b.disabled = true; } else toast("Já está no vocabulário."); }
    if (act === "more") { SL.showTab("chat"); const i = $("chatInput"); i.value = `Sobre "${r.answer}": `; i.focus(); }
    if (act === "practice") practice(b, r.answer);
  });
  async function practice(btn, target) {
    if (rec && rec.state === "recording") { rec.stop(); return; }
    if (!SL.hasKey()) { SL.showTab("settings"); toast("A prática de pronúncia usa sua chave do ElevenLabs."); return; }
    const box = $("qPractice");
    try {
      rec = await SL.startRecording(async (blob) => {
        rec = null; btn.textContent = "Praticar"; btn.classList.remove("rec-on");
        if (blob.size < 2000) { toast("Gravação muito curta."); return; }
        box.hidden = false; box.innerHTML = `<p class="small muted">analisando sua pronúncia…</p>`;
        try {
          const res = SL.alignScore(target, await SL.scribe(blob, "en"));
          SL.logPron(res, "dúvida rápida");
          box.innerHTML = `<div class="row between"><p class="diff grow">${SL.diffHTML(res)}</p><span class="score" style="color:${SL.scoreColor(res.pct)}">${res.pct}%</span></div>
            <p class="small muted">${res.pct >= 85 ? "Ótimo! Soou claro." : "Ouça devagar e repita focando nas palavras em laranja e vermelho."}</p>`;
          if (res.pct >= 85) SL.markDone("pron");
        } catch (err) { box.innerHTML = `<p class="small">${esc(errText(err))}</p>`; }
      });
      btn.textContent = "Parar"; btn.classList.add("rec-on");
      box.hidden = false; box.innerHTML = `<p class="small muted">Gravando… diga a frase e toque em Parar.</p>`;
    } catch (err) { toast(errText(err)); }
  }

  // ----- mic: speak the question (Portuguese or English) -----
  let qRec = null;
  $("qMic").addEventListener("click", async () => {
    if (qRec && qRec.state === "recording") { qRec.stop(); return; }
    if (!SL.hasKey()) { SL.showTab("settings"); toast("O microfone usa sua chave do ElevenLabs."); return; }
    try {
      qRec = await SL.startRecording(async (blob) => {
        qRec = null; $("qMic").classList.remove("on");
        if (blob.size < 2000) { toast("Gravação muito curta."); return; }
        $("qInput").placeholder = "transcrevendo…";
        try { const j = await SL.scribe(blob); if (j.text) { $("qInput").value = j.text.trim(); ask(); } }
        catch (err) { toast(errText(err)); }
        finally { $("qInput").placeholder = QMODES[qMode].ph; }
      });
      $("qMic").classList.add("on");
    } catch (err) { toast(errText(err)); }
  });

  // ----- recent questions -----
  function renderRecent() {
    const list = recent.slice(0, 6);
    $("qRecentCard").hidden = !list.length;
    $("qRecent").innerHTML = list.map((x, i) => `<button class="q-recent" data-r="${i}"><span class="tone">${esc(QMODES[x.mode]?.name || "")}</span><span class="grow">${esc(x.q)}</span><span class="muted small">${esc(x.r?.answer || "")}</span></button>`).join("");
  }
  $("qRecent").addEventListener("click", (e) => { const b = e.target.closest("[data-r]"); if (b) renderResult(recent[+b.dataset.r]); });

  // ----- level card -----
  const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
  const SKILL_NAMES = { grammar: "Gramática e vocabulário", listening: "Compreensão de áudio", speaking: "Fala e pronúncia", writing: "Escrita" };
  function renderLevel() {
    const p = SL.S.profile;
    // After the test, quick help is the daily tool: it goes first. Before it, the invitation to the test leads.
    const home = $("view-home"), quick = home.querySelector(".quick");
    if (p) home.insertBefore(quick, $("levelCard")); else home.insertBefore($("levelCard"), quick);
    if (!p) {
      $("levelCard").innerHTML = `<span class="label">Comece por aqui</span>
        <h2 class="lc-title">Vamos descobrir o seu nível</h2>
        <p class="small muted">Cerca de 12 minutos: seu perfil, gramática, áudio, fala e escrita. Depois o app inteiro se adapta a você: exemplos da sua rotina, foco nos seus pontos fracos e um plano no tempo que você tem.</p>
        <button class="btn primary" id="lcStart">Fazer o teste de nível</button>`;
    } else {
      const days = Math.floor((Date.now() - p.at) / 86400000);
      $("levelCard").innerHTML = `<div class="row between"><span class="label">Seu nível</span><span class="small muted">teste há ${days === 0 ? "menos de 1 dia" : days + (days === 1 ? " dia" : " dias")}</span></div>
        <div class="lc-main"><span class="lc-badge">${esc(p.level)}</span><div class="grow"><p class="lc-name">${esc(p.levelName || "")}</p><p class="small muted">${esc(p.focusText || "")}</p></div></div>
        <div class="skills">${Object.entries(SKILL_NAMES).filter(([k]) => p.skills?.[k]).map(([k, n]) => {
          const idx = LEVELS.indexOf(p.skills[k]);
          return `<div class="skill"><span class="small">${n}</span><div class="bar"><i style="width:${((idx + 1) / LEVELS.length) * 100}%"></i></div><span class="lvl">${esc(p.skills[k])}</span></div>`;
        }).join("")}</div>
        ${days >= 30 ? `<p class="notice small">Já faz um mês. Refaça o teste para medir sua evolução.</p>` : ""}
        <button class="link small" id="lcStart">Refazer o teste</button>`;
    }
  }
  document.addEventListener("click", (e) => { if (e.target.closest("#lcStart")) window.Assess?.start(); });

  SL.onHome = () => { renderLevel(); renderRecent(); };
  renderModes(); renderLevel(); renderRecent();
})();
