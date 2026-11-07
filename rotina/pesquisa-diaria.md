# Procedimento — Pesquisa Diária

Execute na ordem. Meta: relatório pronto em `relatorios/AAAA-MM-DD.md`.

## Passo 0 — Contexto (2 min)
1. Leia `perfil/perfil.md`, `perfil/viagem-italia.md`, `perfil/compras.md`, `config/alertas.md`.
2. Leia o relatório mais recente em `relatorios/` para saber o que mudou desde ontem.
3. Calcule quantos dias faltam para a viagem (se a data existir).

## Passo 1 — Câmbio
1. Rode `python3 scripts/cotacoes.py` (atualiza `historico/cotacoes.csv`).
2. Pesquise o **motivo** do movimento (Copom/Fed/BCE, fiscal, exterior) — 1 a 2 fontes.
3. Às segundas: inclua a mediana do Boletim Focus para o câmbio no fim do ano.
4. Opcional: cotação efetiva de euro em 1–2 casas/contas globais (VET com IOF).
5. Veredito: aplique as regras de `config/alertas.md` → parcela dobrada / normal / segurar.

## Passo 2 — Passagens para a Itália
1. Pesquise origem do perfil → FCO, MXP, VCE (e open-jaw) para a janela de datas.
2. Registre o menor preço encontrado por rota em `historico/passagens.csv`
   (`data_pesquisa,origem,destino,ida,volta,preco_brl,cia,escalas,fonte`).
3. Procure promoções do dia (dinheiro e milhas) nas fontes de `config/fontes.md`.
4. Compare com preço-alvo e mediana histórica → COMPRAR / ESPERAR / MONITORAR.
5. Considere a regra: janela típica boa para Europa saindo do Brasil é ~3 a 8 meses
   antes; alta temporada europeia (jun–ago) e feriados brasileiros encarecem.

## Passo 3 — Milhas e pontos
1. Bônus de transferência ativos (Livelo, Esfera, bancos → Smiles, LATAM Pass, Azul, TAP…).
2. Promoções de compra de pontos/milhas e preço do milheiro.
3. Promoções de resgate para Europa.
4. Cruze com os saldos do perfil: "vale transferir X pontos de A para B agora?" — faça a conta.
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
1. Escreva o relatório seguindo `rotina/template-relatorio.md`. Máx. ~1 página de resumo.
2. Salve em `relatorios/AAAA-MM-DD.md`.
3. Commit: `relatorio: AAAA-MM-DD` (inclua os CSVs de `historico/`) e push.
4. A mensagem final da sessão deve ser o **Resumo em 5 linhas** do relatório.

## Rotina semanal (segunda-feira — além do diário)
- Tendência da semana do câmbio (alta/baixa e por quê) + Focus.
- Evolução de preço das passagens (mediana da semana vs. anterior).
- Revisão dos marcos e do plano de compra de euros (quanto já foi comprado, preço médio).
