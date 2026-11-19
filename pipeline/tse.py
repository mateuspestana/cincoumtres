"""Baixa as candidaturas de uma eleição nos dados abertos do TSE e guarda só os deputados federais.

O arquivo do TSE (consulta_cand_<ano>.zip) traz o CPF de cada candidato. O CPF é usado só aqui dentro,
para cruzar com a Câmara; o parquet gerado fica em pipeline/tse/, fora do controle de versão.

Uso: python tse.py [--se-faltar] [ano ...]   (padrão: os anos das legislaturas ativas em config.py)
Com --se-faltar, pula os anos cujo parquet já existe.
Autor: Matheus C. Pestana.
"""
import io
import sys
import zipfile

import pandas as pd
import requests

from config import LEGISLATURAS, PASTA_TSE

URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_{ano}.zip"
COLUNAS = [
    "ANO_ELEICAO", "SG_UF", "DS_CARGO", "SQ_CANDIDATO", "NR_CANDIDATO", "NM_CANDIDATO", "NM_URNA_CANDIDATO",
    "NR_CPF_CANDIDATO", "DS_SITUACAO_CANDIDATURA", "SG_PARTIDO", "SG_FEDERACAO", "NM_FEDERACAO",
    "DS_GENERO", "DS_COR_RACA", "DS_SIT_TOT_TURNO", "SQ_ORDEM_SUPLENCIA",
]


def baixar(ano: int) -> None:
    PASTA_TSE.mkdir(exist_ok=True)
    r = requests.get(URL.format(ano=ano), timeout=300)
    r.raise_for_status()
    (PASTA_TSE / f"consulta_cand_{ano}.zip").write_bytes(r.content)
    with zipfile.ZipFile(io.BytesIO(r.content)) as z:
        nome = next(n for n in z.namelist() if n.endswith("_BRASIL.csv"))
        with z.open(nome) as f:
            t = pd.read_csv(f, sep=";", encoding="latin1", dtype=str, na_values=["#NULO", "#NULO#", "#NE"])
    t = t[t.DS_CARGO.str.upper() == "DEPUTADO FEDERAL"]
    t = t[[c for c in COLUNAS if c in t.columns]]
    t.to_parquet(PASTA_TSE / f"candidatos_{ano}.parquet", index=False)
    eleitos = t.DS_SIT_TOT_TURNO.str.startswith("ELEITO", na=False).sum()
    print(f"{ano}: {len(t)} candidaturas a deputado federal, {eleitos} eleitos -> {PASTA_TSE}/candidatos_{ano}.parquet")


if __name__ == "__main__":
    se_faltar = "--se-faltar" in sys.argv
    anos = [int(a) for a in sys.argv[1:] if a.isdigit()] or sorted({c["ano_eleicao"] for c in LEGISLATURAS.values() if c["ativa"]})
    for ano in anos:
        if se_faltar and (PASTA_TSE / f"candidatos_{ano}.parquet").exists():
            continue
        baixar(ano)
