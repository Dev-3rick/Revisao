#!/usr/bin/env python3
"""Gera modelos/radar-painel.html (painel visual "Radar Itália") a partir dos históricos.

Uso:
    python3 scripts/painel.py            # escreve modelos/radar-painel.html
    python3 scripts/painel.py --saida X  # outro caminho

Lê: historico/cotacoes.csv, historico/rotas.csv, historico/promocoes.csv, perfil/plano-euro.csv.
Só biblioteca padrão. Não busca nada na internet: rode antes scripts/cotacoes.py.
"""
import argparse
import csv
import html
import json
import statistics
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
VIAGEM = date(2027, 7, 1)
MOEDAS = [("eur_ptax", "Euro"), ("usd_ptax", "Dólar"), ("gbp_ptax", "Libra"), ("chf_ptax", "Franco suíço")]
SPREAD_ARQ = 0.5


def ler(nome):
    p = RAIZ / nome
    if not p.exists():
        return []
    with p.open(newline="") as f:
        return list(csv.DictReader(f))


def br(v, casas=4):
    return f"{v:,.{casas}f}".replace(",", "X").replace(".", ",").replace("X", ".")


def sinal(pos):
    if pos <= 25:
        return "DOBRAR", "g"
    if pos <= 60:
        return "NORMAL", "w"
    return "SEGURAR", ""


def cartao(cot, col, nome):
    serie = [(l["data"], float(l[col])) for l in cot if l.get(col)]
    if len(serie) < 2:
        return ""
    vals = [v for _, v in serie]
    atual, m30 = vals[-1], statistics.mean(vals[-30:])
    lo, hi = min(vals[-90:]), max(vals[-90:])
    pos = 0 if hi == lo else (atual - lo) / (hi - lo) * 100
    rot, cls = sinal(pos)
    return (f'<div class="card cur"><b>{nome}</b><div class="v">R$ {br(atual)}</div>'
            f'<div class="d">{(atual / m30 - 1) * 100:+.1f}% vs. média 30d</div>'
            f'<div class="bar"><i style="left:{pos:.0f}%"></i></div>'
            f'<div class="sc"><span>{br(lo, 2)}</span><span>faixa 90d</span><span>{br(hi, 2)}</span></div>'
            f'<span class="pill {cls}">{rot}</span></div>')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--saida", default=str(RAIZ / "modelos" / "radar-painel.html"))
    a = ap.parse_args()

    cot = ler("historico/cotacoes.csv")
    rotas = ler("historico/rotas.csv")
    promos = ler("historico/promocoes.csv")
    plano = ler("perfil/plano-euro.csv")
    if not cot:
        raise SystemExit("Sem historico/cotacoes.csv: rode scripts/cotacoes.py primeiro.")

    ultimo = cot[-1]["data"]
    eur = [(l["data"][5:], float(l["eur_ptax"])) for l in cot if l.get("eur_ptax")][-90:]
    eur_atual = eur[-1][1]
    comprado = sum(float(p["euros"]) for p in plano if p.get("euros"))
    faltam = (VIAGEM - date.today()).days

    linhas_rotas = []
    for r in rotas:
        total = sum(float(r[c] or 0) for c in ("nacional_brl", "internacional_brl")) + \
            sum(float(r[c] or 0) for c in ("europa_eur", "bagagem_eur")) * eur_atual
        linhas_rotas.append((total, r))
    linhas_rotas.sort(key=lambda t: t[0])
    tabela = "".join(
        f"<tr><td>{html.escape(r['origem'])} → {html.escape(r['porta_europa'])} → Itália</td>"
        f"<td class=n>R$ {br(t, 0)}</td><td>{html.escape(r['descricao'])}</td>"
        f"<td>{html.escape(r['fonte'])}, {html.escape(r['data'])}</td></tr>"
        for t, r in linhas_rotas[:8]) or "<tr><td colspan=4>Nenhuma rota registrada ainda.</td></tr>"
    lista_promos = "".join(
        f"<li><b>{html.escape(p['programa'])}</b>: {html.escape(p['descricao'])} "
        f"<span class=src>(validade: {html.escape(p['validade'])})</span></li>"
        for p in promos[-6:][::-1]) or "<li>Nenhuma promoção registrada.</li>"

    pagina = f"""<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Radar Itália</title>
<style>
/* Layout: cabeçalho, 4 cartões de moeda, gráfico do euro, rotas, milhas e próximos passos */
:root{{--bg:#f3f1ec;--panel:#fff;--fg:#1c2623;--muted:#617068;--line:#ddd8cd;--accent:#0b7a5b;--warn:#b26a0a;--bad:#b3372b;--grid:#e6e2d8;--head:Georgia,serif;--body:system-ui,sans-serif}}
@media (prefers-color-scheme:dark){{:root:not([data-theme="light"]){{--bg:#0f1815;--panel:#18241f;--fg:#e8f0eb;--muted:#9bb0a6;--line:#2a3c35;--accent:#3fcf9f;--warn:#e3a550;--bad:#ef7b6e;--grid:#233229;color-scheme:dark}}}}
:root[data-theme="dark"]{{--bg:#0f1815;--panel:#18241f;--fg:#e8f0eb;--muted:#9bb0a6;--line:#2a3c35;--accent:#3fcf9f;--warn:#e3a550;--bad:#ef7b6e;--grid:#233229;color-scheme:dark}}
body{{background:var(--bg);color:var(--fg);font-family:var(--body);font-size:16px;line-height:1.45;margin:0;padding:24px 16px}}
.wrap{{max-width:860px;margin:0 auto;display:flex;flex-direction:column;gap:20px;min-width:0}}
h1{{font-family:var(--head);font-size:2rem;margin:0}} h2{{font-family:var(--head);font-size:1.15rem;margin:0 0 10px}}
.sub{{color:var(--muted);margin:4px 0 0}}
.card{{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:16px;min-width:0}}
.grid4{{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px}}
.cur b{{display:block;font-size:.8rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}}
.cur .v{{font-family:var(--head);font-size:1.7rem;font-variant-numeric:tabular-nums;margin:2px 0}}
.cur .d{{font-size:.85rem;color:var(--muted)}}
.pill{{display:inline-block;font-size:.75rem;font-weight:600;border-radius:99px;padding:2px 10px;margin-top:6px;color:var(--bad);background:color-mix(in srgb,var(--bad) 14%,transparent)}}
.pill.w{{color:var(--warn);background:color-mix(in srgb,var(--warn) 16%,transparent)}}
.pill.g{{color:var(--accent);background:color-mix(in srgb,var(--accent) 15%,transparent)}}
.bar{{height:8px;border-radius:99px;background:var(--grid);margin:8px 0 2px;position:relative}}
.bar i{{position:absolute;top:-3px;width:14px;height:14px;border-radius:50%;background:var(--bad);border:2px solid var(--panel);transform:translateX(-50%)}}
.sc{{display:flex;justify-content:space-between;font-size:.75rem;color:var(--muted)}}
#chart{{width:100%;display:block}} .tip{{font-size:.85rem;color:var(--muted);min-height:1.3em;margin-top:6px}}
table{{width:100%;border-collapse:collapse;font-size:.9rem}} th,td{{text-align:left;padding:8px 6px;border-bottom:1px solid var(--line);vertical-align:top}}
th{{font-size:.75rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}} td.n{{white-space:nowrap}}
.scroll{{overflow-x:auto}} .cols{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px}}
ul{{margin:0;padding-left:18px}} li{{margin:4px 0}} .src{{font-size:.8rem;color:var(--muted)}}
.meta{{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin-top:10px}}
.meta div{{border:1px dashed var(--line);border-radius:8px;padding:8px 10px;font-size:.85rem}}
.meta b{{display:block;font-size:.75rem;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}}
</style></head><body>
<div class="wrap">
<header><h1>Radar Itália</h1><p class="sub">PTAX de {ultimo[8:]}/{ultimo[5:7]}/{ultimo[:4]} · Itália em julho/2027 · faltam {faltam} dias</p></header>
<section class="grid4" aria-label="Cotações">{''.join(cartao(cot, c, n) for c, n in MOEDAS)}</section>
<section class="card"><h2>Euro nos últimos 90 dias</h2>
 <svg id="chart" role="img" aria-label="Linha da PTAX do euro nos últimos 90 dias úteis"></svg>
 <div class="tip" id="tip">Passe o dedo ou o mouse sobre o gráfico.</div>
 <div class="meta"><div><b>Plano de euros</b>€ {br(comprado, 0)} de € 2.000</div>
 <div><b>Preço na ARQ (estimado)</b>R$ {br(eur_atual * (1 + SPREAD_ARQ / 100))} por €</div></div>
 <p class="src">Fonte: PTAX/Banco Central (historico/cotacoes.csv).</p></section>
<section class="card"><h2>Rotas até a Itália (custo total ida e volta)</h2>
 <div class="scroll"><table><thead><tr><th>Rota</th><th>Total</th><th>Observação</th><th>Fonte</th></tr></thead><tbody>{tabela}</tbody></table></div>
 <p class="src">Meta: R$ 2.500 · excelente ≤ R$ 3.800 · historico/rotas.csv</p></section>
<div class="cols">
 <section class="card"><h2>Milhas e promoções</h2><ul>{lista_promos}</ul><p class="src">historico/promocoes.csv</p></section>
 <section class="card"><h2>Próximos passos</h2><ul><li>Definir cidade da tia e datas</li><li>Abrir 2ª conta de reserva (Revolut ou Wise)</li><li>Cadastro grátis: Livelo, Smiles, Azul</li><li>Vigiar a Black Friday (20/11 a 02/12)</li></ul></section>
</div></div>
<script>
(function(){{
var D={json.dumps(eur)},svg=document.getElementById('chart'),tip=document.getElementById('tip');
function css(n){{return getComputedStyle(document.documentElement).getPropertyValue(n)}}
function draw(){{
 var W=svg.clientWidth||600,H=220,m={{l:44,r:12,t:12,b:24}},NS='http://www.w3.org/2000/svg';
 svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.setAttribute('height',H);svg.innerHTML='';
 var vals=D.map(function(d){{return d[1]}}),lo=Math.min.apply(0,vals)-0.05,hi=Math.max.apply(0,vals)+0.05,L=D.length-1,
 x=function(i){{return m.l+i*(W-m.l-m.r)/L}},y=function(v){{return m.t+(hi-v)/(hi-lo)*(H-m.t-m.b)}};
 function el(t,a,txt){{var e=document.createElementNS(NS,t);for(var k in a)e.setAttribute(k,a[k]);if(txt)e.textContent=txt;svg.appendChild(e);return e}}
 for(var k=0;k<4;k++){{var t=lo+(hi-lo)*k/3;el('line',{{x1:m.l,x2:W-m.r,y1:y(t),y2:y(t),stroke:css('--grid')}});el('text',{{x:m.l-6,y:y(t)+4,'text-anchor':'end','font-size':11,fill:css('--muted')}},t.toFixed(2))}}
 [0,Math.floor(L/2),L].forEach(function(i){{el('text',{{x:x(i),y:H-6,'text-anchor':i==0?'start':i==L?'end':'middle','font-size':11,fill:css('--muted')}},D[i][0].split('-').reverse().join('/'))}});
 var p=D.map(function(d,i){{return x(i)+','+y(d[1])}}).join(' ');
 el('polygon',{{points:x(0)+','+y(lo)+' '+p+' '+x(L)+','+y(lo),fill:css('--accent'),opacity:.12}});
 el('polyline',{{points:p,fill:'none',stroke:css('--accent'),'stroke-width':2.5,'stroke-linejoin':'round'}});
 el('circle',{{cx:x(L),cy:y(vals[L]),r:5,fill:css('--bad')}});
 var cur=el('circle',{{cx:-10,cy:-10,r:4,fill:css('--fg')}});
 function mv(ev){{var r=svg.getBoundingClientRect(),px=(ev.touches?ev.touches[0].clientX:ev.clientX)-r.left;
  var i=Math.max(0,Math.min(L,Math.round((px-m.l)/(W-m.l-m.r)*L)));cur.setAttribute('cx',x(i));cur.setAttribute('cy',y(vals[i]));
  tip.textContent=D[i][0].split('-').reverse().join('/')+' · R$ '+vals[i].toFixed(4).replace('.',',')}}
 svg.onmousemove=mv;svg.ontouchmove=mv;svg.ontouchstart=mv}}
draw();window.addEventListener('resize',draw);
}})();
</script></body></html>
"""
    Path(a.saida).write_text(pagina, encoding="utf-8")
    print(f"Painel gerado: {a.saida}")


if __name__ == "__main__":
    main()
