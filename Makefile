# Cinco Um Três. Autor: Matheus C. Pestana.
LEG ?= 57
PY = cd pipeline && uv run python

.PHONY: atualizar tse coletar processar build servir

atualizar: coletar processar build   ## coleta na Câmara, monta as vagas, exporta e gera o site

tse:    ## baixa as candidaturas do TSE
	$(PY) tse.py

coletar:
	$(PY) coleta.py --leg $(LEG)

processar:
	$(PY) processar.py --leg $(LEG)

build:
	cd site && npm run build

servir:
	python3 -m http.server 4400 -d site/out
