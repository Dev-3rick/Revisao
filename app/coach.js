/* Coach features:
 *  1. "Minha voz": record ~1 minute and create an Instant Voice Clone on the learner's own ElevenLabs account,
 *     then hear correct English in their own voice (and let the coach speak with it).
 *  2. "Responder rápido": answer everyday questions out loud; measures seconds until the first word,
 *     hesitations and words, then shows a better answer.
 *  3. "Meu diagnóstico": combines the learning log with the voice conversations ElevenLabs keeps, asks the agent
 *     for a diagnosis (main mistakes, Portuguese interference, hesitation, the learner's way of speaking) and
 *     feeds a short version back to the coach in every session.
 */
(() => {
  "use strict";
  const SL = window.SL, S = SL.S;
  const { $, esc, toast, errText } = SL;
  const el = (html) => { const d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstElementChild; };
  const fmtS = (x) => (x == null ? "—" : `${String(Math.round(x * 10) / 10).replace(".", ",")} s`);
  const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

  // ============ 1. MINHA VOZ ============
  const READ_TEXT = `Hi! Today I'm recording my voice so I can practise English every day. I want to speak with more confidence at work, in meetings and when I travel. Let me think... Well, I'd say practice makes perfect.
Agora em português: eu estou treinando o meu inglês todos os dias, um pouco de manhã e um pouco à noite. Eu quero conversar sem travar e entender as pessoas falando rápido.
Back to English: thank you for listening. See you soon, and have a great day!`;
  const voiceCard = el(`<div class="card" id="voiceCard">
    <span class="label">Minha voz</span>
    <div id="vcBody"></div>
  </div>`);
  $("view-settings").insertBefore(voiceCard, $("view-settings").children[1] || null);

  let vcRec = null, vcBlob = null, vcTimer = null, vcStart = 0;
  function renderVoice() {
    const has = Boolean(S.settings.myVoiceId);
    $("myVoiceTalkWrap").hidden = !has;
    $("pronMine") && ($("pronMine").hidden = !has);
    if (has) {
      $("vcBody").innerHTML = `<p>Sua voz está criada: <b>${esc(S.settings.myVoiceName || "Minha voz")}</b>.</p>
        <p class="small muted">Use os botões "Minha voz" para ouvir frases certas com a sua voz, e ligue "Professor com a minha voz" na aba Conversa.</p>
        <div class="row"><button class="btn primary" id="vcTest" type="button">Ouvir um teste</button><button class="btn" id="vcDel" type="button">Apagar minha voz</button></div>`;
      $("vcTest").onclick = () => SL.speakMine("Hi! This is my voice speaking English. I'm running a bit late for the meeting, sorry!");
      $("vcDel").onclick = async (e) => {
        const b = e.currentTarget;
        if (!b.dataset.armed) { b.dataset.armed = "1"; b.textContent = "Toque de novo para apagar"; setTimeout(() => { if (b.isConnected) { delete b.dataset.armed; b.textContent = "Apagar minha voz"; } }, 4000); return; }
        try { await SL.el(`/v1/voices/${encodeURIComponent(S.settings.myVoiceId)}`, { method: "DELETE" }); } catch (err) { if (err.status !== 404) { toast(errText(err)); return; } }
        delete S.settings.myVoiceId; delete S.settings.myVoiceName; SL.saveSettings(); renderVoice(); toast("Sua voz foi apagada do ElevenLabs");
      };
      return;
    }
    $("vcBody").innerHTML = `<p>Grave cerca de 1 minuto lendo o texto abaixo. O app cria um clone da <b>sua</b> voz na <b>sua</b> conta do ElevenLabs, e você passa a ouvir o inglês correto falado por você mesmo.</p>
      <div class="read-text">${esc(READ_TEXT).replace(/\n/g, "<br><br>")}</div>
      <p class="small muted">Lugar silencioso, celular a um palmo da boca, fale no seu ritmo normal. Pode ler duas vezes se acabar antes de 45 segundos.</p>
      <label class="consent small"><input type="checkbox" id="vcConsent"> Esta é a minha própria voz e autorizo criar um clone dela na minha conta do ElevenLabs, só para meu uso.</label>
      <div class="row between"><button class="btn rec" id="vcRec" type="button">Gravar</button><span class="rec-timer" id="vcTime">0:00</span></div>
      <div id="vcPreview"></div>`;
    $("vcRec").onclick = toggleVoiceRec;
  }
  async function toggleVoiceRec() {
    if (vcRec && vcRec.state === "recording") { vcRec.stop(); return; }
    if (!$("vcConsent").checked) { toast("Marque a autorização para continuar."); return; }
    if (!SL.hasKey()) { SL.showTab("settings"); toast("Conecte sua chave do ElevenLabs primeiro."); return; }
    try {
      vcRec = await SL.startRecording((blob) => {
        clearInterval(vcTimer); vcRec = null;
        $("vcRec").textContent = "Gravar de novo"; $("vcRec").classList.remove("on");
        const secs = (Date.now() - vcStart) / 1000;
        if (secs < 30) { toast("Grave pelo menos 30 segundos. O ideal é 1 minuto."); return; }
        vcBlob = blob;
        $("vcPreview").innerHTML = `<audio controls playsinline src="${URL.createObjectURL(blob)}" style="width:100%"></audio>
          <button class="btn primary big" id="vcCreate" type="button">Criar minha voz</button>`;
        $("vcCreate").onclick = createVoice;
      });
      vcStart = Date.now();
      $("vcRec").textContent = "Parar"; $("vcRec").classList.add("on");
      vcTimer = setInterval(() => {
        const s = Math.floor((Date.now() - vcStart) / 1000);
        $("vcTime").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
        if (s >= 180) vcRec?.stop();
      }, 250);
    } catch (e) { toast(errText(e)); }
  }
  async function createVoice() {
    const b = $("vcCreate"); b.disabled = true; b.textContent = "Criando sua voz…";
    try {
      const fd = new FormData();
      fd.append("name", "Minha voz · Speak Lab");
      fd.append("files", vcBlob, "minha-voz." + (vcBlob.type.includes("webm") ? "webm" : "m4a"));
      fd.append("remove_background_noise", "true");
      fd.append("description", "Clone da voz do próprio usuário, criado por ele no app Speak Lab para treinar inglês.");
      const r = await (await SL.el("/v1/voices/add", { method: "POST", body: fd })).json();
      if (!r.voice_id) throw new Error("O ElevenLabs não devolveu a voz criada.");
      S.settings.myVoiceId = r.voice_id; S.settings.myVoiceName = "Minha voz · Speak Lab"; SL.saveSettings();
      renderVoice();
      toast(r.requires_verification ? "Voz criada. O ElevenLabs pediu verificação: confira seu e-mail." : "Sua voz está pronta!");
      SL.speakMine("Hi! This is my voice speaking English. Nice to meet you!");
    } catch (e) {
      b.disabled = false; b.textContent = "Criar minha voz";
      toast(e.status === 401 || e.status === 403 ? "A chave não tem permissão para criar vozes (Voices: escrita)." : errText(e));
    }
  }

  // ============ 2. RESPONDER RÁPIDO ============
  const QUESTIONS = {
    A: [["What did you have for breakfast today?", "O que você tomou no café da manhã hoje?"], ["What do you usually do after work?", "O que você costuma fazer depois do trabalho?"], ["How was your weekend?", "Como foi seu fim de semana?"], ["What time do you usually wake up?", "Que horas você costuma acordar?"], ["Do you like your job? Why?", "Você gosta do seu trabalho? Por quê?"], ["What are you doing today?", "O que você vai fazer hoje?"], ["What's your favorite food?", "Qual é sua comida favorita?"], ["Where do you live, and do you like it?", "Onde você mora, e você gosta?"]],
    B: [["Tell me about a typical day at work.", "Me conte sobre um dia típico no trabalho."], ["What's the best trip you've ever taken?", "Qual foi a melhor viagem que você já fez?"], ["What would you do with a free day tomorrow?", "O que você faria com um dia livre amanhã?"], ["What app do you use the most, and why?", "Que aplicativo você mais usa, e por quê?"], ["How do you usually solve a problem at work?", "Como você costuma resolver um problema no trabalho?"], ["What are you learning right now?", "O que você está aprendendo agora?"]],
    C: [["What's a decision you made recently that you're proud of?", "Qual decisão recente você tem orgulho de ter tomado?"], ["How has technology changed the way you work?", "Como a tecnologia mudou o jeito que você trabalha?"], ["If you could change one thing in your city, what would it be?", "Se pudesse mudar uma coisa na sua cidade, o que seria?"], ["What's the most useful advice you've ever received?", "Qual foi o conselho mais útil que você já recebeu?"]],
  };
  const BRIDGES = ["Well…", "Let me think…", "That's a good question…", "Hmm, I'd say…", "To be honest…", "Usually, I…"];
  const drillCard = el(`<div class="card" id="drillCard">
    <span class="label">Responder rápido</span>
    <p class="small">Quem trava no "I… do…" está montando a frase em português e traduzindo palavra por palavra. Aqui você treina <b>começar a falar em até 3 segundos</b>, usando uma frase-ponte para ganhar tempo.</p>
    <div class="starters-list" id="bridges">${BRIDGES.map((b) => `<button type="button" data-b="${esc(b)}">${esc(b)}</button>`).join("")}</div>
    <div id="drillBody"></div>
  </div>`);
  $("view-pron").append(drillCard);
  $("bridges").addEventListener("click", (e) => { const b = e.target.closest("[data-b]"); if (b) SL.speak(b.dataset.b.replace("…", "..."), 0.9); });

  const tier = () => (S.level <= "A2" ? "A" : S.level <= "B2" ? "B" : "C");
  let dq = null, dRec = null, dIdx = -1, dTimer = null;
  function drillIdle() {
    const hist = S.log.filter((x) => x.type === "fluency" && x.src === "treino").slice(-8);
    $("drillBody").innerHTML = `${hist.length ? `<p class="small muted">Seus últimos treinos: ${hist.map((h) => fmtS(h.avgStart)).join(" · ")}</p>` : ""}
      <button class="btn primary big" id="drillGo" type="button">Começar treino</button>`;
    $("drillGo").onclick = nextQuestion;
  }
  async function nextQuestion() {
    const list = QUESTIONS[tier()];
    dIdx = (dIdx + 1) % list.length;
    dq = { en: list[dIdx][0], pt: list[dIdx][1] };
    $("drillBody").innerHTML = `<p class="drill-q">${esc(dq.en)}</p><p class="small muted">${esc(dq.pt)}</p>
      <p class="drill-big" id="drillClock">ouça…</p>
      <button class="btn rec big" id="drillStop" type="button" disabled>Terminei</button>`;
    await SL.speak(dq.en, S.level <= "A2" ? 0.85 : 1, null, true);
    if (!$("drillStop")) return;
    try {
      const t0 = Date.now();
      dRec = await SL.startRecording((blob) => { clearInterval(dTimer); dRec = null; analyse(blob, t0); });
      $("drillStop").disabled = false; $("drillStop").classList.add("on");
      $("drillStop").onclick = () => dRec?.stop();
      dTimer = setInterval(() => {
        const s = (Date.now() - t0) / 1000;
        if ($("drillClock")) $("drillClock").textContent = s < 3 ? "fale agora!" : `${Math.floor(s)} s`;
        if (s > 35) dRec?.stop();
      }, 200);
    } catch (e) { toast(errText(e)); drillIdle(); }
  }
  async function analyse(blob) {
    $("drillBody").querySelector("#drillStop")?.remove();
    $("drillClock").textContent = "analisando…";
    try {
      const j = await SL.scribe(blob, "en");
      const words = (j.words || []).filter((w) => w.type === "word");
      if (!words.length) { $("drillClock").textContent = "não ouvi nada"; drillAgain(); return; }
      const first = words[0].start ?? 0, last = words[words.length - 1].end ?? first;
      const f = SL.countFillers(j.text || "");
      const wpm = last > first ? Math.round((words.length / (last - first)) * 60) : null;
      const color = first <= 3 ? "var(--good)" : first <= 6 ? "var(--warn)" : "var(--bad)";
      SL.logEvent("fluency", { src: "treino", q: dq.en, avgStart: Math.round(first * 10) / 10, fillersPerTurn: f.fillers, wordsPerTurn: words.length, wpm, said: (j.text || "").slice(0, 300) });
      $("drillClock").outerHTML = `<div class="metrics">
          <div class="metric"><span class="n" style="color:${color}">${fmtS(first)}</span><span class="label">para começar</span></div>
          <div class="metric"><span class="n">${f.fillers}</span><span class="label">travadas</span></div>
          <div class="metric"><span class="n">${words.length}</span><span class="label">palavras</span></div>
        </div>
        <p><span class="label">Você disse</span><br>${esc(j.text || "")}</p>
        <p class="small muted">${first <= 3 ? "Ótimo começo! Agora tente frases um pouco mais longas." : "Tente começar com uma frase-ponte, como \"Well…\", e diga uma frase curta. Não precisa ser perfeita."}</p>
        <div id="drillBetter"></div>`;
      drillAgain(j.text || "");
    } catch (e) { $("drillClock").textContent = errText(e); drillAgain(); }
  }
  function drillAgain(said) {
    $("drillBody").insertAdjacentHTML("beforeend", `<div class="row">${said ? '<button class="btn" id="drillImprove" type="button">Como dizer melhor</button>' : ""}<button class="btn primary" id="drillNext" type="button">Próxima pergunta</button></div>`);
    $("drillNext").onclick = nextQuestion;
    if (said) $("drillImprove").onclick = async (e) => {
      e.currentTarget.disabled = true; e.currentTarget.textContent = "Pensando…";
      try {
        const r = SL.parseJSON(await SL.askAgentOnce(
          `The learner answered the question "${dq.en}" out loud (transcript below). Reply with ONLY one JSON object: {"better": a natural answer at CEFR ${S.level} that keeps the learner's idea (max 2 short sentences), "starter": a short sentence starter for this question, "fixes": [{"wrong": string, "right": string, "why": short reason in Brazilian Portuguese}], "tip": one short tip in Brazilian Portuguese to answer faster}. At most 3 fixes. Do not call any tool.`,
          said));
        if (!r?.better) throw new Error("Resposta inesperada. Tente de novo.");
        (r.fixes || []).forEach((x) => SL.logEvent("fix", { src: "treino", o: x.wrong, c: x.right, e: x.why }));
        $("drillBetter").innerHTML = `<div class="q-ex"><div><span class="label">Jeito natural</span><p class="q-answer" style="font-size:1.15rem">${esc(r.better)}</p>
          <div class="row"><button class="btn" data-say="1">Ouvir</button>${S.settings.myVoiceId ? '<button class="btn" data-mine="1">Minha voz</button>' : ""}</div>
          ${r.starter ? `<p class="small">Para começar: <b>${esc(r.starter)}</b></p>` : ""}
          ${(r.fixes || []).length ? `<ul class="small">${r.fixes.map((x) => `<li><s>${esc(x.wrong)}</s> → <b>${esc(x.right)}</b>: ${esc(x.why)}</li>`).join("")}</ul>` : ""}
          ${r.tip ? `<p class="small"><b>Dica:</b> ${esc(r.tip)}</p>` : ""}</div></div>`;
        $("drillBetter").querySelector("[data-say]").onclick = () => SL.speak(r.better);
        $("drillBetter").querySelector("[data-mine]")?.addEventListener("click", () => SL.speakMine(r.better));
        $("drillImprove").remove();
      } catch (err) { toast(errText(err)); $("drillImprove").disabled = false; $("drillImprove").textContent = "Como dizer melhor"; }
    };
  }

  // ============ 3. MEU DIAGNÓSTICO ============
  const diagCard = el(`<div class="card" id="diagCard"><span class="label">Meu diagnóstico</span><div id="diagBody"></div></div>`);
  $("view-home").insertBefore(diagCard, $("levelCard").nextSibling);

  function stats() {
    const flu = S.log.filter((x) => x.type === "fluency").slice(-12);
    const fixes = S.log.filter((x) => x.type === "fix");
    const bad = {};
    S.log.filter((x) => x.type === "pron").forEach((x) => (x.bad || []).forEach((w) => (bad[w] = (bad[w] || 0) + 1)));
    return {
      start: avg(flu.map((x) => x.avgStart).filter((x) => x != null)),
      fillers: avg(flu.map((x) => x.fillersPerTurn).filter((x) => x != null)),
      fixes: fixes.length,
      badWords: Object.entries(bad).sort((a, b) => b[1] - a[1]).slice(0, 15),
    };
  }
  function renderDiag() {
    const st = stats(), d = SL.store.get("diagnosis", null);
    const days = d ? Math.floor((Date.now() - d.at) / 86400000) : null;
    $("diagBody").innerHTML = `
      <div class="metrics">
        <div class="metric"><span class="n">${fmtS(st.start)}</span><span class="label">para começar a falar</span></div>
        <div class="metric"><span class="n">${st.fillers == null ? "—" : String(Math.round(st.fillers * 10) / 10).replace(".", ",")}</span><span class="label">travadas por fala</span></div>
        <div class="metric"><span class="n">${st.fixes}</span><span class="label">erros registrados</span></div>
      </div>
      ${d ? diagHTML(d, days) : `<p class="small muted">O app guarda suas correções, as palavras que saíram pouco claras, o tempo que você leva para começar a responder e as suas conversas por voz. Toque abaixo para o professor analisar tudo e dizer onde você mais erra.</p>`}
      <button class="btn ${d ? "" : "primary"}" id="diagGo" type="button">${d ? "Analisar de novo" : "Analisar meu inglês"}</button>`;
    $("diagGo").onclick = runDiagnosis;
  }
  function diagHTML(d, days) {
    return `<p class="small muted">Análise de ${days === 0 ? "hoje" : days === 1 ? "ontem" : `${days} dias atrás`}${d.level_estimate ? ` · nível estimado ${esc(d.level_estimate)}` : ""}</p>
      ${d.summary ? `<p>${esc(d.summary)}</p>` : ""}
      ${(d.top_issues || []).length ? `<div><span class="label">Onde você mais erra</span>${d.top_issues.map((x) => `<div class="issue"><b>${esc(x.issue)}</b>
          ${(x.examples || []).slice(0, 2).map((e) => `<span class="ex"><s>${esc(e.wrong)}</s> → <b>${esc(e.right)}</b></span>`).join("")}
          ${x.why ? `<span class="small muted">${esc(x.why)}</span>` : ""}${x.exercise ? `<span class="small"><b>Treino:</b> ${esc(x.exercise)}</span>` : ""}</div>`).join("")}</div>` : ""}
      ${d.fluency?.note ? `<div><span class="label">Sobre travar para responder</span><p class="small">${esc(d.fluency.note)}</p>${(d.fluency.tips || []).length ? `<ul class="small">${d.fluency.tips.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>` : ""}</div>` : ""}
      ${(d.my_style || []).length ? `<div><span class="label">Seu jeito de falar, em inglês</span>${d.style_summary ? `<p class="small muted">${esc(d.style_summary)}</p>` : ""}
          <div id="styleRows">${d.my_style.map((x, i) => `<div class="style-row"><span class="pt">${esc(x.pt)}</span><span>→</span><b>${esc(x.en)}</b><span class="row"><button class="mini-play" data-st="${i}" aria-label="Ouvir">▶</button>${S.settings.myVoiceId ? `<button class="mini-play" data-stm="${i}" aria-label="Ouvir na minha voz">Eu</button>` : ""}<button class="mini-play" data-sts="${i}" aria-label="Salvar">+</button></span></div>`).join("")}</div></div>` : ""}
      ${(d.next_steps || []).length ? `<div><span class="label">Próximos passos</span><ul class="small">${d.next_steps.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>` : ""}`;
  }
  $("diagBody").addEventListener("click", (e) => {
    const d = SL.store.get("diagnosis", null); if (!d) return;
    const a = e.target.closest("[data-st]"), m = e.target.closest("[data-stm]"), s = e.target.closest("[data-sts]");
    if (a) SL.speak(d.my_style[+a.dataset.st].en);
    if (m) SL.speakMine(d.my_style[+m.dataset.stm].en);
    if (s) { const x = d.my_style[+s.dataset.sts]; if (SL.addWord(x.en, x.pt)) s.textContent = "✓"; }
  });

  // Recent voice conversations stored by ElevenLabs: the learner's own words and how long they took to start.
  async function voiceTranscripts(maxConvs = 5) {
    if (!SL.hasKey() || !S.settings.agentId) return [];
    const list = await (await SL.el(`/v1/convai/conversations?agent_id=${encodeURIComponent(S.settings.agentId)}&page_size=30`)).json();
    const voiceOnes = (list.conversations || []).filter((c) => (c.call_duration_secs || 0) >= 20).slice(0, maxConvs);
    const out = [];
    for (const c of voiceOnes) {
      try {
        const d = await (await SL.el(`/v1/convai/conversations/${encodeURIComponent(c.conversation_id)}`)).json();
        if ((d.conversation_initiation_client_data?.dynamic_variables || {}).mode !== "conversation") continue;
        let prev = null;
        const lines = [];
        for (const t of d.transcript || []) {
          const msg = (t.message || "").trim();
          if (t.role === "user" && msg) lines.push(`Learner${prev != null ? ` (after ${Math.round(t.time_in_call_secs - prev)}s)` : ""}: ${msg}`);
          else if (t.role === "agent" && msg) lines.push(`Coach: ${msg.slice(0, 160)}`);
          prev = t.time_in_call_secs;
        }
        out.push({ when: new Date((c.start_time_unix_secs || 0) * 1000).toISOString().slice(0, 10), lines });
      } catch {}
    }
    return out;
  }
  async function runDiagnosis() {
    const b = $("diagGo"); b.disabled = true; b.textContent = "Lendo suas conversas…";
    try {
      const st = stats();
      let convs = [];
      try { convs = await voiceTranscripts(); } catch (e) { console.warn(e); }
      b.textContent = "Analisando…";
      const fixes = S.log.filter((x) => x.type === "fix").slice(-60).map((x) => `- [${x.src}] "${x.o}" -> "${x.c}"`).join("\n");
      const flu = S.log.filter((x) => x.type === "fluency").slice(-10).map((x) => `- [${x.src}] start ${x.avgStart ?? "?"}s, hesitations/turn ${x.fillersPerTurn ?? "?"}, words/turn ${x.wordsPerTurn ?? "?"}${x.said ? `, said: "${x.said.slice(0, 120)}"` : ""}`).join("\n");
      const ptPhrases = [
        ...SL.store.get("quick", []).filter((x) => x.mode === "say").map((x) => x.q),
        ...(S.chats || []).flatMap((c) => c.msgs.filter((m) => m.r === "u").map((m) => m.t)),
      ].slice(0, 30).map((t) => `- ${t.slice(0, 160)}`).join("\n");
      const convText = convs.map((c) => `## Voice conversation ${c.when}\n${c.lines.join("\n")}`).join("\n\n");
      let data = `LEVEL IN APP: ${S.level}
AVERAGE SECONDS BEFORE STARTING TO SPEAK: ${st.start ?? "unknown"}; HESITATIONS PER TURN: ${st.fillers ?? "unknown"}
CORRECTIONS RECORDED:\n${fixes || "none"}
WORDS PRONOUNCED UNCLEARLY (word: times): ${st.badWords.map(([w, n]) => `${w}:${n}`).join(", ") || "none"}
HESITATION MEASUREMENTS:\n${flu || "none"}
HOW THE LEARNER WRITES OR SPEAKS IN PORTUGUESE (requests in the app):\n${ptPhrases || "none"}
${convText}`;
      if (data.length > 9000) data = data.slice(0, 9000);
      const raw = await SL.askAgentOnce(
        `You are analysing a Brazilian learner's English practice data to build a diagnosis. Look for repeated patterns, Portuguese interference (literal translation, word order, Portuguese words), hesitation (long pauses, repeated words, fillers) and how the learner naturally speaks in Portuguese (expressions, slang, tone). Reply with ONLY one JSON object:
{"summary": short overview in Brazilian Portuguese, "level_estimate": "A1"|"A2"|"B1"|"B2"|"C1", "top_issues": [{"issue": name in Brazilian Portuguese, "issue_en": short English label, "examples": [{"wrong": string, "right": string}], "why": cause in Brazilian Portuguese, "exercise": one concrete exercise in Brazilian Portuguese}], "fluency": {"note": what the hesitation data shows, in Brazilian Portuguese, "tips": [3 short tips in Brazilian Portuguese]}, "my_style": [{"pt": an expression the learner actually uses in Portuguese, "en": its natural English equivalent with the same tone}], "style_summary": one sentence in Brazilian Portuguese about how the learner talks, "style_en": one sentence in English describing the learner's way of speaking for the coach, "focus_for_coach": 2 short English instructions for the coach, "next_steps": [3 short steps in Brazilian Portuguese]}
Give 3 to 5 top_issues and up to 8 my_style items.
Strict rules: every "examples[].wrong" must be copied word for word from the data. "my_style[].pt" may ONLY contain expressions that appear literally in the learner's own Portuguese lines in the data (quote them exactly); never invent or add typical slang the learner did not use; if there are none, return an empty list. Base everything on the data; if data is thin, say so in the summary. Do not call any tool.`,
        data, { timeoutMs: 120000 });
      const d = SL.parseJSON(raw);
      if (!d || !d.summary) throw new Error("Não consegui ler a análise. Tente de novo.");
      // Keep only what really appears in the learner's data: the model must not invent expressions or mistakes.
      const norm = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
      const corpus = norm(data);
      const inData = (t) => { const n = norm(t); return n.length >= 3 && corpus.includes(n); };
      d.my_style = (d.my_style || []).filter((x) => x?.pt && x?.en && inData(x.pt));
      d.top_issues = (d.top_issues || []).map((x) => ({ ...x, examples: (x.examples || []).filter((e) => e?.wrong && inData(e.wrong)) }));
      d.at = Date.now();
      SL.store.set("diagnosis", d);
      renderDiag();
      toast("Diagnóstico pronto. O professor já vai usar isso.");
    } catch (e) { toast(errText(e)); b.disabled = false; b.textContent = "Analisar meu inglês"; }
  }

  // ----- small hooks into existing screens -----
  // "Minha voz" in the pronunciation card
  $("pronSlow").insertAdjacentHTML("afterend", `<button class="btn" id="pronMine" type="button" hidden>Minha voz</button>`);
  $("pronMine").addEventListener("click", () => SL.speakMine($("pronText").textContent, 0.95));

  const prevHome = SL.onHome;
  SL.onHome = () => { prevHome?.(); renderDiag(); };
  renderVoice(); drillIdle(); renderDiag();
})();
