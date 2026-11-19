"""Grava os dados do site em site/public/data/<leg>/.

Datas viram índices de dia a partir do início da legislatura (dia 0 = posse) e todo intervalo é
meio-aberto [início, fim). Nenhum CPF é exportado; o identificador é o id da Câmara.

Arquivos: meta.json, pessoas.json, vagas.json, serie.json e vagas.csv (para baixar).
Autor: Matheus C. Pestana.
"""
import csv
import datetime as dt
import json

import pandas as pd

from config import LEGISLATURAS, PASTA, REGIOES, SAIDA_SITE, UF_PARA_REGIAO
from periodos import motivo

COND = {"titular": "t", "suplente": "s", "efetivado": "e"}
CONF = {"alta": "a", "media": "m", "baixa": "b"}
REGRAS = {
    "partido/federação": "pf", "partido/federação, mais próxima": "pfp", "volta do titular": "vt",
    "remanejado na lista do partido": "rl", "saída de suplente, partido/federação": "ss",
    "recontagem/retotalização": "rc", "efetivação": "ef", "posse em vaga sem titular original": "sd",
    "vaga livre, mesma chave": "vm", "vaga livre na UF": "vu", "vaga livre": "vl",
    "única saída na UF (partido diferente)": "us", "volta à vaga que já foi dele": "vp",
    "volta com a vaga ocupada": "vo",
}
REGRAS_TEXTO = {
    "pf": "O titular da mesma UF e do mesmo partido ou federação saiu até 10 dias antes da posse.",
    "pfp": "Havia mais de uma saída do mesmo partido ou federação na janela; ficou a mais próxima da posse.",
    "vt": "O suplente deixou a Câmara no mesmo dia em que este titular reassumiu.",
    "rl": "O dono da vaga voltou e o suplente passou para outra vaga da mesma lista, que tinha acabado de vagar.",
    "ss": "Outro suplente do mesmo partido ou federação saiu até 10 dias antes.",
    "rc": "Entrou por recontagem ou retotalização no lugar de quem saiu pela mesma decisão.",
    "ef": "Já estava em exercício e foi efetivado: a vaga passou a ser dele.",
    "sd": "Vaga cujo eleito não tomou posse no início da legislatura.",
    "vm": "Sem saída na janela; ficou numa vaga livre do mesmo partido ou federação.",
    "vu": "Sem saída na janela nem vaga livre da mesma lista; ficou numa vaga livre da UF.",
    "vl": "Sem saída na janela; ficou numa vaga livre da UF.",
    "us": "Única saída na UF na janela, de outro partido.",
    "vp": "Tinha perdido a vaga por decisão judicial e voltou a ela.",
    "vo": "O registro da Câmara mantém o dono da vaga e quem a ocupava em exercício ao mesmo tempo; o dono ficou numa vaga livre da UF.",
}
MOTIVOS = {
    "Ministro de Estado": "min", "Secretário de Estado": "see", "Secretário municipal (capital)": "sem",
    "Licença (afastamento conjunto)": "lic", "Licença para tratamento de saúde": "lic",
    "Volta do titular": "vol", "Renúncia": "ren", "Falecimento": "fal", "Perda de mandato": "per",
    "Suspensão": "sus", "Recontagem/retotalização": "rec", "Efetivação": "efe", "Outro": "out",
}
MOTIVOS_TEXTO = {
    "min": "Ministro de Estado", "see": "Secretário de Estado", "sem": "Secretário municipal",
    "lic": "Licença", "vol": "Volta do titular", "ren": "Renúncia", "fal": "Falecimento",
    "per": "Perda de mandato", "sus": "Suspensão", "rec": "Recontagem ou retotalização",
    "efe": "Efetivação", "out": "Outro", "rem": "Remanejado na lista",
}
# anel externo da concha: para onde foi quem está fora da cadeira
DESTINOS = {"min": "esp", "see": "gov", "sem": "pre", "lic": "lic", "sus": "lic",
            "ren": "def", "fal": "def", "per": "def", "rec": "def", "out": "lic"}
DESTINOS_TEXTO = {"esp": "Ministérios", "gov": "Governos estaduais", "pre": "Prefeituras de capital",
                  "lic": "Licença", "def": "Saída definitiva"}
FEDERACOES = {"PT/PC do B/PV": "Federação Brasil da Esperança", "PSOL/REDE": "Federação PSOL Rede",
              "PSDB/CIDADANIA": "Federação PSDB Cidadania"}


def gravar(caminho, obj):
    caminho.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")))


def exportar(base: dict, res: dict, verif: dict) -> dict:
    leg, cfg, corte = base["leg"], base["cfg"], base["corte"]
    inicio = cfg["inicio"]
    per, vagas, cam = res["per"], res["vagas"], base["cam"].set_index("id")
    n_dias = (corte - inicio).days + 1
    fim_aberto = n_dias

    def di(d):
        return min((d - inicio).days, fim_aberto) if d is not None else fim_aberto

    saida = SAIDA_SITE / str(leg)
    saida.mkdir(parents=True, exist_ok=True)
    fus = pd.read_csv(PASTA / "fusoes.csv").set_index("sigla_origem").sigla_atual.to_dict()

    # --- vagas: numeração dentro da UF agrupando por chave de partido do primeiro dono ---
    ufs = sorted(cfg["cadeiras"], key=lambda u: (REGIOES.index(UF_PARA_REGIAO[u]), u))
    grupos: dict[str, list] = {u: [] for u in ufs}
    for v in vagas:
        grupos[v.uf].append(v)
    lista_vagas, linhas_csv = [], []
    for uf in ufs:
        vs = grupos[uf]
        tam = pd.Series([cam.at[v.donos[0][0], "chave"] if v.donos else "" for v in vs]).value_counts()

        def ordem(v):
            dono = v.donos[0][0] if v.donos else None
            ch = cam.at[dono, "chave"] if dono else "~"
            return (-tam.get(ch, 0), ch, cam.at[dono, "nome"] if dono else "~")
        for n, v in enumerate(sorted(vs, key=ordem), start=1):
            vid = f"{uf}-{n:02d}"
            segs = []
            for s in v.segs:
                r = per.loc[s.idx]
                fim_motivo = MOTIVOS[motivo(r.motivo_saida)] if s.fim == r.fim_excl and r.motivo_saida else (
                    "rem" if s.fim != r.fim_excl else None)
                segs.append([int(s.pid), di(s.ini), di(s.fim), COND[r.condicao],
                             CONF.get(s.confianca), REGRAS.get(s.regra), fim_motivo])
                linhas_csv.append({"vaga": vid, "uf": uf, "id_camara": int(s.pid), "nome": cam.at[s.pid, "nome"],
                                   "condicao": r.condicao, "inicio": s.ini.isoformat(),
                                   "fim": "" if s.fim > corte else s.fim.isoformat(),
                                   "confianca": s.confianca or "", "regra": s.regra or "",
                                   "motivo_saida": motivo(r.motivo_saida) if r.motivo_saida else ""})
            # ausências do dono: intervalos em que a vaga é dele e ele não está sentado nela
            aus = []
            for pid, a, b in v.donos:
                b = b or corte + dt.timedelta(days=1)
                meus = sorted((s for s in v.segs if s.pid == pid and s.ini < b and s.fim > a), key=lambda s: s.ini)
                cursor, mot = a, None
                for s in meus:
                    if s.ini > cursor and mot:
                        aus.append([int(pid), di(cursor), di(s.ini), mot])
                    cursor = max(cursor, s.fim)
                    r = per.loc[s.idx]
                    mot = MOTIVOS[motivo(r.motivo_saida)] if r.motivo_saida else None
                if cursor < b and mot and cursor <= corte:
                    aus.append([int(pid), di(cursor), di(b), mot])
            lista_vagas.append({"id": vid, "uf": uf, "n": n,
                                "donos": [[int(p), di(a), di(b)] for p, a, b in v.donos],
                                "segs": segs, "aus": aus})

    # --- pessoas ---
    parts = base["partidos"]
    sup_dias = per[per.condicao != "titular"].groupby("id").dias.sum()
    tit_dias = per[per.condicao == "titular"].groupby("id").dias.sum()
    pessoas = []
    for pid, c in cam.iterrows():
        tipo = "T" if c.titular_original else ("J" if c.titular_por_decisao or c.DS_SIT_TOT_TURNO == "NÃO ELEITO" else "S")
        pp = parts[parts.id == pid].sort_values("inicio")
        pessoas.append({
            "id": int(pid), "nome": c.nome, "civil": c.nome_civil.title() if isinstance(c.nome_civil, str) else None,
            "uf": c.uf, "foto": c.foto, "sexo": c.sexo, "tipo": tipo,
            "p22": c.SG_PARTIDO, "ch": c.chave, "fed": FEDERACOES.get(c.SG_FEDERACAO) if isinstance(c.SG_FEDERACAO, str) else None,
            "ordem": int(c.ordem) if pd.notna(c.ordem) else None,
            "sit": c.DS_SIT_TOT_TURNO, "raca": c.DS_COR_RACA, "genero": c.DS_GENERO,
            "partidos": [[p.sigla, di(p.inicio), di(p.fim)] for p in pp.itertuples()],
            "dt": int(tit_dias.get(pid, 0)), "ds": int(sup_dias.get(pid, 0)),
        })
    pessoas.sort(key=lambda p: p["nome"])

    # --- série diária ---
    tit, sup, aus_d = [0] * n_dias, [0] * n_dias, {k: [0] * n_dias for k in DESTINOS_TEXTO}
    for v in lista_vagas:
        for pid, a, b, cond, *_ in v["segs"]:
            alvo = tit if cond == "t" else sup
            for d in range(a, min(b, n_dias)):
                alvo[d] += 1
        for pid, a, b, mot in v["aus"]:
            for d in range(a, min(b, n_dias)):
                aus_d[DESTINOS.get(mot, "lic")][d] += 1
    total = sum(cfg["cadeiras"].values())
    serie = {"titulares": tit, "suplentes": sup, "vazias": [total - a - b for a, b in zip(tit, sup)], "fora": aus_d}

    # --- marcos para os capítulos da home ---
    pico = max(range(n_dias), key=lambda d: (sup[d], -d))
    queda = []
    for d in range(30, n_dias):
        queda.append((sup[d - 30] - sup[d], d))
    quedas = []
    for q, d in sorted(queda, reverse=True):
        if all(abs(d - e) > 90 for _, e in quedas):
            quedas.append((q, d))
        if len(quedas) == 3:
            break
    trocas = parts.sort_values("inicio").groupby("id").sigla.count() - 1
    janela = parts[(parts.inicio >= dt.date(leg_ano := inicio.year + 3, 3, 1)) & (parts.inicio < dt.date(leg_ano, 5, 1))
                   & parts.com_evento]

    sub = base["subst"]
    motivos_casados = sub[sub.id_titular.notna()].motivo.value_counts().to_dict()
    EXECUTIVO = ("Secretário de Estado", "Secretário municipal (capital)", "Ministro de Estado")
    executivo = sum(v for k, v in motivos_casados.items() if k in EXECUTIVO)
    # as trocas contam vezes, não pessoas: quem saiu, voltou e saiu de novo aparece duas vezes
    casadas = sub[sub.id_titular.notna()]
    pessoas_trocas = {"titulares": int(casadas.id_titular.nunique()), "suplentes": int(casadas.id.nunique()),
                      "titulares_executivo": int(casadas[casadas.motivo.isin(EXECUTIVO)].id_titular.nunique())}
    confs = pd.Series([s[4] for v in lista_vagas for s in v["segs"] if s[4]]).value_counts().to_dict()

    meta = {
        "leg": leg, "inicio": inicio.isoformat(), "fim": cfg["fim"].isoformat(), "corte": corte.isoformat(),
        "dias": n_dias, "dias_total": (cfg["fim"] - inicio).days + 1, "cadeiras": total,
        "ufs": [{"uf": u, "regiao": UF_PARA_REGIAO[u], "cadeiras": cfg["cadeiras"][u]} for u in ufs],
        "regioes": REGIOES, "regras": REGRAS_TEXTO, "motivos": MOTIVOS_TEXTO, "destinos": DESTINOS_TEXTO,
        "fusoes": fus, "federacoes": FEDERACOES,
        "numeros": {
            "pessoas": len(pessoas), "titulares_originais": int(cam.titular_original.sum()),
            "suplentes_que_exerceram": int((cam.index.isin(per[per.condicao != "titular"].id)).sum()),
            "convocacoes": int(len(sub)), "casadas_estudo": int(sub.id_titular.notna().sum()),
            "motivos_casados": motivos_casados, "executivo": executivo, "pessoas_trocas": pessoas_trocas,
            "pico_suplentes": sup[pico], "pico_dia": pico, "suplentes_no_corte": sup[-1],
            "vazias_max": max(serie["vazias"]), "vazias_max_dia": serie["vazias"].index(max(serie["vazias"])),
            "quedas": [{"dia": d, "menos": q} for q, d in quedas],
            "efetivados": int((per.condicao == "efetivado").groupby(per.id).any().sum()),
            "judiciais": int(sum(1 for p in pessoas if p["tipo"] == "J")),
            "trocaram_partido": int((trocas > 0).sum()), "trocas_partido": int(trocas.clip(lower=0).sum()),
            "trocas_janela": int(len(janela)), "segmentos": sum(len(v["segs"]) for v in lista_vagas),
            "confianca": confs, "remanejos": verif["remanejos"],
        },
        "gerado_em": dt.datetime.now().isoformat(timespec="seconds"),
        "fontes": ["Câmara dos Deputados, API de dados abertos (dadosabertos.camara.leg.br)",
                   f"TSE, candidaturas de {cfg['ano_eleicao']} (dadosabertos.tse.jus.br)"],
    }

    gravar(saida / "meta.json", meta)
    gravar(saida / "pessoas.json", pessoas)
    gravar(saida / "vagas.json", lista_vagas)
    gravar(saida / "serie.json", serie)
    with open(saida / "vagas.csv", "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=list(linhas_csv[0]))
        w.writeheader()
        w.writerows(linhas_csv)

    # índice das legislaturas para o seletor do site
    indice = [{"leg": k, "inicio": c["inicio"].isoformat(), "fim": c["fim"].isoformat(),
               "disponivel": (SAIDA_SITE / str(k) / "meta.json").exists()} for k, c in LEGISLATURAS.items()]
    gravar(SAIDA_SITE / "legislaturas.json", indice)
    return meta
