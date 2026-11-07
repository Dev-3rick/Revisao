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
perfil/viagem-italia.md     ← PREENCHA: datas, quem vai, orçamento, preço-alvo
perfil/compras.md           ← lista de compras planejadas com preço-alvo
config/alertas.md           ← gatilhos numéricos (quando avisar "compre agora")
config/fontes.md            ← fontes confiáveis por tema
rotina/pesquisa-diaria.md   ← procedimento que o Claude executa todo dia
rotina/template-relatorio.md← formato fixo do relatório
guias/                      ← estratégias de câmbio, passagens, milhas, cartões
historico/                  ← cotacoes.csv, passagens.csv, promocoes.csv
relatorios/                 ← um arquivo por dia
scripts/cotacoes.py         ← PTAX USD/EUR + médias + sinal
```

## Uso

- **Automático:** tarefa agendada diária roda `rotina/pesquisa-diaria.md`.
- **Manual:** peça ao Claude: _"Rode a pesquisa diária"_.
- **Só câmbio:** `python3 scripts/cotacoes.py`

> Nada aqui é recomendação financeira profissional. O relatório mostra dados, fontes e
> o raciocínio; a decisão é sua.
