#!/usr/bin/env python3
"""Gera o painel de decisão "Radar Itália" em modelos/radar-painel.html.

Uso:
    python3 scripts/cotacoes.py   # 1) atualiza as cotações (BCB)
    python3 scripts/painel.py     # 2) gera o painel com os dados dos históricos

Lê: historico/cotacoes.csv, historico/rotas.csv, historico/promocoes.csv,
    perfil/plano-euro.csv, perfil/viagem-italia.md (tabela de marcos).
Só biblioteca padrão; não acessa a internet.
"""
import argparse
import csv
import json
import re
from datetime import date
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
VIAGEM = date(2027, 7, 1)
FIM_COMPRA_EURO = date(2027, 6, 15)
META_EURO = 2000
SPREAD_ARQ = 0.5
BLACK_FRIDAY = (date(2026, 11, 20), date(2026, 12, 2))
FAIXAS_PASSAGEM = [  # custo total ida+volta até a Itália
    (2500, "Meta"), (3800, "Excelente"), (4500, "Bom"), (5500, "Caro"), (6963, "Média de julho"),
]


def ler(nome):
    p = RAIZ / nome
    if not p.exists():
        return []
    with p.open(newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def marcos():
    p = RAIZ / "perfil" / "viagem-italia.md"
    if not p.exists():
        return []
    txt = p.read_text(encoding="utf-8")
    bloco = txt.split("## Marcos", 1)[-1]
    out = []
    for linha in bloco.splitlines():
        cols = [c.strip() for c in linha.strip().strip("|").split("|")]
        if len(cols) == 3 and cols[0] not in ("Marco", "") and not set(cols[0]) <= set("-"):
            out.append({"marco": re.sub(r"\*\*", "", cols[0]), "prazo": cols[1],
                        "feito": "x" in cols[2].lower()})
    return out


def status_promo(validade, hoje):
    v = (validade or "").lower()
    if "encerr" in v:
        return "encerrada"
    m = re.search(r"(\d{2})/(\d{2})/(\d{4})", v)
    if m:
        d = date(int(m.group(3)), int(m.group(2)), int(m.group(1)))
        return "vigente" if d >= hoje else "encerrada"
    return "contexto"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--saida", default=str(RAIZ / "modelos" / "radar-painel.html"))
    a = ap.parse_args()
    hoje = date.today()

    cot = ler("historico/cotacoes.csv")
    if not cot:
        raise SystemExit("Sem historico/cotacoes.csv: rode scripts/cotacoes.py primeiro.")
    series = {}
    for col, chave in (("eur_ptax", "EUR"), ("usd_ptax", "USD"), ("gbp_ptax", "GBP"), ("chf_ptax", "CHF")):
        series[chave] = [[l["data"], round(float(l[col]), 4)] for l in cot if l.get(col)]

    eur_atual = series["EUR"][-1][1]
    rotas = []
    for r in ler("historico/rotas.csv"):
        total = num(r["nacional_brl"]) + num(r["internacional_brl"]) + \
            (num(r["europa_eur"]) + num(r["bagagem_eur"])) * eur_atual
        rotas.append({"data": r["data"], "rota": f"{r['origem']} → {r['porta_europa']} → Itália",
                      "total": round(total), "obs": r["descricao"], "fonte": r["fonte"],
                      "referencia": "REFER" in r["descricao"].upper()})
    rotas.sort(key=lambda x: x["total"])

    promos = [{"programa": p["programa"], "tipo": p["tipo"], "descricao": p["descricao"],
               "validade": p["validade"], "status": status_promo(p["validade"], hoje), "fonte": p["fonte"]}
              for p in ler("historico/promocoes.csv")]
    ordem = {"vigente": 0, "contexto": 1, "encerrada": 2}
    promos.sort(key=lambda p: ordem[p["status"]])

    compras = [{"data": p["data"], "euros": num(p["euros"]), "cotacao": num(p["cotacao"])}
               for p in ler("perfil/plano-euro.csv") if p.get("euros")]

    dados = {
        "hoje": hoje.isoformat(), "viagem": VIAGEM.isoformat(), "fimCompra": FIM_COMPRA_EURO.isoformat(),
        "metaEuro": META_EURO, "spreadArq": SPREAD_ARQ,
        "blackFriday": [d.isoformat() for d in BLACK_FRIDAY],
        "faixas": FAIXAS_PASSAGEM, "series": series, "rotas": rotas[:8], "promos": promos,
        "compras": compras, "marcos": marcos(),
    }
    modelo = (RAIZ / "modelos" / "radar-painel.template.html").read_text(encoding="utf-8")
    pagina = modelo.replace("__DADOS__", json.dumps(dados, ensure_ascii=False).replace("</", "<\\/"))
    Path(a.saida).write_text(pagina, encoding="utf-8")
    print(f"Painel gerado: {a.saida} (PTAX de {series['EUR'][-1][0]})")


if __name__ == "__main__":
    main()
