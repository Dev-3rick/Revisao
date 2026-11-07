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

## Onde comprar (compare sempre o VET)
| Meio | Prós | Contras |
|---|---|---|
| Conta global (Wise, Nomad, Inter, C6…) | spread baixo, cartão de débito no exterior | verificar IOF e tarifa de saque |
| Espécie em casa de câmbio | aceito em qualquer lugar | spread alto, risco de carregar |
| Cartão de crédito no exterior | prático, acumula pontos | câmbio do dia da fatura + IOF + spread |

**IOF:** em 2025 o governo unificou em **3,5%** o IOF de cartão no exterior, compra de
moeda em espécie e remessa para conta própria. Confirme a alíquota vigente antes de decidir.

## O que move o câmbio (para explicar no relatório)
- Juros: Selic (Copom) vs. Fed (EUA) e BCE (euro)
- Cenário fiscal brasileiro, eleições, notícias de Brasília
- Dólar global (DXY), commodities, aversão a risco
- Euro/BRL = Dólar/BRL × EUR/USD → o euro pode subir mesmo com o dólar parado
