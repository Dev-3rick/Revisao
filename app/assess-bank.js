// Level-test bank. Each grammar/vocabulary item: level, topic (in Portuguese, shown in the result),
// question, options, index of the right answer.
window.ASSESS_BANK = {
  grammar: [
    // A1
    { l: "A1", t: "verbo to be", q: "She ___ my sister.", o: ["is", "are", "am", "be"], a: 0 },
    { l: "A1", t: "presente simples (3ª pessoa)", q: "He ___ in São Paulo.", o: ["live", "lives", "living", "is live"], a: 1 },
    { l: "A1", t: "vocabulário básico", q: "Qual palavra completa? \"I drink ___ every morning.\"", o: ["coffee", "chair", "window", "shoes"], a: 0 },
    { l: "A1", t: "perguntas com do/does", q: "___ you like pizza?", o: ["Are", "Does", "Do", "Is"], a: 2 },
    // A2
    { l: "A2", t: "passado simples (irregulares)", q: "Yesterday I ___ to the beach.", o: ["go", "goed", "went", "gone"], a: 2 },
    { l: "A2", t: "comparativos", q: "This phone is ___ than my old one.", o: ["more good", "better", "best", "gooder"], a: 1 },
    { l: "A2", t: "preposições de tempo", q: "The meeting is ___ Monday ___ 3 pm.", o: ["in / on", "at / in", "on / at", "on / in"], a: 2 },
    { l: "A2", t: "futuro com going to", q: "Look at those clouds! It ___ rain.", o: ["is going to", "goes to", "will to", "going"], a: 0 },
    // B1
    { l: "B1", t: "present perfect", q: "I ___ here since 2020.", o: ["work", "am working", "have worked", "worked"], a: 2 },
    { l: "B1", t: "first conditional", q: "If it rains tomorrow, we ___ at home.", o: ["stay", "will stay", "would stay", "stayed"], a: 1 },
    { l: "B1", t: "phrasal verbs comuns", q: "Can you ___ the kids at school today? (buscar)", o: ["pick up", "take off", "give up", "look after"], a: 0 },
    { l: "B1", t: "used to", q: "When I was a child, I ___ play football every day.", o: ["use to", "was used", "used to", "am used to"], a: 2 },
    // B2
    { l: "B2", t: "second conditional", q: "If I ___ more time, I would travel more.", o: ["have", "had", "will have", "would have"], a: 1 },
    { l: "B2", t: "voz passiva", q: "The report ___ by the team last week.", o: ["was written", "has wrote", "is writing", "wrote"], a: 0 },
    { l: "B2", t: "collocations", q: "We need to ___ a decision today.", o: ["do", "make", "take on", "get"], a: 1 },
    { l: "B2", t: "discurso indireto", q: "She said she ___ tired.", o: ["is", "was", "has been being", "be"], a: 1 },
    // C1
    { l: "C1", t: "third conditional / modais no passado", q: "If you had told me, I ___ helped you.", o: ["would", "will have", "would have", "had"], a: 2 },
    { l: "C1", t: "inversão", q: "___ had I arrived when the phone rang.", o: ["No sooner", "Hardly", "Never", "Rarely"], a: 1 },
    { l: "C1", t: "expressões idiomáticas", q: "\"Let's not beat around the bush\" significa:", o: ["vamos fazer uma pausa", "vamos direto ao ponto", "vamos trabalhar no jardim", "vamos evitar o problema"], a: 1 },
    { l: "C1", t: "registro formal", q: "Qual frase é mais adequada num e-mail formal?", o: ["Gimme a call asap.", "Shoot me a text.", "I would appreciate it if you could call me at your earliest convenience.", "Call me, ok?"], a: 2 },
  ],
  // Listening: the sentence is played aloud (not shown); the learner picks the meaning.
  listening: [
    { l: "A1", say: "My name is Anna and I am twenty-five years old.", q: "Quantos anos a Anna tem?", o: ["15", "25", "35", "52"], a: 1 },
    { l: "A1", say: "The bathroom is on the left, next to the kitchen.", q: "Onde fica o banheiro?", o: ["À direita, perto da sala", "À esquerda, ao lado da cozinha", "No andar de cima", "Em frente à porta"], a: 1 },
    { l: "A2", say: "I'm sorry, I can't come tonight. I have to work late.", q: "O que a pessoa disse?", o: ["Vai chegar mais cedo", "Não pode ir porque vai trabalhar até tarde", "Vai trabalhar amanhã", "Está doente"], a: 1 },
    { l: "A2", say: "The train to London leaves from platform nine at half past six.", q: "Quando sai o trem?", o: ["6:30", "9:06", "6:00", "9:30"], a: 0 },
    { l: "B1", say: "I've been meaning to tell you, the meeting's been moved to Thursday morning.", q: "O que aconteceu com a reunião?", o: ["Foi cancelada", "Foi remarcada para quinta de manhã", "Vai ser hoje à tarde", "Mudou de sala"], a: 1 },
    { l: "B1", say: "If you don't mind, could you send me the file again? I think I deleted it by mistake.", q: "Por que a pessoa pede o arquivo de novo?", o: ["Não gostou dele", "Apagou sem querer", "Nunca recebeu", "Precisa de outra versão"], a: 1 },
    { l: "B2", say: "To be honest, the new policy hasn't really made much of a difference so far.", q: "O que a pessoa acha da nova política?", o: ["Melhorou muito", "Até agora não fez muita diferença", "Piorou tudo", "Ainda não começou"], a: 1 },
    { l: "B2", say: "We'd better get going, otherwise we'll get stuck in traffic.", q: "O que a pessoa sugere?", o: ["Esperar o trânsito melhorar", "Sair logo para não pegar trânsito", "Ir de metrô", "Ficar mais um pouco"], a: 1 },
    { l: "C1", say: "Had we known the budget would be cut, we'd never have committed to such a tight deadline.", q: "O que a frase quer dizer?", o: ["Eles sabiam do corte e aceitaram o prazo", "Se soubessem do corte, não teriam aceitado o prazo apertado", "O prazo foi estendido por causa do orçamento", "O orçamento aumentou"], a: 1 },
    { l: "C1", say: "It's not that I'm against the idea; I just think we're jumping the gun a bit.", q: "Qual é a opinião da pessoa?", o: ["É contra a ideia", "Acha que estão se precipitando", "Acha a ideia perfeita", "Quer começar imediatamente"], a: 1 },
  ],
  // Speaking: read aloud, scored with Scribe.
  speaking: {
    A1: ["Hello, my name is Paulo and I live in Brazil.", "I like coffee and good music."],
    A2: ["Last weekend I visited my family and we had lunch together.", "Could you tell me where the station is, please?"],
    B1: ["I've been working on this project for three months and I'm really enjoying it.", "If I have time this weekend, I'll probably watch a movie."],
    B2: ["Although the weather wasn't great, we decided to go hiking anyway.", "I'd rather discuss this in person than over the phone."],
    C1: ["Had I known about the delay, I would've rescheduled the meeting.", "It's worth bearing in mind that the situation is constantly evolving."],
  },
  writing: {
    A1: "Escreva 2 ou 3 frases em inglês se apresentando: nome, cidade e o que você gosta de fazer.",
    A2: "Escreva 3 ou 4 frases em inglês contando o que você fez no último fim de semana.",
    B1: "Escreva 4 ou 5 frases em inglês sobre o seu trabalho ou estudos: o que faz, do que gosta e um desafio.",
    B2: "Escreva um parágrafo curto em inglês dando sua opinião: trabalhar de casa é melhor do que no escritório? Por quê?",
    C1: "Escreva um parágrafo em inglês sobre uma decisão difícil que você tomou e o que aprendeu com ela.",
  },
};
