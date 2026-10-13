#!/usr/bin/env bash
# Uso: scripts/smoke-test.sh http://localhost:8081
# Espera a aplicação ficar saudável e valida os endpoints principais.
set -euo pipefail

BASE_URL="${1:?uso: smoke-test.sh <base-url>}"

echo "Aguardando ${BASE_URL}/health ..."
for i in $(seq 1 40); do
  if curl -fsS "${BASE_URL}/health" | grep -q '"status":"UP"'; then
    echo "Health OK (tentativa ${i})"
    break
  fi
  if [ "$i" -eq 40 ]; then
    echo "Aplicação não ficou saudável a tempo" >&2
    exit 1
  fi
  sleep 3
done

for caminho in /api/categorias /api/metas /api/resumo; do
  echo "Validando GET ${caminho} ..."
  curl -fsS "${BASE_URL}${caminho}" > /dev/null
done

# A carga inicial tem 11 categorias; confirma que o MongoDB real respondeu com dados
QTD=$(curl -fsS "${BASE_URL}/api/categorias" | grep -o '"_id"' | wc -l)
echo "Categorias retornadas: ${QTD}"
[ "${QTD}" -ge 1 ] || { echo "Nenhuma categoria retornada" >&2; exit 1; }

echo "Smoke test OK"
