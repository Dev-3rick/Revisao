#!/usr/bin/env python3
"""Busca a PTAX oficial (Banco Central do Brasil) de USD e EUR, atualiza
historico/cotacoes.csv e imprime um painel com médias, faixa e sinal de compra.

Uso:
    python3 scripts/cotacoes.py            # atualiza histórico (últimos 120 dias) e mostra painel
    python3 scripts/cotacoes.py --dias 365 # janela maior para preencher o histórico

Só usa biblioteca padrão. Fonte: olinda.bcb.gov.br (API PTAX, pública).
"""
import argparse
import csv
import json
import statistics
import sys
import urllib.parse
import urllib.request
from datetime import date, timedelta
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CSV_PATH = RAIZ / "historico" / "cotacoes.csv"
MOEDAS = ("USD", "EUR")
BASE = ("https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/"
        "CotacaoMoedaPeriodo(moeda=@moeda,dataInicial=@dataInicial,"
        "dataFinalCotacao=@dataFinalCotacao)")


def buscar_ptax(moeda: str, inicio: date, fim: date) -> dict:
    """Retorna {data_iso: cotacao_venda} usando o boletim de fechamento de cada dia."""
    params = {
        "@moeda": f"'{moeda}'",
        "@dataInicial": f"'{inicio:%m-%d-%Y}'",
        "@dataFinalCotacao": f"'{fim:%m-%d-%Y}'",
        "$format": "json",
        "$select": "cotacaoVenda,dataHoraCotacao,tipoBoletim",
    }
    url = BASE + "?" + urllib.parse.urlencode(params, safe="@'$,")
    with urllib.request.urlopen(url, timeout=30) as resp:
        dados = json.load(resp)["value"]
    por_dia = {}
    for item in dados:
        dia = item["dataHoraCotacao"][:10]
        # O boletim "Fechamento" é a PTAX oficial do dia; boletins intermediários
        # servem de prévia quando o fechamento ainda não saiu.
        if item["tipoBoletim"] == "Fechamento" or dia not in por_dia:
            por_dia[dia] = (item["tipoBoletim"], item["cotacaoVenda"])
        elif por_dia[dia][0] != "Fechamento":
            por_dia[dia] = (item["tipoBoletim"], item["cotacaoVenda"])
    return {d: v for d, (_, v) in por_dia.items()}


def carregar_csv() -> dict:
    if not CSV_PATH.exists():
        return {}
    with CSV_PATH.open(newline="") as f:
        return {linha["data"]: linha for linha in csv.DictReader(f)}


def salvar_csv(linhas: dict) -> None:
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CSV_PATH.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["data", "usd_ptax", "eur_ptax"])
        w.writeheader()
        for d in sorted(linhas):
            w.writerow(linhas[d])


def painel(serie: list, nome: str) -> str:
    atual = serie[-1]
    def media(n):
        return statistics.mean(serie[-n:]) if len(serie) >= n else None
    m7, m30, m90 = media(7), media(30), media(90)
    janela = serie[-90:]
    minimo, maximo = min(janela), max(janela)
    # Posição do preço atual na faixa de 90 dias: 0% = mínima, 100% = máxima.
    pos = 0 if maximo == minimo else (atual - minimo) / (maximo - minimo) * 100
    if pos <= 25:
        sinal = "FAVORÁVEL - perto da mínima de 90d: bom momento para comprar uma parcela maior"
    elif pos <= 60:
        sinal = "NEUTRO - comprar só a parcela programada (preço médio)"
    else:
        sinal = "DESFAVORÁVEL - perto da máxima de 90d: segurar, comprar o mínimo necessário"
    fmt = lambda v: f"R$ {v:.4f}" if v is not None else "n/d"
    var_30 = f"{(atual / m30 - 1) * 100:+.2f}% vs média 30d" if m30 else ""
    return (f"{nome}: {fmt(atual)}  ({var_30})\n"
            f"  médias  7d {fmt(m7)} | 30d {fmt(m30)} | 90d {fmt(m90)}\n"
            f"  faixa 90d {fmt(minimo)} – {fmt(maximo)}  | posição na faixa: {pos:.0f}%\n"
            f"  sinal: {sinal}")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dias", type=int, default=120)
    args = ap.parse_args()

    fim = date.today()
    inicio = fim - timedelta(days=args.dias)
    linhas = carregar_csv()
    try:
        series = {m: buscar_ptax(m, inicio, fim) for m in MOEDAS}
    except Exception as e:  # rede fora: segue com o histórico salvo
        print(f"AVISO: falha ao consultar o BCB ({e}). Usando histórico local.", file=sys.stderr)
        series = None

    if series:
        for d in sorted(set(series["USD"]) & set(series["EUR"])):
            linhas[d] = {"data": d,
                         "usd_ptax": f"{series['USD'][d]:.4f}",
                         "eur_ptax": f"{series['EUR'][d]:.4f}"}
        salvar_csv(linhas)

    if not linhas:
        print("Sem dados de cotação.", file=sys.stderr)
        return 1
    datas = sorted(linhas)
    print(f"PTAX (venda) - último dia útil: {datas[-1]}  | fonte: Banco Central do Brasil")
    print(painel([float(linhas[d]["usd_ptax"]) for d in datas], "Dólar (USD)"))
    print(painel([float(linhas[d]["eur_ptax"]) for d in datas], "Euro  (EUR)"))
    print("Obs.: PTAX é a referência oficial. Casas de câmbio, Wise e cartões cobram spread"
          " + IOF por cima; compare o VET (valor efetivo total).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
