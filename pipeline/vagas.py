"""Ocupação das cadeiras: distribui cada período de exercício nas vagas da UF.

A API da Câmara não diz em que vaga cada pessoa senta. A vaga é inferida, UF por UF, em ordem
cronológica de posse:
1. semente: cada titular original abre a própria vaga e é o dono dela; a vaga que sobra na UF
   (quem não tomou posse como titular no início) fica com o primeiro que sentar nela;
2. dono que volta (reassunção) senta na própria vaga. Se ela estiver com um suplente da mesma
   chave de partido/federação e outra vaga dessa chave tiver acabado de vagar, o suplente é
   remanejado para ela: dentro de uma lista partidária os suplentes são intercambiáveis, e quem
   sai quando um titular volta é o de pior colocação, não necessariamente o que entrou no lugar dele;
3. efetivação de quem já estava em exercício: mesma vaga, e a vaga troca de dono;
4. convocação de suplente, nesta ordem: a vaga do titular cuja volta encerrou o período (o suplente
   sai no dia em que ele reassume); a vaga do titular casado pelo estudo SUPLENTES; a vaga de um
   suplente da mesma chave que saiu na janela (todas de confiança alta); uma vaga livre da mesma
   chave (média); qualquer vaga livre da UF (baixa);
5. titular por recontagem/retotalização: a vaga de quem saiu por decisão judicial na janela
   (alta), com troca de dono; quem perdeu a vaga e volta a ela depois retoma a mesma (alta).

A chave de partido é sempre a da eleição (TSE), nunca o partido atual na Câmara: a suplência
pertence à lista pela qual o titular foi eleito.

Autor: Matheus C. Pestana.
"""
import datetime as dt
from dataclasses import dataclass, field

import pandas as pd

from periodos import JANELA_SUBST, motivo

UM_DIA = dt.timedelta(days=1)
JANELA = dt.timedelta(days=JANELA_SUBST)


@dataclass
class Seg:
    idx: int            # linha em `per`
    pid: int
    ini: dt.date
    fim: dt.date        # exclusivo
    confianca: str | None = None
    regra: str | None = None


@dataclass
class Vaga:
    uf: str
    donos: list = field(default_factory=list)   # [id, início, fim_excl|None]
    segs: list = field(default_factory=list)

    def dono(self):
        return self.donos[-1][0] if self.donos else None

    def trocar_dono(self, pid, data):
        if self.donos and self.donos[-1][0] == pid:
            return
        if self.donos:
            self.donos[-1][2] = data
        self.donos.append([pid, data, None])

    def livre(self, d):
        return not self.segs or self.segs[-1].fim <= d


def pares_de_volta(per: pd.DataFrame) -> dict:
    """Suplente que sai ("Afastamento de Suplente") no dia em que um titular da UF reassume."""
    voltas = per[(per.condicao == "titular") & per.desc_entrada.str.contains("Reassunção", na=False)]
    sai = per[(per.condicao != "titular") & per.motivo_saida.str.contains("Afastamento de Suplente", na=False)]
    out, usadas = {}, set()
    for idx, r in sai.sort_values("fim_excl").iterrows():
        c = voltas[(voltas.uf == r.uf) & (voltas.inicio == r.fim_excl) & ~voltas.index.isin(usadas)]
        mesma = c[c.chave == r.chave]
        if len(mesma):
            c = mesma
        elif len(c) != 1:
            continue
        usadas.add(c.index[0])
        out[idx] = int(c.iloc[0].id)
    return out


def distribuir(base: dict) -> dict:
    per = base["per"].sort_values(["inicio_hora", "id"]).copy()
    cam = base["cam"].set_index("id")
    chave = cam.chave.to_dict()
    inicio_leg = base["cfg"]["inicio"]
    casado = {(r.id, r.inicio): r for r in base["subst"].itertuples() if pd.notna(getattr(r, "id_titular", None))}
    volta_de = pares_de_volta(per)

    vagas: list[Vaga] = []
    conflitos, remanejos, sobrepostos = [], [], []

    for uf, k in base["cfg"]["cadeiras"].items():
        pu = per[per.uf == uf]
        vs = [Vaga(uf) for _ in range(k)]
        vagas += vs
        dono_de: dict[int, int] = {}
        ultima: dict[int, int] = {}

        originais = pu[pu.id.map(cam.titular_original) & ~pu.id.duplicated()]
        assert len(originais) <= k, f"{uf}: mais titulares originais que cadeiras"
        sem_dono = set(range(len(originais), k))
        for i, pid in enumerate(originais.id):
            dono_de[pid] = i
            vs[i].trocar_dono(pid, inicio_leg)

        def ocupar(r, idx, i, confianca=None, regra=None):
            vs[i].segs.append(Seg(idx, r.id, r.inicio, r.fim_excl, confianca, regra))
            ultima[r.id] = i

        def assumir(pid, i, d):
            antigo = vs[i].dono()
            vs[i].trocar_dono(pid, d)
            if antigo is not None and dono_de.get(antigo) == i:
                del dono_de[antigo]
            dono_de[pid] = i
            sem_dono.discard(i)

        def saida(i):
            """(pessoa, data de saída, motivo, linha) do último segmento da vaga."""
            if not vs[i].segs:
                return None
            s = vs[i].segs[-1]
            return s.pid, s.fim, motivo(per.at[s.idx, "motivo_saida"]), s.idx

        def livre_qualquer(r):
            livres = [i for i in range(k) if vs[i].livre(r.inicio)]
            if not livres:
                return None, None
            virgens = [i for i in livres if i in sem_dono and not vs[i].segs]
            if virgens:
                return virgens[0], "sem_dono"
            mesma = [i for i in livres if vs[i].dono() is not None and chave[vs[i].dono()] == r.chave]
            pool, conf = (mesma, "media") if mesma else (livres, "baixa")
            return max(pool, key=lambda j: vs[j].segs[-1].fim if vs[j].segs else dt.date.min), conf

        for idx, r in pu.iterrows():
            # 2. dono que volta
            if r.id in dono_de:
                i = dono_de[r.id]
                if not vs[i].livre(r.inicio):
                    s = vs[i].segs[-1]
                    destino = [j for j in range(k) if j != i and vs[j].livre(r.inicio)
                               and vs[j].segs and vs[j].segs[-1].fim == r.inicio
                               and chave[s.pid] == chave[vs[j].segs[-1].pid]]
                    if s.pid != r.id and chave[s.pid] == r.chave and destino:
                        j = destino[0]
                        novo = Seg(s.idx, s.pid, r.inicio, s.fim, "alta", "remanejado na lista do partido")
                        s.fim = r.inicio
                        vs[j].segs.append(novo)
                        ultima[s.pid] = j
                        remanejos.append({"id": s.pid, "uf": uf, "data": r.inicio, "de_vaga": i, "para_vaga": j})
                if vs[i].livre(r.inicio):
                    ocupar(r, idx, i)
                    continue
                # o registro da Câmara deixa o dono e quem ocupa a vaga dele em exercício ao mesmo tempo
                # (acontece na 56ª, quando o afastamento do suplente é lançado depois da volta do titular).
                # Se a UF tem outra vaga livre, o dono senta nela, com confiança baixa.
                j, _ = livre_qualquer(r)
                if j is not None:
                    ocupar(r, idx, j, "baixa", "volta com a vaga ocupada")
                    sobrepostos.append({"id": r.id, "uf": uf, "inicio": r.inicio, "ocupante": vs[i].segs[-1].pid})
                    continue
                conflitos.append({"id": r.id, "uf": uf, "inicio": r.inicio, "tipo": "dono com vaga ocupada",
                                  "ocupante": vs[i].segs[-1].pid})
                continue

            # 3. efetivação de quem já estava em exercício
            if r.condicao == "efetivado" and r.id in ultima:
                i = ultima[r.id]
                s = vs[i].segs[-1]
                if s.pid == r.id and s.fim == r.inicio:
                    assumir(r.id, i, r.inicio)
                    ocupar(r, idx, i, "alta", "efetivação")
                    continue

            # 5. titular por recontagem/retotalização
            if r.condicao == "titular":
                cands = []
                for i in range(k):
                    s = saida(i)
                    if s and vs[i].livre(r.inicio) and s[2] == "Recontagem/retotalização" \
                            and r.inicio - JANELA <= s[1] <= r.inicio + UM_DIA:
                        cands.append((abs((s[1] - r.inicio).days), i))
                antigas = [i for i in range(k) if vs[i].livre(r.inicio) and any(d[0] == r.id for d in vs[i].donos)]
                if cands:
                    i, conf, regra = min(cands)[1], "alta", "recontagem/retotalização"
                elif antigas:
                    i, conf, regra = antigas[0], "alta", "volta à vaga que já foi dele"
                else:
                    i, conf = livre_qualquer(r)
                    regra = "posse em vaga sem titular original" if conf == "sem_dono" else "vaga livre"
                    conf = "alta" if conf == "sem_dono" else conf
                if i is None:
                    conflitos.append({"id": r.id, "uf": uf, "inicio": r.inicio, "tipo": "sem vaga livre"})
                    continue
                assumir(r.id, i, r.inicio)
                ocupar(r, idx, i, conf, regra)
                continue

            # 4. convocação de suplente
            c = casado.get((r.id, r.inicio))
            a = volta_de.get(idx)
            if a is not None and a in dono_de and vs[dono_de[a]].livre(r.inicio):
                regra = c.regra_casamento if c is not None and c.id_titular == a else "volta do titular"
                ocupar(r, idx, dono_de[a], "alta", regra)
                continue
            if c is not None and c.id_titular in ultima and vs[ultima[c.id_titular]].livre(r.inicio):
                ocupar(r, idx, ultima[c.id_titular], "alta", c.regra_casamento)
                continue
            cands = []
            for i in range(k):
                s = saida(i)
                if s and vs[i].livre(r.inicio) and per.at[s[3], "condicao"] != "titular" \
                        and chave[s[0]] == r.chave and r.inicio - JANELA <= s[1] <= r.inicio + UM_DIA:
                    cands.append((abs((s[1] - r.inicio).days), i))
            if cands:
                ocupar(r, idx, min(cands)[1], "alta", "saída de suplente, partido/federação")
                continue
            i, conf = livre_qualquer(r)
            if i is None:
                conflitos.append({"id": r.id, "uf": uf, "inicio": r.inicio, "tipo": "sem vaga livre"})
                continue
            if conf == "sem_dono":
                assumir(r.id, i, r.inicio)
                ocupar(r, idx, i, "alta", "posse em vaga sem titular original")
            else:
                ocupar(r, idx, i, conf, "vaga livre, mesma chave" if conf == "media" else "vaga livre na UF")

    return {"per": per, "vagas": vagas, "conflitos": pd.DataFrame(conflitos), "remanejos": pd.DataFrame(remanejos),
            "sobrepostos": pd.DataFrame(sobrepostos)}


def verificar(base: dict, res: dict) -> dict:
    """Invariantes do plano. Falha com assert se algum quebrar; devolve os números para o log."""
    per, vagas = res["per"], res["vagas"]
    corte, inicio = base["corte"], base["cfg"]["inicio"]
    assert res["conflitos"].empty, f"conflitos na distribuição:\n{res['conflitos']}"
    assert len(vagas) == sum(base["cfg"]["cadeiras"].values())

    # cada linha de per cai em pelo menos um segmento, e os segmentos de uma linha cobrem o período sem buraco
    por_linha: dict[int, list] = {}
    for v in vagas:
        for s in v.segs:
            por_linha.setdefault(s.idx, []).append(s)
    assert set(por_linha) == set(per.index), "período sem vaga"
    for idx, ss in por_linha.items():
        ss = sorted(ss, key=lambda s: s.ini)
        r = per.loc[idx]
        assert ss[0].ini == r.inicio and ss[-1].fim == r.fim_excl, f"segmentos não cobrem o período {idx}"
        assert all(a.fim == b.ini for a, b in zip(ss, ss[1:])), f"buraco nos segmentos do período {idx}"

    # nenhuma vaga com dois ocupantes ao mesmo tempo
    for v in vagas:
        for a, b in zip(v.segs, v.segs[1:]):
            assert a.fim <= b.ini, f"sobreposição na vaga {v.uf}: {a} {b}"

    # em todo dia, vagas ocupadas = pessoas em exercício; por UF, nunca acima das cadeiras
    dias = pd.date_range(inicio, corte, freq="D").date
    n_dias = len(dias)
    ocup = [0] * n_dias
    for v in vagas:
        for s in v.segs:
            for d in range((s.ini - inicio).days, min((s.fim - inicio).days, n_dias)):
                ocup[d] += 1
    em_ex = [int(((per.inicio <= d) & (per.fim_excl > d)).sum()) for d in dias]
    assert ocup == em_ex, "ocupação diária diferente do número em exercício"
    assert max(ocup) <= len(vagas)

    # as ligações casadas pelo estudo SUPLENTES: quantas a distribuição respeitou
    sub = base["subst"]
    casadas = sub[sub.id_titular.notna()]
    seg_ini = {(s.pid, s.ini): v for v in vagas for s in v.segs}
    dono_na_data = 0
    for c in casadas.itertuples():
        v = seg_ini.get((c.id, c.inicio))
        if v is None:
            continue
        ds = [d for d in v.donos if d[1] <= c.inicio and (d[2] is None or d[2] > c.inicio)]
        if ds and ds[0][0] == c.id_titular:
            dono_na_data += 1
    return {"dias": n_dias, "max_ocupadas": max(ocup), "ocupadas_no_corte": ocup[-1],
            "casadas_estudo": len(casadas), "casadas_na_vaga_do_titular": dono_na_data,
            "remanejos": len(res["remanejos"]), "sobrepostos": len(res["sobrepostos"])}
