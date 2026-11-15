#!/usr/bin/env python3
"""Calculadora: comprar milhas compensa ou é melhor pagar a passagem em dinheiro?

Exemplo:
    python3 scripts/milhas.py --dinheiro 5200 --milhas 100000 --taxas 900 --milheiro 17
      --dinheiro  preço da passagem em R$ (mesmo voo/datas)
      --milhas    milhas pedidas no resgate
      --taxas     taxas de embarque/combustível cobradas no resgate (R$)
      --milheiro  quanto VOCÊ paga por 1.000 milhas (compra direta, Livelo+bônus, clube…)
"""
import argparse


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--dinheiro", type=float, required=True)
    ap.add_argument("--milhas", type=float, required=True)
    ap.add_argument("--taxas", type=float, default=0)
    ap.add_argument("--milheiro", type=float, required=True)
    a = ap.parse_args()

    custo_milhas = a.milhas / 1000 * a.milheiro + a.taxas
    valor_obtido = (a.dinheiro - a.taxas) / (a.milhas / 1000)  # R$ que cada mil milhas "vale" neste voo
    economia = a.dinheiro - custo_milhas
    print(f"Pagando em dinheiro:  R$ {a.dinheiro:,.2f}")
    print(f"Pagando com milhas:   R$ {custo_milhas:,.2f}  ({a.milhas:,.0f} milhas × R$ {a.milheiro:.2f}/mil + R$ {a.taxas:,.2f} de taxas)")
    print(f"Valor do milheiro neste resgate: R$ {valor_obtido:.2f}  (empate: comprar milhas abaixo disso)")
    if economia > 0:
        print(f"✅ MILHAS COMPENSAM: economia de R$ {economia:,.2f} ({economia / a.dinheiro * 100:.0f}%)")
    else:
        print(f"❌ DINHEIRO É MELHOR: milhas custariam R$ {-economia:,.2f} a mais")
    print("Regra: só compre milhas com o resgate já encontrado (voo e datas com disponibilidade).")


if __name__ == "__main__":
    main()
