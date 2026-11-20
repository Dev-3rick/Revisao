/* Level test: profile → grammar/vocabulary → listening → speaking → writing → personalised result.
 * Grammar, listening and speaking are scored on the device; only the writing sample goes to the agent.
 */
(() => {
  "use strict";
  const SL = window.SL, BANK = window.ASSESS_BANK;
  const { $, esc, toast, errText } = SL;
  const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
  const LEVEL_NAMES = { A1: "Iniciante", A2: "Básico", B1: "Intermediário", B2: "Intermediário avançado", C1: "Avançado" };

  // [id, label shown, label sent to the agent]
  const OPT = {
    goals: [["work", "Trabalho e reuniões", "work and meetings"], ["interview", "Entrevista de emprego", "job interviews"], ["travel", "Viagens", "travel"], ["media", "Séries, filmes e música", "series, movies and music"], ["people", "Conversar com estrangeiros", "talking with foreigners"], ["exams", "Provas e certificados", "exams and certificates"], ["abroad", "Morar fora", "living abroad"]],
    situations: [["email", "E-mails e mensagens", "emails and messages"], ["calls", "Reuniões e ligações", "meetings and calls"], ["present", "Apresentações", "presentations"], ["clients", "Atender clientes", "customer service"], ["small", "Conversa informal", "small talk"], ["reading", "Leitura técnica", "technical reading"], ["social", "Redes sociais", "social media"]],
    interests: [["tech", "Tecnologia", "technology"], ["business", "Negócios", "business"], ["sports", "Esportes", "sports"], ["games", "Games", "games"], ["music", "Música", "music"], ["travel", "Viagens", "travel"], ["health", "Saúde", "health"], ["food", "Culinária", "cooking"], ["movies", "Cinema e séries", "movies and series"]],
    struggles: [["speaking", "Falar", "speaking"], ["listening", "Entender áudio", "understanding audio"], ["pron", "Pronúncia", "pronunciation"], ["grammar", "Gramática", "grammar"], ["vocab", "Vocabulário", "vocabulary"], ["writing", "Escrita", "writing"], ["shy", "Vergonha de errar", "fear of making mistakes"]],
  };
  const MINUTES = [10, 20, 30, 45, 60];

  let A = null; // test state
  const STEPS = ["Perfil", "Gramática", "Áudio", "Fala", "Escrita", "Resultado"];

  function start() {
    A = { step: -1, prof: { goals: [], situations: [], interests: [], struggles: [], job: "", minutes: 30 }, g: { lvl: 0, i: 0, right: 0, passed: -1, wrong: [] }, li: { lvl: 0, i: 0, right: 0, passed: -1, plays: 0 }, sp: { items: [], i: 0, scores: [] }, wr: null };
    SL.showTab("assess");
    intro();
  }
  function progress(step) {
    $("asStep").textContent = step >= 0 ? `${step + 1}/${STEPS.length} · ${STEPS[step]}` : "";
    $("asBar").style.width = step < 0 ? "0%" : ((step + 1) / STEPS.length) * 100 + "%";
    window.scrollTo(0, 0);
  }
  const body = (html) => { $("asBody").innerHTML = html; };

  // ----- close (two taps, no dialogs) -----
  $("asClose").addEventListener("click", (e) => {
    const b = e.currentTarget;
    if (!A || A.step >= 5 || b.dataset.armed) { delete b.dataset.armed; A = null; SL.showTab("home"); return; }
    b.dataset.armed = "1"; toast("Toque no × de novo para sair do teste.");
    setTimeout(() => delete b.dataset.armed, 3000);
  });

  // ----- 0 intro -----
  function intro() {
    progress(-1);
    body(`<div class="as-card">
      <h2 class="as-title">Teste de nível</h2>
      <p>Cerca de 12 minutos. Responda sem consultar nada: o objetivo é personalizar o app para você, não tirar nota.</p>
      <ol class="as-steps">
        <li><b>Perfil</b>: seus objetivos e sua rotina</li>
        <li><b>Gramática e vocabulário</b>: fica mais difícil a cada bloco e para quando ficar difícil demais</li>
        <li><b>Áudio</b>: ouça frases e marque o que entendeu</li>
        <li><b>Fala</b>: leia frases em voz alta</li>
        <li><b>Escrita</b>: um texto curto</li>
      </ol>
      <p class="small muted">Use um lugar sem barulho e fone de ouvido, se tiver. Se não souber uma resposta, escolha "Não sei": chutar atrapalha o resultado.</p>
      <button class="btn primary big" id="asGo">Começar</button>
    </div>`);
    $("asGo").onclick = profileStep;
  }

  // ----- 1 profile -----
  function chips(key, multi) {
    return `<div class="as-chips" data-key="${key}" data-multi="${multi ? 1 : 0}">${OPT[key].map(([id, pt]) => `<button type="button" class="chip" data-id="${id}" aria-pressed="${A.prof[key].includes(id)}">${esc(pt)}</button>`).join("")}</div>`;
  }
  function profileStep() {
    A.step = 0; progress(0);
    body(`<div class="as-card">
      <h2 class="as-title">Sobre você</h2>
      <div class="as-q"><b>Para que você quer o inglês?</b><span class="small muted">Escolha quantos quiser</span>${chips("goals", true)}</div>
      <div class="as-q"><b>Em que situações do dia a dia você precisa dele?</b>${chips("situations", true)}</div>
      <div class="as-q"><b>Qual é sua profissão ou área?</b><input id="asJob" placeholder="Ex.: desenvolvedor, enfermeira, estudante" value="${esc(A.prof.job)}"></div>
      <div class="as-q"><b>Do que você gosta?</b><span class="small muted">Os exemplos vão usar esses temas</span>${chips("interests", true)}</div>
      <div class="as-q"><b>O que é mais difícil para você hoje?</b>${chips("struggles", true)}</div>
      <div class="as-q"><b>Quanto tempo por dia você consegue estudar?</b><div class="as-chips" id="asMin">${MINUTES.map((m) => `<button type="button" class="chip" data-m="${m}" aria-pressed="${A.prof.minutes === m}">${m === 60 ? "1 h ou mais" : m + " min"}</button>`).join("")}</div></div>
      <button class="btn primary big" id="asNext">Continuar</button>
    </div>`);
    $("asBody").querySelectorAll(".as-chips[data-key]").forEach((g) => g.addEventListener("click", (e) => {
      const b = e.target.closest("[data-id]"); if (!b) return;
      const key = g.dataset.key, list = A.prof[key], id = b.dataset.id;
      const at = list.indexOf(id); at >= 0 ? list.splice(at, 1) : list.push(id);
      b.setAttribute("aria-pressed", String(at < 0));
    }));
    $("asMin").addEventListener("click", (e) => {
      const b = e.target.closest("[data-m]"); if (!b) return;
      A.prof.minutes = +b.dataset.m;
      $("asMin").querySelectorAll(".chip").forEach((c) => c.setAttribute("aria-pressed", String(c === b)));
    });
    $("asNext").onclick = () => {
      A.prof.job = $("asJob").value.trim();
      if (!A.prof.goals.length) { toast("Escolha pelo menos um objetivo."); return; }
      grammarStep();
    };
  }

  // ----- shared multiple-choice block runner (grammar and listening) -----
  // Items are grouped by level; a level is passed with `need` right answers; the block stops at the first level not passed.
  function runBlock(kind, st, perLevel, need, render, done) {
    const items = BANK[kind].filter((x) => x.l === LEVELS[st.lvl]);
    const item = items[st.i];
    render(item, items.length, (choice) => {
      if (choice === item.a) st.right++;
      else if (kind === "grammar") st.wrong.push(item.t);
      st.i++;
      if (st.i < perLevel) return runBlock(kind, st, perLevel, need, render, done);
      const passed = st.right >= need;
      if (passed) st.passed = st.lvl;
      if (passed && st.lvl < LEVELS.length - 1) { st.lvl++; st.i = 0; st.right = 0; st.plays = 0; return runBlock(kind, st, perLevel, need, render, done); }
      done();
    });
  }
  function optionsHTML(item) {
    return `<div class="as-opts">${item.o.map((o, i) => `<button class="as-opt" data-c="${i}">${esc(o)}</button>`).join("")}<button class="as-opt idk" data-c="-1">Não sei</button></div>`;
  }
  function bindOptions(onPick) {
    $("asBody").querySelector(".as-opts").addEventListener("click", (e) => {
      const b = e.target.closest("[data-c]"); if (!b) return;
      b.classList.add("picked");
      setTimeout(() => onPick(+b.dataset.c), 160);
    }, { once: true });
  }

  // ----- 2 grammar & vocabulary -----
  let gCount = 0;
  function grammarStep() {
    A.step = 1; progress(1); gCount = 0;
    runBlock("grammar", A.g, 4, 3, (item, n, pick) => {
      gCount++;
      body(`<div class="as-card">
        <div class="row between"><span class="label">Bloco ${LEVELS[A.g.lvl]} · questão ${A.g.i + 1} de ${n}</span><span class="label">${gCount}/20</span></div>
        <p class="as-question">${esc(item.q)}</p>
        ${optionsHTML(item)}
      </div>`);
      bindOptions(pick);
    }, listeningStep);
  }

  // ----- 3 listening -----
  function listeningStep() {
    A.step = 2; progress(2);
    body(`<div class="as-card"><h2 class="as-title">Compreensão de áudio</h2>
      <p>Você vai ouvir frases em inglês. Pode ouvir cada uma até 2 vezes. O texto não aparece: responda pelo que entendeu.</p>
      ${SL.hasKey() && SL.S.settings.voiceId ? "" : '<p class="small muted">Sem voz do ElevenLabs configurada, o app usa a voz do próprio iPhone.</p>'}
      <button class="btn primary big" id="asGo">Começar o áudio</button></div>`);
    $("asGo").onclick = () => runBlock("listening", A.li, 2, 2, (item, n, pick) => {
      A.li.plays = 0;
      body(`<div class="as-card">
        <div class="row between"><span class="label">Bloco ${LEVELS[A.li.lvl]} · áudio ${A.li.i + 1} de ${n}</span></div>
        <button class="btn big play" id="asPlay">▶ Ouvir</button>
        <p class="as-question">${esc(item.q)}</p>
        ${optionsHTML(item)}
      </div>`);
      $("asPlay").onclick = () => {
        if (A.li.plays >= 2) { toast("Você já ouviu 2 vezes."); return; }
        A.li.plays++; SL.speak(item.say, 0.95);
        if (A.li.plays >= 2) $("asPlay").disabled = true; else $("asPlay").textContent = "▶ Ouvir de novo";
      };
      SL.speak(item.say, 0.95); A.li.plays = 1; $("asPlay").textContent = "▶ Ouvir de novo";
      bindOptions(pick);
    }, speakingStep);
  }

  // ----- 4 speaking -----
  function speakingStep() {
    A.step = 3; progress(3);
    const gl = Math.max(0, A.g.passed);
    if (!SL.hasKey()) {
      body(`<div class="as-card"><h2 class="as-title">Fala</h2><p>A avaliação da fala usa sua chave do ElevenLabs, que ainda não está configurada. Esta parte será pulada e você pode refazer o teste depois.</p><button class="btn primary big" id="asGo">Continuar</button></div>`);
      $("asGo").onclick = writingStep; return;
    }
    A.sp.items = [...BANK.speaking[LEVELS[Math.max(0, gl - 1)]].slice(0, 1), ...BANK.speaking[LEVELS[gl]].slice(0, 2)];
    A.sp.i = 0; A.sp.scores = [];
    speakItem();
  }
  let rec = null;
  function speakItem() {
    const text = A.sp.items[A.sp.i];
    body(`<div class="as-card">
      <span class="label">Leia em voz alta · ${A.sp.i + 1} de ${A.sp.items.length}</span>
      <p class="target">${esc(text)}</p>
      <button class="btn rec big" id="asRec">Gravar</button>
      <div id="asSpRes"></div>
      <button class="link small" id="asSkip">Pular esta frase</button>
    </div>`);
    $("asSkip").onclick = () => nextSpeak(null);
    $("asRec").onclick = async () => {
      if (rec && rec.state === "recording") { rec.stop(); return; }
      try {
        rec = await SL.startRecording(async (blob) => {
          rec = null;
          $("asRec").textContent = "Gravar de novo"; $("asRec").classList.remove("on");
          if (blob.size < 2000) { toast("Gravação muito curta. Leia a frase inteira."); return; }
          $("asSpRes").innerHTML = `<p class="small muted">analisando…</p>`;
          try {
            const r = SL.alignScore(text, await SL.scribe(blob, "en"));
            SL.logPron(r, "teste de nível");
            $("asSpRes").innerHTML = `<div class="row between"><p class="diff grow">${SL.diffHTML(r)}</p><span class="score" style="color:${SL.scoreColor(r.pct)}">${r.pct}%</span></div><button class="btn primary big" id="asOk">Próxima</button>`;
            $("asOk").onclick = () => nextSpeak(r.pct);
          } catch (e) { $("asSpRes").innerHTML = `<p class="small">${esc(errText(e))}</p>`; }
        });
        $("asRec").textContent = "Parar"; $("asRec").classList.add("on");
      } catch (e) { toast(errText(e)); }
    };
  }
  function nextSpeak(pct) {
    if (pct != null) A.sp.scores.push(pct);
    A.sp.i++;
    if (A.sp.i < A.sp.items.length) speakItem(); else writingStep();
  }

  // ----- 5 writing -----
  function writingStep() {
    A.step = 4; progress(4);
    const gl = LEVELS[Math.max(0, A.g.passed)];
    body(`<div class="as-card">
      <h2 class="as-title">Escrita</h2>
      <p>${esc(BANK.writing[gl])}</p>
      <textarea id="asText" rows="6" placeholder="Write here in English…"></textarea>
      <button class="btn primary big" id="asSend">Enviar e ver resultado</button>
      <button class="link small" id="asSkip">Pular a escrita</button>
    </div>`);
    $("asSkip").onclick = () => { A.wr = null; result(); };
    $("asSend").onclick = async () => {
      const text = $("asText").value.trim();
      if (text.split(/\s+/).length < 6) { toast("Escreva pelo menos uma ou duas frases."); return; }
      $("asSend").disabled = true; $("asSend").textContent = "Avaliando seu texto…";
      try {
        const raw = await SL.askAgentOnce(
          `You are assessing a writing sample for a placement test. Task given to the learner: "${BANK.writing[gl]}". Judge grammar, vocabulary range, accuracy and coherence. Reply with ONLY one JSON object: {"level": "A1"|"A2"|"B1"|"B2"|"C1", "strengths": string, "mistakes": [{"wrong": string, "right": string, "why": string}], "tip": string}. "strengths", "why" and "tip" in Brazilian Portuguese, short. List at most 4 mistakes.`,
          text, { timeoutMs: 70000 });
        const j = SL.parseJSON(raw);
        A.wr = j && LEVELS.includes(j.level) ? j : null;
        if (!A.wr) toast("Não consegui ler a avaliação da escrita. Vou calcular sem ela.");
      } catch (e) { toast(errText(e)); A.wr = null; }
      result();
    };
  }

  // ----- 6 result -----
  function result() {
    A.step = 5; progress(5);
    const idx = (l) => LEVELS.indexOf(l);
    const skills = {};
    skills.grammar = LEVELS[Math.max(0, A.g.passed)];
    skills.listening = LEVELS[Math.max(0, A.li.passed)];
    if (A.sp.scores.length) {
      const avg = A.sp.scores.reduce((a, b) => a + b, 0) / A.sp.scores.length;
      const base = idx(skills.grammar);
      skills.speaking = LEVELS[Math.max(0, avg >= 85 ? base : avg >= 65 ? base - 1 : base - 2)];
    }
    if (A.wr) skills.writing = A.wr.level;
    const W = { grammar: 0.35, listening: 0.25, speaking: 0.2, writing: 0.2 };
    let sum = 0, wsum = 0;
    for (const [k, v] of Object.entries(skills)) { sum += idx(v) * W[k]; wsum += W[k]; }
    const level = LEVELS[Math.max(0, Math.min(4, Math.round(sum / wsum - 0.15)))];
    const lowest = Math.min(...Object.values(skills).map(idx));
    const weakSkills = new Set(Object.entries(skills).filter(([, v]) => idx(v) < idx(level) || idx(v) === lowest).map(([k]) => k));
    const stMap = { speaking: "speaking", pron: "speaking", listening: "listening", grammar: "grammar", writing: "writing" };
    A.prof.struggles.forEach((s) => stMap[s] && weakSkills.add(stMap[s]));
    const SK_PT = { grammar: "gramática", listening: "compreensão de áudio", speaking: "fala e pronúncia", writing: "escrita" };
    const weakTopics = [...new Set(A.g.wrong)].slice(0, 6);
    const en = (key) => A.prof[key].map((id) => OPT[key].find((o) => o[0] === id)?.[2]).filter(Boolean);
    const pt = (key) => A.prof[key].map((id) => OPT[key].find((o) => o[0] === id)?.[1]).filter(Boolean);
    const focusText = "Foco agora: " + [...weakSkills].map((k) => SK_PT[k]).join(", ") + ".";
    const profile = {
      at: Date.now(), level, levelName: LEVEL_NAMES[level], skills, weakSkills: [...weakSkills], weakTopics, focusText,
      goalIds: A.prof.goals, goals: en("goals"), situations: en("situations"), interests: en("interests"), struggles: en("struggles"),
      job: A.prof.job, minutes: A.prof.minutes,
      writingNotes: A.wr ? [A.wr.strengths, A.wr.tip].filter(Boolean).join(" ") : "",
    };
    SL.setProfile(profile);
    const history = SL.store.get("levelHistory", []); history.push({ at: profile.at, level, skills }); SL.store.set("levelHistory", history.slice(-24));

    const recScenes = [...document.querySelectorAll("#scenes .chip")].filter((c) => c.textContent.startsWith("★")).map((c) => c.textContent.replace("★ ", ""));
    const routine = [...document.querySelectorAll("#checks .check")].map((c) => `<li>${esc(c.querySelector(".t").firstChild.textContent.trim())}${c.querySelector(".focus-tag") ? " <b>(seu foco)</b>" : ""} · <span class="muted">${esc(c.querySelector(".mins").textContent)}</span></li>`).join("");
    const prev = history.length > 1 ? history[history.length - 2] : null;
    body(`<div class="as-card result">
      <span class="label">Seu resultado</span>
      <div class="lc-main"><span class="lc-badge big">${level}</span><div><p class="lc-name">${LEVEL_NAMES[level]}</p>
        ${prev ? `<p class="small muted">Teste anterior: ${prev.level}</p>` : ""}</div></div>
      <div class="skills">${Object.entries(skills).map(([k, v]) => `<div class="skill"><span class="small">${SK_PT[k][0].toUpperCase() + SK_PT[k].slice(1)}</span><div class="bar"><i style="width:${((idx(v) + 1) / 5) * 100}%"></i></div><span class="lvl">${v}</span></div>`).join("")}</div>
      <p><b>${esc(focusText)}</b></p>
      ${weakTopics.length ? `<div><span class="label">Tópicos de gramática para revisar</span><ul class="small">${weakTopics.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></div>` : ""}
      ${A.wr ? `<div><span class="label">Sua escrita</span><p class="small">${esc(A.wr.strengths || "")}</p>
        ${(A.wr.mistakes || []).length ? `<ul class="small">${A.wr.mistakes.map((m) => `<li><s>${esc(m.wrong)}</s> → <b>${esc(m.right)}</b>: ${esc(m.why)}</li>`).join("")}</ul>` : ""}
        ${A.wr.tip ? `<p class="small"><b>Dica:</b> ${esc(A.wr.tip)}</p>` : ""}</div>` : ""}
      <div><span class="label">Seu plano de ${A.prof.minutes === 60 ? "1 hora" : A.prof.minutes + " minutos"} por dia</span><ul class="small">${routine}</ul></div>
      ${recScenes.length ? `<div><span class="label">Conversas recomendadas para você</span><p class="small">${recScenes.map(esc).join(" · ")}</p></div>` : ""}
      <div><span class="label">O que mudou no app</span><ul class="small">
        <li>O professor agora sabe ${pt("goals").length ? "que você quer inglês para " + esc(pt("goals").join(", ").toLowerCase()) : "seus objetivos"}${A.prof.job ? " e conhece a sua área (" + esc(A.prof.job) + ")" : ""}, e usa isso nos exemplos.</li>
        <li>As conversas, o chat e a dúvida rápida estão no nível ${level}.</li>
        <li>Refaça o teste daqui a 30 dias para ver sua evolução.</li></ul></div>
      <button class="btn primary big" id="asDone">Começar meu plano</button>
    </div>`);
    $("asDone").onclick = () => { A = null; SL.showTab("home"); };
  }

  window.Assess = { start };
})();
