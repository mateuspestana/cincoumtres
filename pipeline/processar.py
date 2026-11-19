"""Snapshot -> vagas -> verificações -> JSON do site.

Uso: python processar.py [--leg 57] [AAAA-MM-DD]   (padrão: snapshot mais recente)
Falha (assert) se alguma invariante quebrar; nesse caso nada é gravado no site.
Autor: Matheus C. Pestana.
"""
import argparse
import datetime as dt
import json
import re

import pandas as pd

from config import SAIDA_SITE, snapshot
from exportar import exportar
from periodos import montar
from vagas import distribuir, verificar


def conferir_casos(base, res):
    """Casos citados no LEIAME do estudo SUPLENTES, conferidos à mão lá."""
    per, cam = res["per"], base["cam"]

    def pid(nome):
        ids = cam[cam.nome.str.contains(nome, case=False, regex=False)].id.tolist()
        assert len(ids) == 1, f"nome ambíguo ou ausente: {nome} -> {ids}"
        return ids[0]

    # contagens conferidas à mão em 19/11/2026: só os períodos iniciados até essa data, para que uma nova
    # convocação de alguém da lista não derrube a atualização diária
    sup = per[(per.condicao != "titular") & (per.inicio <= dt.date(2026, 11, 19))]
    sup = sup.assign(dias=[min(d, (dt.date(2026, 11, 20) - i).days) for d, i in zip(sup.dias, sup.inicio)])
    naumi = sup[sup.id == pid("Naumi Amorim")]
    assert naumi.dias.sum() == 14, naumi
    assert len(sup[sup.id == pid("Marcelo Calero")]) == 6
    assert len(sup[sup.id == pid("Ferreirinha")]) == 11
    ribamar = per[(per.id == pid("Ribamar Silva")) & (per.condicao == "efetivado")]
    assert str(ribamar.inicio.min()) == "2025-01-01", ribamar
    rol = pid("Rollemberg")
    assert any(s.regra == "recontagem/retotalização" for v in res["vagas"] for s in v.segs if s.pid == rol)
    return "Naumi 14 dias, Calero 6 períodos, Ferreirinha 11, Ribamar efetivado 01/01/2025, Rollemberg por recontagem"


def conferir_partidos(base):
    """Cada troca de sigla deve ter um evento "Alteração de partido"; as que não têm são listadas."""
    p = base["partidos"].sort_values(["id", "inicio"])
    sem = p[~p.com_evento]
    return sem.merge(base["cam"][["id", "nome"]], on="id")[["id", "nome", "sigla", "inicio"]]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("data", nargs="?")
    ap.add_argument("--leg", type=int, default=57)
    a = ap.parse_args()

    snap = snapshot(a.leg, a.data)
    base = montar(a.leg, snap)
    res = distribuir(base)
    verif = verificar(base, res)
    casos = conferir_casos(base, res) if a.leg == 57 else "sem casos de referência"
    sem_evento = conferir_partidos(base)
    meta = exportar(base, res, verif)

    # nenhum CPF nos arquivos públicos
    cpfs = set(base["cam"].cpf.dropna())
    for f in (SAIDA_SITE / str(a.leg)).iterdir():
        texto = f.read_text()
        achados = {c for c in re.findall(r"\d{11}", texto) if c in cpfs}
        assert not achados, f"CPF em {f.name}"

    print(f"snapshot {snap.name}: {json.dumps(verif, ensure_ascii=False)}")
    print(f"casos de referência: {casos}")
    print(f"trocas de sigla sem evento 'Alteração de partido': {len(sem_evento)}")
    if len(sem_evento):
        print(sem_evento.to_string(index=False))
    print(f"confiança das ligações: {meta['numeros']['confianca']}")
    print(f"gravado em {SAIDA_SITE / str(a.leg)}")


if __name__ == "__main__":
    pd.set_option("display.width", 200)
    main()
