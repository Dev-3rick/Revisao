# Gatilhos de alerta

O relatório marca 🔔 **ALERTA** quando algum gatilho dispara. Ajuste os valores.

## Câmbio (base: PTAX venda do `scripts/cotacoes.py`)
| Gatilho | Regra | Ação sugerida |
|---|---|---|
| Euro barato | posição na faixa 90d ≤ 25% **ou** EUR ≤ [PREENCHER R$] | comprar parcela dobrada |
| Euro neutro | posição 25–60% | parcela programada normal |
| Euro caro | posição ≥ 60% **ou** alta > 3% na semana | segurar; só o mínimo |
| Dólar | mesmas regras (útil p/ compras online e cartões em US$) | idem |

Compra programada (preço médio): dividir os euros necessários em parcelas
semanais/quinzenais até ~30 dias antes da viagem.

## Passagens
| Gatilho | Regra |
|---|---|
| Preço-alvo atingido | ida+volta ≤ preço-alvo de `perfil/viagem-italia.md` |
| Promoção relâmpago | queda ≥ 15% vs. mediana do `historico/passagens.csv` |
| Milhas | Europa ida+volta ≤ alvo em milhas, ou promoção de resgate com desconto |

## Milhas e pontos
| Gatilho | Regra |
|---|---|
| Bônus de transferência forte | ≥ 80% (Livelo/Esfera → Smiles/LATAM Pass/Azul) e você tem saldo |
| Compra de pontos barata | milheiro ≤ R$ 35 em promoção (Livelo ~R$ 35–40 é referência de "bom") |
| Pontos vencendo | vencimento em ≤ 60 dias |

## Cashback e cartões
| Gatilho | Regra |
|---|---|
| Cashback alto | ≥ 10% em loja relevante para `perfil/compras.md` |
| Cartão | anuidade zerada/isenção nova, ou bônus de boas-vindas relevante para o perfil |
