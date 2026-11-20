"""Períodos de exercício, cruzamento com o TSE e casamento titular -> suplente.

As regras vêm de um estudo anterior sobre os suplentes de 2022:
- exercício: só se entra por evento de entrada (posse, reassunção, efetivação, restabelecimento,
  "torna-se titular"); os demais "Exercício" fora de exercício vão para IGNORADOS;
- dias: intervalos meio-abertos por data [início, fim); quem segue em exercício vai até o corte;
- quem substituiu quem: saída de titular da mesma UF e mesmo partido/federação da eleição,
  até JANELA_SUBST dias antes da posse do suplente, cada saída usada uma vez.

Autor: Matheus C. Pestana.
"""
import datetime as dt
import json
from pathlib import Path

import pandas as pd

from config import LEGISLATURAS

JANELA_SUBST = 10

COND = {"Titular": "titular", "ELEITO": "titular", "Suplente": "suplente", "EFETIVADO": "efetivado"}
JUDICIAL = ("recontagem", "retotaliza")
ENTRADA = ("Entrada", "Posse", "Efetivação", "Restabelecimento", "Torna-se titular")
MOTIVOS = {
    "Secretário de Estado": "Secretário de Estado",
    "Secretário de Prefeitura": "Secretário municipal (capital)",
    "Ministro de Estado": "Ministro de Estado",
    "Afastamento Conjunto Consecutivo": "Licença (afastamento conjunto)",
    "Licença para Tratamento": "Licença para tratamento de saúde",
    "Afastamento de Suplente": "Volta do titular",
    "Renúncia": "Renúncia",
    "Falecimento": "Falecimento",
    "Perda de Mandato": "Perda de mandato",
    "Suspensão": "Suspensão",
    "Recontagem": "Recontagem/retotalização",
    "retotalização": "Recontagem/retotalização",
    "Efetivação": "Efetivação",
}


def motivo(desc: str) -> str:
    for chave, rotulo in MOTIVOS.items():
        if chave in (desc or ""):
            return rotulo
    return "Outro"


def eventos(dep: dict, leg: int) -> list[dict]:
    """Eventos da legislatura com situação preenchida, em ordem cronológica."""
    hs = [h for h in dep["historico"] if h["idLegislatura"] == leg and h["situacao"]]
    return sorted(hs, key=lambda h: h["dataHora"])


def periodos(id_dep: int, hs: list[dict], corte: dt.date, ignorados: list) -> list[dict]:
    """Segmentos contínuos de exercício com a mesma condição (titular/suplente/efetivado)."""
    out, aberto, cond_ant = [], None, None
    for h in hs:
        t = dt.datetime.fromisoformat(h["dataHora"])
        desc = h["descricaoStatus"] or ""
        em_exercicio = h["situacao"] == "Exercício"
        cond = COND.get(h["condicaoEleitoral"], cond_ant)
        if em_exercicio and aberto is None and not any(e in desc for e in ENTRADA):
            ignorados.append({"id": id_dep, "dataHora": h["dataHora"], "descricao": desc})
            continue
        if aberto and (not em_exercicio or cond != aberto["condicao"]):
            # o evento de término cai no último dia da legislatura, que ainda conta como exercício
            aberto["fim"] = t.date() + (dt.timedelta(days=1) if "Término da Legislatura" in desc else dt.timedelta(0))
            aberto["motivo_saida"] = desc
            out.append(aberto)
            aberto = None
        if em_exercicio and aberto is None:
            aberto = {"id": id_dep, "condicao": cond, "inicio": t.date(), "inicio_hora": t,
                      "desc_entrada": desc, "partido_entrada": h["siglaPartido"],
                      "fim": None, "motivo_saida": ""}
        cond_ant = cond
    if aberto:
        out.append(aberto)
    for p in out:
        p["em_exercicio_no_corte"] = p["fim"] is None
        fim = p["fim"] or corte + dt.timedelta(days=1)
        p["fim_excl"] = fim
        p["dias"] = max((fim - p["inicio"]).days, 1)
    return out


def saidas_titulares(deps: dict, cpf_chave: dict, leg: int) -> pd.DataFrame:
    """Momentos em que um titular deixa o exercício (licença, vacância, suspensão, recontagem)."""
    linhas = []
    for id_dep, dep in deps.items():
        em_ex, cond = False, None
        for h in eventos(dep, leg):
            cond = COND.get(h["condicaoEleitoral"], cond)
            desc = h["descricaoStatus"] or ""
            if em_ex and h["situacao"] != "Exercício" and cond == "titular" or "Afastamento de titular" in desc:
                linhas.append({"id_titular": int(id_dep), "data": dt.datetime.fromisoformat(h["dataHora"]),
                               "uf": dep["detalhe"]["ultimoStatus"]["siglaUf"],
                               "chave": cpf_chave.get(dep["detalhe"]["cpf"]),
                               "nome_titular": dep["detalhe"]["ultimoStatus"]["nomeEleitoral"],
                               "situacao": h["situacao"], "motivo": motivo(desc), "descricao": desc})
            if h["situacao"] == "Exercício" and cond == "titular":
                em_ex = True
            elif h["situacao"] != "Exercício":
                em_ex = False
    return pd.DataFrame(linhas)


def casar_substituicoes(per_sup: pd.DataFrame, saidas: pd.DataFrame) -> pd.DataFrame:
    """Para cada entrada de suplente, o titular que saiu (mesma regra do estudo SUPLENTES)."""
    usadas, linhas = set(), []
    for _, p in per_sup.sort_values("inicio_hora").iterrows():
        cand = saidas[(saidas.uf == p.uf) & (saidas.data <= p.inicio_hora + pd.Timedelta(days=1))
                      & (saidas.data >= p.inicio_hora - pd.Timedelta(days=JANELA_SUBST))]
        cand = cand[~cand.index.isin(usadas)]
        mesma = cand[cand.chave == p.chave]
        escolha, regra = None, "sem candidato"
        if len(mesma) >= 1:
            mesma = mesma.assign(dist=(mesma.data - p.inicio_hora).abs()).sort_values("dist")
            escolha, regra = mesma.index[0], "partido/federação" if len(mesma) == 1 else "partido/federação, mais próxima"
        elif len(cand) == 1:
            escolha, regra = cand.index[0], "única saída na UF (partido diferente)"
        elif len(cand) > 1:
            regra = "ambíguo"
        linha = {"id": p.id, "inicio": p.inicio, "inicio_hora": p.inicio_hora, "regra_casamento": regra}
        if escolha is not None:
            usadas.add(escolha)
            s = saidas.loc[escolha]
            linha.update(id_titular=s.id_titular, nome_titular=s.nome_titular, data_saida_titular=s.data,
                         motivo=s.motivo, descricao_saida=s.descricao)
        linhas.append(linha)
    return pd.DataFrame(linhas)


def ler_tse(caminho: Path) -> pd.DataFrame:
    t = pd.read_parquet(caminho)
    t = t[t.DS_CARGO.str.upper() == "DEPUTADO FEDERAL"].copy()
    # CPFs com dois registros (pedido indeferido + pedido válido): fica o que tem situação de totalização
    t = (t.assign(_ok=t.DS_SIT_TOT_TURNO.notna(), _apto=t.DS_SITUACAO_CANDIDATURA.eq("APTO"))
         .sort_values(["_ok", "_apto"], ascending=False))
    t = pd.concat([t[t.NR_CPF_CANDIDATO.notna()].drop_duplicates("NR_CPF_CANDIDATO"),
                   t[t.NR_CPF_CANDIDATO.isna()]]).drop(columns=["_ok", "_apto"])
    # o layout atual do TSE não traz mais a ordem de suplência; quando vier, aparece na ficha
    t["ordem"] = pd.to_numeric(t["SQ_ORDEM_SUPLENCIA"], errors="coerce") if "SQ_ORDEM_SUPLENCIA" in t else float("nan")
    t["chave"] = t.SG_FEDERACAO.fillna(t.SG_PARTIDO)
    return t


def partidos(id_dep: int, dep: dict, leg: int, inicio: dt.date, corte: dt.date) -> list[dict]:
    """Linha do tempo partidária: intervalos [início, fim) por sigla, a partir do histórico."""
    hs = sorted((h for h in dep["historico"] if h["idLegislatura"] == leg and h["siglaPartido"]),
                key=lambda h: h["dataHora"])
    out = []
    for h in hs:
        d = max(dt.datetime.fromisoformat(h["dataHora"]).date(), inicio)
        sig = h["siglaPartido"]
        com_evento = "Alteração de partido" in (h["descricaoStatus"] or "")
        if out and out[-1]["sigla"] == sig:
            continue
        if out:
            out[-1]["fim"] = d
        out.append({"id": id_dep, "sigla": sig, "inicio": d, "fim": None,
                    "com_evento": com_evento or not out})
    fim_final = corte + dt.timedelta(days=1)
    for p in out:
        p["fim"] = p["fim"] or fim_final
    return [p for p in out if p["fim"] > p["inicio"]]


def cadeiras_do_tse(t: pd.DataFrame) -> dict:
    """Cadeiras por UF contadas nos eleitos da eleição (para legislaturas sem tabela fixa, como a 58ª)."""
    eleitos = t[t.DS_SIT_TOT_TURNO.str.startswith("ELEITO", na=False)]
    return {uf: int(n) for uf, n in eleitos.groupby("SG_UF").size().items()}


def montar(leg: int, snap: Path) -> dict:
    cfg = dict(LEGISLATURAS[leg])
    corte = min(dt.date.fromisoformat(snap.name), cfg["fim"])  # legislatura encerrada: o corte é o último dia dela
    deps = {int(k): v for k, v in json.loads((snap / "deputados.json").read_text()).items()}
    lista = json.loads((snap / "lista.json").read_text())
    fotos = {d["id"]: d["urlFoto"] for d in lista}

    t = ler_tse(cfg["tse"])
    if cfg["cadeiras"] is None:
        cfg["cadeiras"] = cadeiras_do_tse(t)
    else:
        # conferência: os eleitos do TSE batem com a tabela? (só avisa; o TSE pode estar incompleto)
        tse = cadeiras_do_tse(t)
        difs = {uf: (tse.get(uf, 0), n) for uf, n in cfg["cadeiras"].items() if tse.get(uf, 0) != n}
        if difs:
            print(f"aviso: eleitos no TSE diferem das cadeiras por UF (TSE, tabela): {difs}")
    cpf_chave = dict(zip(t.NR_CPF_CANDIDATO, t.chave))

    ignorados: list[dict] = []
    per, cam, parts = [], [], []
    for id_dep, dep in deps.items():
        hs = eventos(dep, leg)
        ps = periodos(id_dep, hs, corte, ignorados)
        per += ps
        parts += partidos(id_dep, dep, leg, cfg["inicio"], corte)
        judicial = [h for h in hs if any(j in (h["descricaoStatus"] or "").lower() for j in JUDICIAL)]
        primeira = next((p for p in ps), None)
        titular_original = bool(primeira and primeira["condicao"] == "titular"
                                and not any(h["dataHora"] <= primeira["inicio_hora"].isoformat() for h in judicial))
        d = dep["detalhe"]
        cam.append({"id": id_dep, "cpf": d["cpf"], "nome": d["ultimoStatus"]["nomeEleitoral"],
                    "nome_civil": d["nomeCivil"], "sexo": d["sexo"], "uf": d["ultimoStatus"]["siglaUf"],
                    "foto": fotos.get(id_dep) or d["ultimoStatus"].get("urlFoto"),
                    "titular_original": titular_original,
                    "titular_por_decisao": any(p["condicao"] == "titular" for p in ps) and not titular_original,
                    "evento_judicial": "; ".join(f'{h["dataHora"][:10]} {h["descricaoStatus"]}' for h in judicial)})
    per = pd.DataFrame(per)
    cam = pd.DataFrame(cam)
    parts = pd.DataFrame(parts)

    m = cam.merge(t[t.NR_CPF_CANDIDATO.notna()], left_on="cpf", right_on="NR_CPF_CANDIDATO", how="left", validate="1:1")
    assert m.NR_CPF_CANDIDATO.notna().all(), "deputado da legislatura sem candidatura no TSE"
    assert (m.uf == m.SG_UF).all(), "UF da Câmara diferente da UF da candidatura"

    per = per.merge(m[["id", "cpf", "uf", "chave"]], on="id", validate="m:1")

    # casamento de referência, idêntico ao do estudo SUPLENTES (para conferir as ligações de alta confiança)
    sup = per[per.condicao.isin(["suplente", "efetivado"])].sort_values(["id", "inicio_hora"])
    fim_ant = sup.groupby("id").fim.shift()
    convoc = sup[~((sup.condicao == "efetivado") & (fim_ant == sup.inicio))]
    saidas = saidas_titulares(deps, cpf_chave, leg)
    subst = casar_substituicoes(convoc, saidas)

    return {"leg": leg, "cfg": cfg, "corte": corte, "per": per, "cam": m, "partidos": parts,
            "subst": subst, "saidas": saidas, "ignorados": pd.DataFrame(ignorados), "tse": t}
