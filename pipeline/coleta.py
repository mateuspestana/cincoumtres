"""Coleta, na API de dados abertos da Câmara, todos os deputados que exerceram numa legislatura:
lista (com foto), detalhe (CPF, sexo, nascimento) e histórico de eventos (posse, licença,
afastamento, reassunção, troca de partido...). Pensado para rodar todo dia.

Saída: pipeline/bruto/<leg>/<AAAA-MM-DD>/{lista.json, deputados.json, manifest.json}.
Uso: python coleta.py [--leg 57] [AAAA-MM-DD]   (padrão: 57, hoje)

A legislatura é um parâmetro.
Autor: Matheus C. Pestana.
"""
import argparse
import datetime as dt
import hashlib
import json
import time
from concurrent.futures import ThreadPoolExecutor

import requests

from config import API, BRUTO, LEGISLATURAS

CAB = {"Accept": "application/json"}
S = requests.Session()
PEDIDOS = 0


def get_json(caminho, **params):
    global PEDIDOS
    for t in range(8):
        try:
            PEDIDOS += 1
            r = S.get(f"{API}/{caminho}", params=params, headers=CAB, timeout=90)
            if r.status_code == 200:
                return r.json()
            if r.status_code < 500 and r.status_code != 429:
                r.raise_for_status()
        except requests.RequestException as e:
            if isinstance(e, requests.HTTPError) and e.response.status_code < 500:
                raise
        time.sleep(4 * (t + 1))
    raise RuntimeError(f"falhou: {caminho} {params}")


def get(caminho, **params):
    return get_json(caminho, **params)["dados"]


def get_todas(caminho, **params):
    """Segue as páginas da API (o teto de itens por página vale também com itens=1000)."""
    dados, pagina = [], 1
    while True:
        r = get_json(caminho, pagina=pagina, **params)
        dados += r["dados"]
        if not any(l["rel"] == "next" for l in r.get("links", [])):
            return dados
        pagina += 1


def um(id_dep: int) -> tuple[int, dict]:
    return id_dep, {"detalhe": get(f"deputados/{id_dep}"), "historico": get(f"deputados/{id_dep}/historico")}


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("data", nargs="?", default=dt.date.today().isoformat())
    ap.add_argument("--leg", type=int, default=57)
    a = ap.parse_args()
    if not LEGISLATURAS[a.leg]["ativa"]:
        raise SystemExit(f"legislatura {a.leg} ainda não está ativa em config.py")

    saida = BRUTO / str(a.leg) / a.data
    saida.mkdir(parents=True, exist_ok=True)
    inicio = time.time()

    lista = get_todas("deputados", idLegislatura=a.leg, itens=1000, ordem="ASC", ordenarPor="nome")
    ids = sorted({d["id"] for d in lista})
    with ThreadPoolExecutor(10) as ex:
        deputados = dict(ex.map(um, ids))

    arquivos = {"lista.json": lista, "deputados.json": deputados}
    manifest = {"data_coleta": dt.datetime.now().isoformat(timespec="seconds"), "api": API,
                "legislatura": a.leg, "deputados": len(ids), "pedidos": PEDIDOS,
                "segundos": round(time.time() - inicio, 1), "sha256": {}}
    for nome, obj in arquivos.items():
        bruto = json.dumps(obj, ensure_ascii=False).encode()
        (saida / nome).write_bytes(bruto)
        manifest["sha256"][nome] = hashlib.sha256(bruto).hexdigest()
    (saida / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    print(f"{len(ids)} deputados, {PEDIDOS} pedidos, {manifest['segundos']} s -> {saida}")


if __name__ == "__main__":
    main()
