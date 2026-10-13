#!/usr/bin/env bash
# Uso: IMAGE=ghcr.io/org/repo:tag DB_PASSWORD=... scripts/deploy.sh <staging|production>
# Sobe a stack (app + MongoDB) do ambiente informado e executa o smoke test.
set -euo pipefail

ENVIRONMENT="${1:?uso: deploy.sh <staging|production>}"
ENV_FILE="env/${ENVIRONMENT}.env"

[ -f "$ENV_FILE" ] || { echo "Arquivo ${ENV_FILE} não encontrado" >&2; exit 1; }
: "${IMAGE:?defina IMAGE (imagem Docker a publicar)}"
: "${DB_PASSWORD:?defina DB_PASSWORD}"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a
export IMAGE DB_PASSWORD

echo ">> Deploy em ${ENVIRONMENT} com ${IMAGE}"
docker compose up -d --pull always --remove-orphans

"$(dirname "$0")/smoke-test.sh" "http://localhost:${APP_PORT}"
echo ">> Deploy em ${ENVIRONMENT} concluído"
