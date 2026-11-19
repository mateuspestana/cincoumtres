#!/usr/bin/env bash
# Atualização diária, pensada para rodar num servidor: coleta na Câmara, processa e publica os JSON.
# O push dispara o deploy do site. Se alguma verificação do processar.py falhar, nada é commitado.
# Autor: Matheus C. Pestana.
set -euo pipefail
cd "$(dirname "$0")/.."
LEG="${LEG:-57}"

git pull --rebase --quiet
cd pipeline
uv sync --quiet
uv run python tse.py --se-faltar
uv run python coleta.py --leg "$LEG"
uv run python processar.py --leg "$LEG"
cd ..

# guarda só os 7 snapshots mais recentes dos dados brutos
ls -d "pipeline/bruto/$LEG"/*/ | sort | head -n -7 | xargs -r rm -rf

git add site/public/data
if git diff --cached --quiet; then
  echo "sem mudanças"
  exit 0
fi
git commit --quiet -m "Dados de $(date +%F)"
git push --quiet
echo "publicado: Dados de $(date +%F)"
