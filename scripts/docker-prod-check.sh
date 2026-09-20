#!/usr/bin/env bash
# Fail-fast env + compose validation before production `docker compose up`.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

STRICT=0
CHECK_COMPOSE=0
for arg in "$@"; do
  case "$arg" in
    --strict) STRICT=1 ;;
    --compose) CHECK_COMPOSE=1 ;;
    -h|--help)
      echo "Usage: ./scripts/docker-prod-check.sh [--strict] [--compose]"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 2
      ;;
  esac
done

json_str() {
  local s=$1
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  s=${s//$'\n'/\\n}
  printf '"%s"' "$s"
}

log() {
  printf '{"ts":"%s","level":"%s","service":"docker-prod-check","msg":%s}\n' \
    "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    "$1" \
    "$(json_str "$2")"
}

fail() { log error "$1"; exit 1; }
warn() { log warn "$1"; }
ok() { log info "$1"; }

ERRORS=0
add_error() {
  log error "$1"
  ERRORS=$((ERRORS + 1))
}

[[ -f .env ]] || fail "Missing .env — copy .env.example and set secrets"

set -a
# shellcheck disable=SC1091
source .env
set +a
ok "Loaded .env"

require_nonempty() {
  local name="$1"
  local value="${!name-}"
  [[ -n "${value}" ]] || add_error "${name} is required and empty"
}

require_nonempty JWT_SECRET
require_nonempty ENCRYPTION_KEY
require_nonempty FRONTEND_URL
require_nonempty CORS_ORIGINS
require_nonempty NEXT_PUBLIC_API_URL
require_nonempty POSTGRES_PASSWORD

if [[ -n "${JWT_SECRET:-}" ]]; then
  [[ ${#JWT_SECRET} -ge 16 ]] || add_error "JWT_SECRET must be at least 16 characters"
  case "${JWT_SECRET}" in
    dev-only-jwt-secret-change-me|change-me-to-a-long-random-string|test-jwt-secret)
      add_error "JWT_SECRET uses an insecure default"
      ;;
  esac
fi

if [[ -n "${ENCRYPTION_KEY:-}" ]]; then
  if [[ ! "${ENCRYPTION_KEY}" =~ ^[0-9a-fA-F]{64}$ ]]; then
    add_error "ENCRYPTION_KEY must be exactly 64 hex characters"
  fi
  enc_lower="$(printf '%s' "${ENCRYPTION_KEY}" | tr '[:upper:]' '[:lower:]')"
  if [[ "${enc_lower}" == "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef" ]]; then
    add_error "ENCRYPTION_KEY uses the documented insecure default"
  fi
fi

[[ "${ALLOW_ANON_PARSE:-0}" != "1" ]] || add_error "ALLOW_ANON_PARSE=1 is not allowed for production Docker"

case "${POSTGRES_PASSWORD:-}" in
  ledgerline|change-me-strong-db-password)
    add_error "POSTGRES_PASSWORD must not use the example/default password"
    ;;
esac

[[ "${NODE_ENV:-}" == "production" ]] || warn "NODE_ENV is '${NODE_ENV:-unset}' — compose expects production"
[[ "${LOG_PRETTY:-0}" != "1" ]] || warn "LOG_PRETTY=1 ignored in production containers (JSON logs only)"

if [[ $STRICT -eq 1 ]]; then
  require_nonempty GOOGLE_CLIENT_ID
  require_nonempty GOOGLE_CLIENT_SECRET
fi

[[ $ERRORS -eq 0 ]] || fail "Prod checks failed with ${ERRORS} error(s). Fix .env and re-run."
ok "Environment safety checks passed"

if [[ $CHECK_COMPOSE -eq 1 ]]; then
  command -v docker >/dev/null 2>&1 || fail "docker not found on PATH"
  if docker compose version >/dev/null 2>&1; then
    COMPOSE=(docker compose)
  elif command -v docker-compose >/dev/null 2>&1; then
    COMPOSE=(docker-compose)
  else
    fail "docker compose plugin not available"
  fi
  ok "Validating docker-compose.yml"
  "${COMPOSE[@]}" -f docker-compose.yml config >/dev/null
  ok "Validating docker-compose.yml + docker-compose.prod.yml"
  "${COMPOSE[@]}" -f docker-compose.yml -f docker-compose.prod.yml config >/dev/null
  ok "Compose files are valid"
fi

ok "Ready for: docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d"
