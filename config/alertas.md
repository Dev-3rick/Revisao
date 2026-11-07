# Gatilhos de alerta

O relatório marca 🔔 **ALERTA** quando algum gatilho dispara. Ajuste os valores.

## Câmbio (base: PTAX venda do `scripts/cotacoes.py`)
| Gatilho | Regra | Ação sugerida |
|---|---|---|
| Euro barato | posição na faixa 90d ≤ 25% **ou** EUR ≤ R$ 5,80 | comprar parcela dobrada |
| Euro neutro | posição 25–60% | parcela programada normal |
| Euro caro | posição ≥ 60% **ou** alta > 3% na semana | segurar; só o mínimo |
| Dólar | mesmas regras (útil p/ compras online e cartões em US$) | idem |

Compra programada: **€ 2.000 em parcelas quinzenais até 15/06/2027** (≈ € 133 por parcela).
Cada compra é registrada em `perfil/plano-euro.csv` (data,euros,cotacao) e o script recalcula
a parcela. Alerta do euro **2x por dia útil** (`python3 scripts/cotacoes.py --alerta`).

## Passagens
Faixas para o **CUSTO TOTAL ida e volta até a Itália, julho/2027** (voo nacional de posicionamento +
internacional + low-cost/trem + bagagem — calculado pelo `scripts/rotas.py`):
| Faixa | Preço | Ação |
|---|---|---|
| 🎯 Meta dos sonhos | ≤ R$ 2.500 | COMPRAR NA HORA (erro tarifário ou promoção rara) |
| 🟢 Excelente | ≤ R$ 3.800 | COMPRAR |
| 🟡 Bom | R$ 3.800–4.500 | comprar se faltarem < 5 meses |
| 🔴 Caro | > R$ 5.500 | ESPERAR (a média de julho a partir do Galeão é ~R$ 6.963, segundo o Kayak) |

Também dispara alerta: **qualquer promoção Brasil → Europa** (de qualquer cidade, para qualquer
porta de entrada) cujo total estimado até a Itália caia nas faixas 🎯/🟢.

| Gatilho | Regra |
|---|---|
| Preço-alvo atingido | qualquer faixa 🎯/🟢 acima |
| Promoção relâmpago | queda ≥ 15% vs. mediana do `historico/passagens.csv` |
| Milhas | Europa ida+volta ≤ alvo em milhas, ou promoção de resgate com desconto |

## Milhas e pontos
| Gatilho | Regra |
|---|---|
| Bônus de transferência forte | ≥ 80% (Livelo/Esfera → Smiles/LATAM Pass/Azul) e você tem saldo |
| Compra de pontos barata | milheiro ≤ R$ 35 em promoção (Livelo ~R$ 35–40 é referência de "bom") |
| Pontos vencendo | vencimento em ≤ 60 dias |
| Combo Black Friday | compra Livelo com ≥ 50% de desconto **e** bônus ≥ 80% para Smiles/Azul ativo ao mesmo tempo |
| Milhas grátis | conta nova, conversão de câmbio ou cadastro que dá milhas sem custo extra |

## Cashback e cartões
| Gatilho | Regra |
|---|---|
| Cashback alto | ≥ 10% em loja relevante para `perfil/compras.md` |
| Cartão | anuidade zerada/isenção nova, ou bônus de boas-vindas relevante para o perfil |
