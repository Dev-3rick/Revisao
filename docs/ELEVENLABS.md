# Configurar o ElevenLabs para o Speak Lab

Tempo: cerca de 15 minutos, uma vez só. No fim você terá dois valores para colar em **Ajustes** no app: o **ID do agente** e a **chave de API**.

## Como o app usa o ElevenLabs

| Recurso do app | Produto ElevenLabs | Por quê |
|---|---|---|
| Conversa por voz | **Agents** (voz, WebRTC) | Ouve, pensa e responde em tempo real, e você pode interromper como numa conversa de verdade. |
| Correções e salvar palavras | **Client tools** do agente | O professor chama funções do app: mostra a correção na tela e salva palavras no seu vocabulário. |
| Chat (estilo Claude) | **Agents** em modo texto | O mesmo agente por escrito, com 7 modos de estudo. As respostas aparecem enquanto são escritas e as conversas ficam salvas. |
| Ouvir frases e palavras | **Text to Speech** (Flash v2.5) | Voz natural. Cada frase fica guardada no aparelho, então repetir não gasta crédito. |
| Avaliar pronúncia | **Speech to Text** (Scribe) | Transcreve sua fala com a confiança de cada palavra, para marcar o que saiu pouco claro. |

---

## Passo 1 · Criar o agente

1. Entre em **elevenlabs.io → Agents → Create agent → Blank template**.
2. Nome: `Speak Lab Coach`.

### First message
Cole exatamente:
```
{{first_message}}
```

### System prompt
Cole o texto abaixo inteiro:

```
You are "Coach", a warm, patient and upbeat English teacher for a Brazilian Portuguese speaker.
Learner level (CEFR): {{level}}
Current mode: {{mode}}
Scenario: {{scenario}}
Words the learner already saved: {{known_words}}

# If mode is "conversation" (voice)
- Speak natural spoken English adapted to {{level}}. A1/A2: short, simple sentences and common words, speak a bit slower. B1/B2: natural everyday English with some idioms. C1: fully natural, fast, idiomatic.
- Stay inside the scenario and keep the learner talking: 1 to 3 sentences per turn, always end with a question or a prompt. The learner should talk more than you.
- Corrections: when the learner makes a clear mistake (grammar, wrong word, unnatural phrasing), call the tool show_correction with the exact part they said, a natural corrected version and a short explanation in Brazilian Portuguese. Then continue the conversation normally. Do not correct every tiny slip: at most one correction per turn, prioritise mistakes that change meaning or repeat often. Do not read the explanation aloud; just say the corrected sentence once, naturally, e.g. "Oh, you went to the beach! Nice."
- Vocabulary: when you use a useful word or expression the learner probably doesn't know, or when the learner asks to save something ("save that", "salva essa"), call save_word with the English word or expression and its Portuguese translation. Then mention it briefly. Reuse words from the saved list when natural, to review them.
- If the learner speaks Portuguese or gets stuck, help with a short hint in English, offer the English sentence they could use, and ask them to try saying it.
- Every 8 to 10 turns, give one short spoken tip about what they are doing well and one thing to improve.
- Never use emojis, markdown, lists or symbols: everything you write is read aloud.

# If mode is "chat" (text chat in the app)
- Follow these mode instructions exactly: {{instructions}}
- Unless those instructions say otherwise, explain in Brazilian Portuguese and keep English examples in English.
- Formatting is shown as text, so use short paragraphs, lists with "-" and **bold** for key words. No tables, no emojis.
- Keep answers focused: usually under 250 words. Offer to go deeper instead of writing everything at once.
- If earlier messages are sent to you as context, continue from them naturally.
- When a word or expression is worth keeping, call save_word.

# Always
- Be encouraging. Mistakes are normal and useful.
- Stay on the topic of learning English. If asked something unrelated, answer very briefly and bring it back to practice.
```

### Dynamic variables (valores de teste)
O painel pede valores de teste para as variáveis do prompt. Use:

| Variável | Valor de teste |
|---|---|
| `level` | `A2` |
| `mode` | `conversation` |
| `scenario` | `a friendly casual chat` |
| `first_message` | `Hi! How's your day going so far?` |
| `known_words` | `none yet` |
| `instructions` | `General English tutor. Answer in Brazilian Portuguese.` |

O app envia os valores reais a cada conversa: nível, cenário, modo e as palavras que você já salvou.

### Voz, idioma e modelo
- **Language**: English.
- **Voice**: escolha uma voz nativa em inglês de que você goste (ex.: americana, conversacional). Ouça algumas antes de escolher.
- **TTS model**: Flash v2.5 (menor atraso na conversa).
- **LLM**: um modelo Claude, ou um modelo "Flash" se quiser respostas mais rápidas. Os modelos maiores corrigem melhor; os rápidos soam mais naturais em conversa. Teste os dois.

## Passo 2 · Ferramentas do app (client tools)

Em **Tools → Add tool → Client**, crie as duas. Os nomes precisam ser exatamente estes.

**`save_word`**
- Description: `Save a word or expression to the learner's vocabulary list in the app.`
- Parameters:
  - `word` · string · required · `The English word or expression.`
  - `translation` · string · required · `The Brazilian Portuguese translation.`

**`show_correction`**
- Description: `Show a correction card on the learner's screen.`
- Parameters:
  - `original` · string · required · `Exactly what the learner said.`
  - `corrected` · string · required · `The natural, corrected version.`
  - `explanation` · string · required · `A short explanation in Brazilian Portuguese.`

Deixe **Wait for response** desligado nas duas, para a conversa não travar.

## Passo 3 · Segurança e limites

Em **Security** (ou **Advanced**) do agente:

1. **Enable authentication**: ligado. Assim só quem tem a sua chave consegue usar o agente. O app pede um token temporário com a sua chave a cada conversa.
2. **Overrides**: ative **Text only** (necessário para a aba Chat).
3. **Max conversation duration**: 900 segundos (15 min). Evita gastar crédito se você esquecer o app aberto.

Copie o **Agent ID** (algo como `agent_...`), que fica no topo da página do agente.

## Passo 4 · Chave de API restrita

Em **Settings → API Keys → Create API key**:

1. Nome: `Speak Lab iPhone`.
2. Ative **Restrict key** e libere só:
   - Text to Speech
   - Speech to Text
   - Voices: Read
   - ElevenLabs Agents (Conversational AI): leitura/uso
3. Defina um **limite de créditos** (credit quota) mensal que caiba no seu plano.

A chave fica guardada só no seu iPhone, dentro do app. Ela nunca vai para o GitHub. Se perder o aparelho, apague a chave no painel e crie outra.

## Passo 5 · Colar no app

1. Abra o app → **Ajustes**.
2. Cole o **ID do agente** e a **chave de API**.
3. Toque em **Carregar minhas vozes**, escolha a voz para a pronúncia e toque em **Salvar**.
4. Vá em **Conversa**, toque no círculo vermelho e diga "Hello!".

## Custo: como gastar bem os créditos

- **Conversa** é o que mais consome (cobrada por minuto). É também o que mais faz você evoluir: priorize.
- **Pronúncia**: cada frase é gerada uma vez e depois sai do cache do aparelho, sem custo. A transcrição é cobrada por duração de áudio, e as gravações são curtas.
- **Chat** em texto custa bem menos que voz. O microfone do chat usa a transcrição (Scribe), cobrada pela duração do áudio.
- Acompanhe em **elevenlabs.io → Usage**. Se o crédito apertar: 10 min de conversa por dia, e o resto em Pronúncia e Palavras.

## Se algo não funcionar

| Sintoma | Causa provável | O que fazer |
|---|---|---|
| "Chave de API recusada" | Chave errada ou sem permissão | Confira o Passo 4 e as permissões. |
| A conversa não conecta | Agent ID errado, ou a chave sem a permissão de Agents | Confira o ID e a permissão "ElevenLabs Agents". |
| O chat não responde | Override "Text only" desligado | Passo 3, item 2. |
| O chat ignora o modo escolhido | Prompt antigo, sem o bloco `mode is "chat"` | Cole o system prompt atualizado do Passo 1. |
| Correções não aparecem na tela | Nome da tool diferente | Os nomes devem ser `save_word` e `show_correction`, exatamente assim. |
| Microfone não abre | Permissão negada no iPhone | Ajustes do iPhone → Safari → Microfone → Permitir. |
| Sem som | iPhone no silencioso ou volume baixo | Tire do modo silencioso e aumente o volume. |
