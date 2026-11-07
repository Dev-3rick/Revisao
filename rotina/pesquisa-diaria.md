# Procedimento — Pesquisa Diária

Execute na ordem. Meta: relatório pronto em `relatorios/AAAA-MM-DD.md`.

## Passo 0 — Contexto (2 min)
1. Leia `perfil/perfil.md`, `perfil/viagem-italia.md`, `perfil/compras.md`, `config/alertas.md`.
2. Leia o relatório mais recente em `relatorios/` para saber o que mudou desde ontem.
3. Calcule quantos dias faltam para a viagem (se a data existir).

## Passo 1 — Câmbio (foco: EURO; libra e franco como apoio)
1. Rode `python3 scripts/cotacoes.py` (atualiza `historico/cotacoes.csv`) e
   `python3 scripts/cotacoes.py --alerta` (mensagem curta do euro com a parcela do dia).
2. Pesquise o **motivo** do movimento (Copom/Fed/BCE, fiscal, exterior) — 1 a 2 fontes.
3. Às segundas: inclua a mediana do Boletim Focus para o câmbio no fim do ano.
4. O usuário compra euro na **ARQ** (conversão ~0,5%, sem IOF segundo a empresa). Verifique notícias
   sobre a ARQ/DolarApp, IOF sobre stablecoins e regulação de ativos virtuais no Brasil; se algo mudar, 🔔 alerta.
5. Veredito: aplique as regras de `config/alertas.md` → parcela dobrada / normal / segurar.

## Passo 2 — Passagens para a Itália
1. Busca FLEXÍVEL para julho/2027 (14–20 dias), objetivo = menor custo total até a Itália:
   - Origens: GIG, GRU/VCP, CNF, BSB e qualquer cidade brasileira que apareça em promoção (SSA, REC, FOR, NAT, BEL…)
   - **Destino final: Veneza** (VCE; também TSF/Treviso, e BLQ/BGY/MXP + trem). Portas de entrada: VCE direto
     **e** Lisboa, Porto, Madri, Barcelona, Paris, Londres + low-cost até VCE/TSF
   - Prioridade em milhas: **TAP via Lisboa até Veneza com pontos Azul** (bilhete único)
   - Promoções do dia nos sites de alerta (Melhores Destinos, Passagens Imperdíveis), qualquer origem/destino na Europa
   - Para cada candidata, estime: posicionamento nacional (Rio → origem, ida e volta) + low-cost/trem até a Itália + bagagem
2. Registre as melhores em `historico/rotas.csv` e rode `python3 scripts/rotas.py --dias 7`
   (ranking porta a porta). Mantenha também `historico/passagens.csv` para o trecho internacional.
3. Procure promoções do dia (dinheiro e milhas) nas fontes de `config/fontes.md`.
4. Compare o TOTAL com as faixas de `config/alertas.md` → COMPRAR / ESPERAR / MONITORAR.
   Sempre aponte o risco de bilhetes separados (ver `guias/passagens-italia.md`).
5. Considere a regra: janela típica boa para Europa saindo do Brasil é ~3 a 8 meses
   antes; alta temporada europeia (jun–ago) e feriados brasileiros encarecem.

## Passo 3 — Milhas e pontos
1. Bônus de transferência ativos (Livelo, Esfera, bancos → Smiles, LATAM Pass, Azul, TAP…).
2. Promoções de compra de pontos/milhas e preço do milheiro.
3. Promoções de resgate para Europa.
4. O usuário começa do zero (sem cartão): priorize **compra de pontos/milhas em promoção**,
   clubes, transferência bonificada e milhas grátis (contas globais). Para qualquer resgate
   encontrado, rode `python3 scripts/milhas.py` e mostre a conta. Guia: `guias/milhas-do-zero.md`.
5. Registre promoções relevantes em `historico/promocoes.csv`
   (`data,tipo,programa,descricao,validade,fonte`).

## Passo 4 — Cartões e cashback
1. Ofertas novas de cartões (bônus de boas-vindas, isenção de anuidade, acúmulo maior).
2. Cashback alto em lojas ligadas a `perfil/compras.md`.
3. Só reporte o que for relevante para o perfil (sem lista genérica).

## Passo 5 — Compras planejadas
Para cada item A/B de `perfil/compras.md`: preço atual, menor preço recente, vs. alvo.

## Passo 6 — Planejamento da viagem
1. Atualize o status dos marcos de `perfil/viagem-italia.md` (o que vence nas próximas 4 semanas).
2. Mudanças de regras de entrada (EES/ETIAS, seguro), greves programadas na Itália
   (sciopero de transportes), eventos que encarecem hospedagem.

## Passo 7 — Entrega
**A. Pedido manual no chat:**
1. Relatório completo (`rotina/template-relatorio.md`) em `relatorios/AAAA-MM-DD.md`.
2. `python3 scripts/painel.py` (atualiza `modelos/radar-painel.html`).
3. Commit `relatorio: AAAA-MM-DD` com `historico/`, `relatorios/` e `modelos/`, e push.

**B. Tarefa agendada (vira notificação no celular):**
1. Sem commit, push ou PR: os CSVs atualizados ficam só na sessão. Antes da resposta final,
   restaure o repositório (`git checkout -- . && git clean -fd`).
2. A resposta final é a **newsletter no formato de `modelos/newsletter-whatsapp.md`** — e só ela.

## Alerta do euro (2x por dia útil — tarefa separada)
1. `python3 scripts/cotacoes.py --alerta`
2. Pesquise em 1 frase o motivo do movimento do dia, se for > 0,5%.
3. A mensagem final é o texto do alerta, já pronto para colar no WhatsApp.

## Rotina semanal (segunda-feira — além do diário)
- Tendência da semana do câmbio (alta/baixa e por quê) + Focus.
- Evolução de preço das passagens (mediana da semana vs. anterior).
- Revisão dos marcos e do plano de compra de euros (quanto já foi comprado, preço médio).
