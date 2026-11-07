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
scripts/cotacoes.py         ← PTAX USD/EUR/GBP/CHF + médias + sinal; --alerta = mensagem do euro
scripts/milhas.py           ← calculadora: milhas compradas vs. pagar em dinheiro
```

## Uso

- **Automático:**
  - 💶 Alerta do euro: dias úteis, 10h25 e 13h25 (depois da prévia e do fechamento da PTAX)
  - 📋 Relatório completo: todo dia às 7h40 (passagens, milhas, promoções, câmbio)
  - Entrega: notificação no app do Claude; o texto já sai no formato do WhatsApp
- **Manual:** peça ao Claude: _"Rode a pesquisa diária"_.
- **Só câmbio:** `python3 scripts/cotacoes.py` · **alerta:** `python3 scripts/cotacoes.py --alerta`
- **Milhas valem?** `python3 scripts/milhas.py --dinheiro 5200 --milhas 100000 --taxas 900 --milheiro 17`

> Nada aqui é recomendação financeira profissional. O relatório mostra dados, fontes e
> o raciocínio; a decisão é sua.
