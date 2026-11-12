# Central de Pesquisa Diária — Câmbio, Viagem, Milhas e Cashback

Estrutura para o Claude pesquisar **todo dia** e entregar um relatório objetivo sobre:

1. **Câmbio** — dólar e euro (PTAX oficial + sinal de compra)
2. **Passagens para a Itália** — preços, promoções, momento de comprar
3. **Milhas e pontos** — bônus de transferência, promoções, valor do milheiro
4. **Cartões e cashback** — ofertas, anuidade, acúmulo
5. **Compras planejadas** — preço vs. preço-alvo
6. **Planejamento da viagem** — prazos, documentos, checklist

## Como funciona (processo)

```
 perfil/ + config/         rotina/pesquisa-diaria.md         relatorios/AAAA-MM-DD.md
 (seus dados e metas) ──▶  (passo a passo do Claude)   ──▶   (relatório do dia)
                                    │                         historico/*.csv
                         scripts/cotacoes.py (BCB)            (séries para comparar)
```

| Etapa | O que acontece | Arquivo |
|---|---|---|
| 1. Contexto | Claude lê seu perfil, metas e gatilhos | `perfil/`, `config/alertas.md` |
| 2. Dados | Atualiza cotações oficiais (Banco Central) | `scripts/cotacoes.py` → `historico/cotacoes.csv` |
| 3. Pesquisa | Busca na web por tema, só em fontes da lista | `config/fontes.md` |
| 4. Decisão | Compara com gatilhos e guias → COMPRAR / ESPERAR / MONITORAR | `guias/` |
| 5. Entrega | Escreve o relatório no modelo e registra histórico | `rotina/template-relatorio.md` |

## Estrutura

```
perfil/perfil.md            ← PREENCHA: cidade, cartões, programas de milhas, saldo
perfil/viagem-italia.md     ← viagem de julho/2027: metas, orçamento, marcos
perfil/roteiro-europa.md    ← roteiro Paris–Londres–Munique–Suíça–Itália + orçamento em €
perfil/plano-euro.csv       ← registre aqui cada compra de euro (data,euros,cotacao)
perfil/compras.md           ← lista de compras planejadas com preço-alvo
config/alertas.md           ← gatilhos numéricos (quando avisar "compre agora")
config/fontes.md            ← fontes confiáveis por tema
rotina/pesquisa-diaria.md   ← procedimento que o Claude executa todo dia
rotina/template-relatorio.md← formato fixo do relatório
guias/                      ← estratégias de câmbio, passagens, milhas, cartões
historico/                  ← cotacoes.csv, passagens.csv, promocoes.csv
relatorios/                 ← um arquivo por dia
modelos/newsletter-whatsapp.md ← formato oficial da mensagem diária (WhatsApp/notificação)
modelos/radar-whatsapp.html ← prévia da newsletter com botão "copiar"
modelos/radar-painel.html   ← PAINEL DE DECISÃO (gerado por scripts/painel.py)
modelos/radar-painel.template.html ← layout do painel (o script injeta os dados)
scripts/cotacoes.py         ← PTAX USD/EUR/GBP/CHF + médias + sinal; --alerta = mensagem do euro
scripts/milhas.py           ← calculadora: milhas compradas vs. pagar em dinheiro
scripts/rotas.py            ← ranking de rotas pelo custo total porta a porta até a Itália
scripts/painel.py           ← gera o painel visual com os dados dos históricos
```

## Uso

- **Automático:**
  - 💶 Alerta do euro: dias úteis, 10h25 e 13h25 (depois da prévia e do fechamento da PTAX)
  - 📋 Relatório completo: todo dia às 7h40 (passagens, milhas, promoções, câmbio)
  - Entrega: notificação no app do Claude, no formato da newsletter "Radar Itália"
    (`modelos/newsletter-whatsapp.md`), pronta para colar no WhatsApp
- **Manual:** peça ao Claude: _"Rode a pesquisa diária"_.
- **Só câmbio:** `python3 scripts/cotacoes.py` · **alerta:** `python3 scripts/cotacoes.py --alerta`
- **Rota mais barata até a Itália:** `python3 scripts/rotas.py`
- **Milhas valem?** `python3 scripts/milhas.py --dinheiro 5200 --milhas 100000 --taxas 900 --milheiro 17`

> Nada aqui é recomendação financeira profissional. O relatório mostra dados, fontes e
> o raciocínio; a decisão é sua.

## Painel de decisão (Radar Itália)
```
python3 scripts/cotacoes.py   # atualiza as cotações oficiais
python3 scripts/painel.py     # gera modelos/radar-painel.html
```
O painel mostra, nesta ordem:
1. **O que fazer hoje**: euro (DOBRAR / NORMAL / SEGURAR + quantos € comprar), passagem
   (COMPRAR / MONITORAR) e milhas (ESPERAR / BLACK FRIDAY), com cor verde, amarela ou vermelha
2. **Câmbio e hora de comprar**: gráfico de euro, dólar, libra e franco (3M/6M/1A) com as zonas de
   compra, a média de 30 dias e o termômetro da faixa de 90 dias
3. **Plano de euros**: progresso até € 2.000, preço médio, parcela e simulador de compra na ARQ
4. **Régua de preço da passagem**: meta R$ 2.500 → média de julho R$ 6.963, com a melhor rota
5. **Milhas e promoções** (abertas, contexto, encerradas) e **marcos da viagem**
