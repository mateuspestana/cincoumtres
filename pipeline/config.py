"""Parâmetros de cada legislatura e caminhos do pipeline.

As candidaturas do TSE são baixadas por tse.py para pipeline/tse/ (fora do controle de versão).
Nenhum CPF sai do pipeline: ele só serve para cruzar Câmara e TSE aqui dentro.

Autor: Matheus C. Pestana.
"""
import datetime as dt
import os
from pathlib import Path

PASTA = Path(__file__).resolve().parent
RAIZ = PASTA.parent
BRUTO = PASTA / "bruto"
SAIDA_SITE = RAIZ / "site" / "public" / "data"
PASTA_TSE = Path(os.environ.get("CINCOUMTRES_TSE", PASTA / "tse"))

API = "https://dadosabertos.camara.leg.br/api/v2"

# Cadeiras por UF da Lei Complementar 78/1993 (513 no total), usadas na 57ª.
CADEIRAS_LC78 = {
    "SP": 70, "MG": 53, "RJ": 46, "BA": 39, "RS": 31, "PR": 30, "PE": 25, "CE": 22, "MA": 18,
    "GO": 17, "PA": 17, "SC": 16, "PB": 12, "ES": 10, "PI": 10, "AL": 9, "AC": 8, "AM": 8,
    "AP": 8, "DF": 8, "MS": 8, "MT": 8, "RN": 8, "RO": 8, "RR": 8, "SE": 8, "TO": 8,
}

LEGISLATURAS = {
    57: {
        "inicio": dt.date(2023, 2, 1),
        "fim": dt.date(2027, 1, 31),
        "ano_eleicao": 2022,
        "tse": PASTA_TSE / "candidatos_2022.parquet",
        "cadeiras": CADEIRAS_LC78,
        "ativa": True,
    },
    # A 58ª começa em 1º/02/2027. As cadeiras por UF saem dos eleitos de 2026 quando a coleta
    # for ligada (ativa=True); até lá o site mostra a legislatura como "em breve".
    # Conferir antes de ligar: o arquivo do TSE só traz os eleitos já totalizados (505 em 19/11/2026).
    58: {
        "inicio": dt.date(2027, 2, 1),
        "fim": dt.date(2031, 1, 31),
        "ano_eleicao": 2026,
        "tse": PASTA_TSE / "candidatos_2026.parquet",
        "cadeiras": None,
        "ativa": False,
    },
}

UF_PARA_REGIAO = {
    "AC": "Norte", "AP": "Norte", "AM": "Norte", "PA": "Norte", "RO": "Norte", "RR": "Norte", "TO": "Norte",
    "AL": "Nordeste", "BA": "Nordeste", "CE": "Nordeste", "MA": "Nordeste", "PB": "Nordeste",
    "PE": "Nordeste", "PI": "Nordeste", "RN": "Nordeste", "SE": "Nordeste",
    "DF": "Centro-Oeste", "GO": "Centro-Oeste", "MT": "Centro-Oeste", "MS": "Centro-Oeste",
    "ES": "Sudeste", "MG": "Sudeste", "RJ": "Sudeste", "SP": "Sudeste",
    "PR": "Sul", "RS": "Sul", "SC": "Sul",
}
REGIOES = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"]


def snapshot(leg: int, data: str | None = None) -> Path:
    """Pasta do snapshot pedido, ou a mais recente da legislatura."""
    base = BRUTO / str(leg)
    if data:
        return base / data
    return sorted(p for p in base.iterdir() if p.is_dir())[-1]
