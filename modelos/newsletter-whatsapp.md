# Modelo — Newsletter "Radar Itália" (WhatsApp)

Formato oficial da mensagem diária. No WhatsApp: `*texto*` = **negrito**, `_texto_` = _itálico_.
Prévia visual: `modelos/radar-whatsapp.html` · Painel completo: `modelos/radar-painel.html`.

## Mensagem diária (pesquisa das 7h40)
```
📲 *Radar Itália · {dia_semana}, {DD/MM/AAAA}*
✈️ Faltam {N} dias para julho/2027

💶 *Euro:* R$ {eur_ptax} ({var_30d} vs. média 30d) → *{SEGURAR|NORMAL|DOBRAR}*
Na ARQ: ~R$ {eur_arq} · parcela de hoje: € {parcela}

✈️ *Passagem até a Itália:* {resumo} → *{COMPRAR|ESPERAR|MONITORAR}*

🏆 *Rota mais barata do dia:* {origem} → {porta_europa} → Itália · total ~R$ {total}
_{o que entra no total; se for só referência, escrever "(referência)"}_

🎟️ *Milhas:* {melhor oportunidade ou "nada vigente"} → *{veredito}*

✅ *Ação de hoje:* {uma ação concreta ou "nenhuma compra"}

🔔 *Alertas:* {lista ou "nenhum"}

_Fontes: {fontes}_
```

## Alerta do euro (10h25 e 13h25, dias úteis)
Gerado por `python3 scripts/cotacoes.py --alerta` (mesmo estilo, só o bloco 💶).

## Regras do conteúdo
- Máximo de ~15 linhas: cabe numa tela de celular.
- Todo número com fonte e data; promoção encerrada só aparece marcada como referência.
- Um veredito por tema: COMPRAR / ESPERAR / MONITORAR (euro: DOBRAR / NORMAL / SEGURAR).
- Sem link encurtado nem cupom de afiliado.
