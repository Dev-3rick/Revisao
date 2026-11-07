#!/usr/bin/env python3
"""Ranking de rotas pelo CUSTO TOTAL PORTA A PORTA até a Itália (ida e volta).

Lê historico/rotas.csv e converte a parte em euro pela última PTAX de historico/cotacoes.csv.
Colunas do CSV:
  data,origem,porta_europa,descricao,nacional_brl,internacional_brl,europa_eur,bagagem_eur,fonte
    nacional_brl       voo/ônibus até o aeroporto de saída (ida+volta), 0 se sai da sua cidade
    internacional_brl  Brasil ⇄ Europa, ida+volta
    europa_eur         trechos low-cost/trem da porta de entrada até a Itália e de volta
    bagagem_eur        bagagem/assento extra cobrado nas low-costs

Uso:
    python3 scripts/rotas.py              # ranking das rotas registradas (mais recentes primeiro em empates)
    python3 scripts/rotas.py --dias 7     # só pesquisas dos últimos 7 dias
"""
import argparse
import csv
from datetime import date, timedelta
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ROTAS = RAIZ / "historico" / "rotas.csv"
COTACOES = RAIZ / "historico" / "cotacoes.csv"


def ultimo_euro() -> float:
    with COTACOES.open(newline="") as f:
        linhas = [l for l in csv.DictReader(f) if l.get("eur_ptax")]
    return float(linhas[-1]["eur_ptax"])


def num(v: str) -> float:
    return float(v) if v not in (None, "") else 0.0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dias", type=int, default=None)
    a = ap.parse_args()
    eur = ultimo_euro()
    with ROTAS.open(newline="") as f:
        rotas = list(csv.DictReader(f))
    if a.dias:
        corte = (date.today() - timedelta(days=a.dias)).isoformat()
        rotas = [r for r in rotas if r["data"] >= corte]
    if not rotas:
        print("Nenhuma rota registrada em historico/rotas.csv.")
        return 0
    for r in rotas:
        r["total"] = (num(r["nacional_brl"]) + num(r["internacional_brl"])
                      + (num(r["europa_eur"]) + num(r["bagagem_eur"])) * eur)
    rotas.sort(key=lambda r: (r["total"], r["data"]))
    print(f"Custo total até a Itália, ida e volta (euro a R$ {eur:.4f} PTAX; low-cost pago no cartão/conta tem spread + IOF)")
    for i, r in enumerate(rotas[:10], 1):
        print(f"{i:>2}. R$ {r['total']:>8,.0f} | {r['origem']} → {r['porta_europa']} → Itália | {r['descricao']} "
              f"[nac R$ {num(r['nacional_brl']):,.0f} + int R$ {num(r['internacional_brl']):,.0f} "
              f"+ € {num(r['europa_eur']) + num(r['bagagem_eur']):,.0f}] ({r['data']}, {r['fonte']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
