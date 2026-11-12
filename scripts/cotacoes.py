#!/usr/bin/env python3
"""Busca a PTAX oficial (Banco Central do Brasil) de USD e EUR, atualiza
historico/cotacoes.csv e imprime um painel com médias, faixa e sinal de compra.

Uso:
    python3 scripts/cotacoes.py            # atualiza histórico (últimos 120 dias) e mostra painel
    python3 scripts/cotacoes.py --dias 365 # janela maior para preencher o histórico
    python3 scripts/cotacoes.py --alerta   # mensagem curta do euro (formato WhatsApp/notificação)

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
MOEDAS = ("USD", "EUR", "GBP", "CHF")
COLUNAS = {"USD": "usd_ptax", "EUR": "eur_ptax", "GBP": "gbp_ptax", "CHF": "chf_ptax"}
PLANO = RAIZ / "perfil" / "plano-euro.csv"
BOLETIM = {}  # moeda -> {dia: rótulo do boletim}
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
    for item in sorted(dados, key=lambda i: i["dataHoraCotacao"]):
        dia = item["dataHoraCotacao"][:10]
        hora = item["dataHoraCotacao"][11:16]
        # "Fechamento" é a PTAX oficial do dia; antes dele vale o boletim mais recente
        # (prévia intradiária: abertura ~10h, intermediários 11h/12h).
        if por_dia.get(dia, ("",))[0] == "Fechamento":
            continue
        rotulo = "Fechamento" if item["tipoBoletim"] == "Fechamento" else f"parcial {hora}"
        por_dia[dia] = (rotulo, item["cotacaoVenda"])
    BOLETIM[moeda] = {d: r for d, (r, _) in por_dia.items()}
    return {d: v for d, (_, v) in por_dia.items()}


def carregar_csv() -> dict:
    if not CSV_PATH.exists():
        return {}
    with CSV_PATH.open(newline="") as f:
        return {linha["data"]: linha for linha in csv.DictReader(f)}


def salvar_csv(linhas: dict) -> None:
    CSV_PATH.parent.mkdir(parents=True, exist_ok=True)
    with CSV_PATH.open("w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["data", *COLUNAS.values()], restval="")
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


def plano_euro() -> tuple:
    """Lê perfil/plano-euro.csv (data,euros,cotacao) -> (euros comprados, preço médio)."""
    if not PLANO.exists():
        return 0.0, None
    with PLANO.open(newline="") as f:
        compras = [(float(l["euros"]), float(l["cotacao"])) for l in csv.DictReader(f) if l.get("euros")]
    total = sum(e for e, _ in compras)
    return total, (sum(e * c for e, c in compras) / total if total else None)


def alerta(linhas: dict, meta_eur: float, data_limite: date, spread_arq: float) -> str:
    datas = sorted(linhas)
    eur = [float(linhas[d]["eur_ptax"]) for d in datas if linhas[d].get("eur_ptax")]
    atual, ontem = eur[-1], eur[-2]
    m30 = statistics.mean(eur[-30:])
    janela = eur[-90:]
    lo, hi = min(janela), max(janela)
    pos = 0 if hi == lo else (atual - lo) / (hi - lo) * 100
    if pos <= 25:
        emoji, acao, mult = "🟢", "COMPRAR PARCELA DOBRADA", 2
    elif pos <= 60:
        emoji, acao, mult = "🟡", "COMPRAR PARCELA NORMAL", 1
    else:
        emoji, acao, mult = "🔴", "SEGURAR (só meia parcela, se precisar)", 0.5
    comprado, medio = plano_euro()
    falta = max(meta_eur - comprado, 0)
    hoje = date.today()
    quinzenas = max(((data_limite - hoje).days // 14), 1)
    parcela = falta / quinzenas
    rot = BOLETIM.get("EUR", {}).get(datas[-1], "histórico local")
    extra = []
    for moeda, nome in (("GBP", "Libra"), ("CHF", "Franco suíço")):
        col = COLUNAS[moeda]
        if linhas[datas[-1]].get(col):
            extra.append(f"{nome}: R$ {float(linhas[datas[-1]][col]):.4f}")
    linhas_msg = [
        f"💶 *Euro hoje* — {datetime_br(datas[-1])} ({rot})",
        f"R$ {atual:.4f}  ({(atual/ontem-1)*100:+.2f}% vs dia anterior | {(atual/m30-1)*100:+.2f}% vs média 30d)",
        f"Faixa 90d: R$ {lo:.4f} – R$ {hi:.4f} | posição {pos:.0f}%",
        f"{emoji} *{acao}*",
        f"Na ARQ (estimado, PTAX + {spread_arq:.1f}%): R$ {atual*(1+spread_arq/100):.4f} por €",
        f"Parcela base: € {parcela:,.0f} a cada 15 dias → hoje: € {parcela*mult:,.0f} (≈ R$ {parcela*mult*atual*(1+spread_arq/100):,.0f} na ARQ)",
        f"Plano: € {comprado:,.0f} de € {meta_eur:,.0f}" + (f" | preço médio R$ {medio:.4f}" if medio else ""),
    ]
    if extra:
        linhas_msg.append(" | ".join(extra))
    linhas_msg.append("Fonte: PTAX/Banco Central. Não é recomendação financeira.")
    return "\n".join(linhas_msg)


def datetime_br(iso: str) -> str:
    a, m, d = iso.split("-")
    return f"{d}/{m}/{a}"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dias", type=int, default=120)
    ap.add_argument("--alerta", action="store_true", help="mensagem curta do euro")
    ap.add_argument("--meta-eur", type=float, default=2000, help="total de euros da viagem")
    ap.add_argument("--ate", default="2027-06-15", help="data limite para terminar a compra (AAAA-MM-DD)")
    ap.add_argument("--spread-arq", type=float, default=0.5, help="custo de conversão da ARQ em %% (informado: 0,5%%)")
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
            linha = linhas.get(d, {"data": d})
            for moeda, col in COLUNAS.items():
                if d in series[moeda]:
                    linha[col] = f"{series[moeda][d]:.4f}"
            linhas[d] = linha
        salvar_csv(linhas)

    if not linhas:
        print("Sem dados de cotação.", file=sys.stderr)
        return 1
    if args.alerta:
        print(alerta(linhas, args.meta_eur, date.fromisoformat(args.ate), args.spread_arq))
        return 0
    datas = sorted(linhas)
    print(f"PTAX (venda) - último dia útil: {datas[-1]}  | fonte: Banco Central do Brasil")
    print(painel([float(linhas[d]["usd_ptax"]) for d in datas], "Dólar (USD)"))
    print(painel([float(linhas[d]["eur_ptax"]) for d in datas], "Euro  (EUR)"))
    for moeda, nome in (("GBP", "Libra (GBP)"), ("CHF", "Franco (CHF)")):
        serie = [float(linhas[d][COLUNAS[moeda]]) for d in datas if linhas[d].get(COLUNAS[moeda])]
        if len(serie) >= 2:
            print(painel(serie, nome))
    print("Obs.: PTAX é a referência oficial. Casas de câmbio, Wise e cartões cobram spread"
          " + IOF por cima; compare o VET (valor efetivo total).")
    return 0


if __name__ == "__main__":
    sys.exit(main())
