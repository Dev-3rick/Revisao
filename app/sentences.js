// Pronunciation bank. tier: "A" = A1–A2, "B" = B1–B2, "C" = C1.
// Each entry: [english, portuguese, tip in Portuguese with IPA].
window.SENTENCES = {
  daily: {
    name: "Dia a dia",
    A: [
      ["I wake up at seven every day.", "Eu acordo às sete todo dia.", "\"wake up\" liga as palavras: /weɪkʌp/."],
      ["Can you help me, please?", "Você pode me ajudar, por favor?", "\"help\" termina em /p/ fechado, sem \"i\" no final."],
      ["I usually have coffee in the morning.", "Eu geralmente tomo café de manhã.", "\"usually\" soa /ˈjuːʒuəli/, com som de \"j\" francês."],
    ],
    B: [
      ["I've been meaning to call you all week.", "Faz a semana toda que quero te ligar.", "\"I've been\" fica rápido: /aɪvbɪn/."],
      ["I'd rather stay home tonight, if you don't mind.", "Prefiro ficar em casa hoje, se não se importar.", "\"I'd rather\": o \"th\" é /ð/, língua entre os dentes."],
      ["It took me ages to find a parking spot.", "Demorei uma eternidade para achar vaga.", "\"took me\": o /k/ quase some antes do /m/."],
    ],
    C: [
      ["Had I known about the traffic, I would've left earlier.", "Se eu soubesse do trânsito, teria saído antes.", "\"would've\" soa /ˈwʊdəv/, nunca \"would of\" pronunciado inteiro."],
      ["It's not that I don't care, it's just that I'm swamped.", "Não é que eu não ligue, é que estou atolado.", "\"swamped\" termina em /mpt/, sem vogal extra."],
    ],
  },
  work: {
    name: "Trabalho",
    A: [
      ["I work as a software developer.", "Eu trabalho como desenvolvedor de software.", "\"work\" é /wɜːrk/, diferente de \"walk\" /wɔːk/."],
      ["The meeting starts at ten.", "A reunião começa às dez.", "\"starts\" termina em /ts/, sem \"i\" no final."],
      ["Could you send me the file?", "Você pode me mandar o arquivo?", "\"Could you\" liga: /kʊdʒuː/."],
    ],
    B: [
      ["Let's touch base again next Monday.", "Vamos nos falar de novo segunda que vem.", "\"touch base\": /tʌtʃ beɪs/, vogal curta em \"touch\"."],
      ["I'll get back to you by the end of the day.", "Te dou um retorno até o fim do dia.", "\"get back to you\": o /t/ de \"get\" fica quase mudo."],
      ["We're running behind schedule on this project.", "Estamos atrasados no cronograma deste projeto.", "\"schedule\" em inglês americano: /ˈskedʒuːl/."],
    ],
    C: [
      ["We need to align our priorities before we commit to a deadline.", "Precisamos alinhar prioridades antes de fechar um prazo.", "\"align\" é /əˈlaɪn/, o \"g\" é mudo."],
      ["I'd like to push back on that assumption a little.", "Gostaria de questionar um pouco essa suposição.", "\"assumption\" tem o \"p\" quase mudo: /əˈsʌmʃən/."],
    ],
  },
  travel: {
    name: "Viagem",
    A: [
      ["Where is the gate for my flight?", "Onde fica o portão do meu voo?", "\"flight\" termina em /t/ curto: /flaɪt/."],
      ["I have a reservation under Silva.", "Tenho uma reserva no nome de Silva.", "\"reservation\": tônica em /ˌrezərˈveɪʃən/."],
      ["How much is a ticket to the city center?", "Quanto custa uma passagem para o centro?", "\"How much is a\" vira /haʊmʌtʃɪzə/."],
    ],
    B: [
      ["Is breakfast included in the room rate?", "O café da manhã está incluído na diária?", "\"included\": /ɪnˈkluːdɪd/, o \"-ed\" soa /ɪd/ após /d/."],
      ["My luggage didn't arrive, what should I do?", "Minha bagagem não chegou, o que devo fazer?", "\"luggage\" é /ˈlʌɡɪdʒ/."],
      ["Could I get a window seat, please?", "Pode me dar um assento na janela?", "\"seat\" tem vogal longa /iː/, diferente de \"sit\"."],
    ],
    C: [
      ["I was wondering if there's any chance of an early check-in.", "Queria saber se há chance de um check-in antecipado.", "\"wondering\" é /ˈwʌndərɪŋ/, não confunda com \"wandering\"."],
      ["The connecting flight was cancelled, so I had to rebook.", "O voo de conexão foi cancelado e tive que remarcar.", "\"cancelled\" termina em /ld/: /ˈkænsəld/."],
    ],
  },
  food: {
    name: "Restaurante",
    A: [
      ["I'd like a table for two, please.", "Queria uma mesa para dois, por favor.", "\"I'd like\" soa /aɪd laɪk/, ligando as palavras."],
      ["Can I see the menu?", "Posso ver o cardápio?", "\"menu\" é /ˈmenjuː/."],
      ["The check, please.", "A conta, por favor.", "\"check\" com /tʃ/ forte: /tʃek/."],
    ],
    B: [
      ["Could we get the check when you have a moment?", "Pode trazer a conta quando puder?", "\"get the\": /ɡet ðə/, \"th\" com a língua entre os dentes."],
      ["I'm allergic to peanuts. Does this dish have any?", "Sou alérgico a amendoim. Esse prato tem?", "\"allergic\": /əˈlɜːrdʒɪk/, tônica no meio."],
      ["What would you recommend?", "O que você recomenda?", "\"What would you\" vira /wʌtwʊdʒə/."],
    ],
    C: [
      ["I'll have the steak, medium rare, with a side of roasted vegetables.", "Vou querer o bife ao ponto para mal passado, com legumes assados.", "\"vegetables\" tem 3 sílabas: /ˈvedʒtəblz/."],
      ["Would you mind splitting the bill three ways?", "Você se importa de dividir a conta em três?", "\"three ways\": /θriː/, sopro com a língua entre os dentes."],
    ],
  },
  smalltalk: {
    name: "Small talk",
    A: [
      ["Nice to meet you. Where are you from?", "Prazer. De onde você é?", "\"meet you\" liga: /miːtʃuː/."],
      ["The weather is great today.", "O tempo está ótimo hoje.", "\"weather\" é /ˈweðər/, igual a \"whether\"."],
      ["What do you do for fun?", "O que você faz para se divertir?", "\"What do you\" vira /wədəjə/ na fala rápida."],
    ],
    B: [
      ["How was your weekend? Did you get up to anything fun?", "Como foi seu fim de semana? Fez algo legal?", "\"get up to\": /ɡeɾʌptə/, o \"t\" vira um \"r\" leve."],
      ["I can't believe it's already Friday.", "Nem acredito que já é sexta.", "\"can't\" tem /æ/ aberto: /kænt/."],
      ["We should grab a coffee sometime.", "A gente devia tomar um café qualquer dia.", "\"should\": o \"l\" é mudo: /ʃʊd/."],
    ],
    C: [
      ["I've been meaning to ask, how did the move go in the end?", "Eu queria perguntar, como foi a mudança no fim?", "\"meaning to\": /ˈmiːnɪŋtə/, o \"to\" fica fraco."],
      ["Honestly, it's been a bit of a rollercoaster lately.", "Sinceramente, tem sido uma montanha-russa ultimamente.", "\"Honestly\": o \"h\" é mudo: /ˈɒnɪstli/."],
    ],
  },
  sounds: {
    name: "Sons difíceis",
    A: [
      ["I think three is the right number.", "Acho que três é o número certo.", "\"think\" e \"three\": /θ/, sopro com a língua entre os dentes."],
      ["This is my brother and his wife.", "Este é meu irmão e a esposa dele.", "\"this\", \"brother\": /ð/, a mesma posição com voz."],
      ["He has a happy horse.", "Ele tem um cavalo feliz.", "O \"h\" inglês é só um sopro, nunca o \"r\" de \"rato\"."],
    ],
    B: [
      ["She sells seashells by the seashore.", "Ela vende conchas na beira do mar.", "Alterne /ʃ/ (\"she\") e /s/ (\"sells\") sem misturar."],
      ["The red car is really rare around here.", "O carro vermelho é bem raro por aqui.", "O /r/ americano: ponta da língua para trás, sem tocar o céu da boca."],
      ["I live here, but I leave tomorrow.", "Eu moro aqui, mas vou embora amanhã.", "\"live\" /ɪ/ curto e \"leave\" /iː/ longo."],
    ],
    C: [
      ["The thirty-third thoroughbred thundered through the theater.", "O trigésimo terceiro puro-sangue trovejou pelo teatro.", "Sequência de /θ/: mantenha a língua entre os dentes."],
      ["Worcestershire sauce is surprisingly hard to say.", "O molho inglês é surpreendentemente difícil de falar.", "\"Worcestershire\" é /ˈwʊstərʃər/."],
    ],
  },
};
