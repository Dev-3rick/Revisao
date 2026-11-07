# Guia — Compra de dólar e euro

## Princípio
Ninguém acerta o fundo do câmbio. Estratégia: **compra programada (preço médio)** +
**parcela extra quando o preço está baixo** na faixa recente.

## Processo
1. Defina o total em euros (`perfil/viagem-italia.md`).
2. Divida em parcelas até ~30 dias antes da viagem (ex.: 6 meses → 12 parcelas quinzenais).
3. A cada parcela, use o sinal do `scripts/cotacoes.py`:
   - posição na faixa 90d ≤ 25% → compre 2 parcelas
   - 25–60% → 1 parcela
   - ≥ 60% → meia parcela (ou pule, sem passar de 2 seguidas)
4. Registre o preço médio no relatório.

## Conta do usuário: ARQ (antiga DolarApp)
- **Onde comprar os € 2.000:** converter BRL → EURc na ARQ, parcela por parcela, seguindo o alerta
- Custo informado de 0,5% de conversão e sem IOF, segundo a própria ARQ e blogs como Pontos pra Voar.
  Mesmo que o IOF de 3,5% passe a ser cobrado algum dia, o custo continua menor que o do cartão de banco + spread.
- **Riscos a acompanhar (a rotina verifica):**
  - O saldo é em ativo virtual (stablecoin), não é depósito bancário e **não tem cobertura do FGC**
  - A regra tributária e a regulação de ativos virtuais no Brasil podem mudar (IOF, regras do Banco Central)
  - Libra e franco: o cartão paga convertendo do saldo; conferir no app qual taxa é cobrada
- **Na viagem:** levar um 2º meio de pagamento (outra conta global ou um pouco de espécie)
  para o caso de bloqueio ou perda do cartão

## Comparativo de contas para euro (pesquisa de 07/11/2026)
| Conta | Custo para converter | IOF | Observação |
|---|---|---|---|
| **ARQ** (atual) | ~0,5% (spread de ~0,6% no print do app) | 0%, segundo a empresa (stablecoin) | Reclame Aqui 6,7/10 ("regular"); queixas de bloqueio de saldo e suporte lento; sem FGC |
| **Revolut** | spread zero até ~R$ 1.000/mês no plano grátis | 0%, segundo o ranking do Melhores Destinos | menor custo total no ranking de 2026 dentro do limite; a parcela quinzenal (~R$ 400–800) cabe |
| **Wise** | ~0,4–1,2% | 3,5% (1,1% com Rende+, segundo comparativos) | previsível, mais de 40 moedas (libra e franco inclusos) |
| **C6 Global** | 0,75–0,90% | 3,5% | 2º lugar no ranking para € 1.000 |
| **Nomad** | 1–2% | 3,5% | única com seguro FDIC (até US$ 250 mil), mais cara no euro |
| **Inter Global** | ~1–2% | 3,5% | compensa mais para quem já é cliente |

**IOF sobre stablecoin:** desde 02/02/2026 o Banco Central trata stablecoin como câmbio. Em fev/2026 a
Receita fez uma minuta de IOF de 3,5% (com isenção até R$ 10 mil/mês para pessoa física), mas em
jul/2026 esclareceu que a operação não gera IOF-câmbio automaticamente. Situação ainda instável → a rotina vigia.

**Estratégia:** ARQ como principal (mais barata hoje) + **uma 2ª conta de reserva** (Revolut ou Wise)
para não depender de um único app. Não deixar na ARQ mais do que a próxima fase da viagem precisa,
e enviar documentos/comprovante de renda cedo para evitar bloqueio preventivo.

## Onde comprar (compare sempre o VET)
| Meio | Prós | Contras |
|---|---|---|
| Conta global (Wise, Nomad, Inter, C6…) | spread baixo, cartão de débito no exterior | verificar IOF e tarifa de saque |
| Espécie em casa de câmbio | aceito em qualquer lugar | spread alto, risco de carregar |
| Cartão de crédito no exterior | prático, acumula pontos | câmbio do dia da fatura + IOF + spread |

**IOF:** em 2025 o governo unificou em **3,5%** o IOF de cartão no exterior, compra de
moeda em espécie e remessa para conta própria. Confirme a alíquota vigente antes de decidir.

## Libra e franco suíço (Inglaterra e Suíça)
Não compre espécie dessas moedas. Use o cartão de débito da conta global, que converte na
hora (ou mantenha saldo pequeno em GBP/CHF, se a conta permitir). O script mostra as duas
cotações para referência.

## O que move o câmbio (para explicar no relatório)
- Juros: Selic (Copom) vs. Fed (EUA) e BCE (euro)
- Cenário fiscal brasileiro, eleições, notícias de Brasília
- Dólar global (DXY), commodities, aversão a risco
- Euro/BRL = Dólar/BRL × EUR/USD → o euro pode subir mesmo com o dólar parado
