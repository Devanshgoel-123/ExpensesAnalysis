#!/usr/bin/env bash
# Fill JWT_SECRET + ENCRYPTION_KEY in .env when they are empty or known-insecure.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env ]]; then
  [[ -f .env.example ]] || { echo "Missing .env.example" >&2; exit 1; }
  cp .env.example .env
  echo "Created .env from .env.example"
fi

NEW_JWT="$(openssl rand -hex 32)"
NEW_ENC="$(openssl rand -hex 32)"
WEAK_ENC="0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"

is_weak_jwt() {
  case "$1" in
    ""|change-me-to-a-long-random-string|dev-only-jwt-secret-change-me|test-jwt-secret) return 0 ;;
    *) return 1 ;;
  esac
}

is_weak_enc() {
  local cur="$1"
  local lower
  lower="$(printf '%s' "$cur" | tr '[:upper:]' '[:lower:]')"
  [[ -z "$cur" || "$lower" == "$WEAK_ENC" ]]
}

tmp="$(mktemp)"
while IFS= read -r line || [[ -n "$line" ]]; do
  if [[ "$line" == JWT_SECRET=* ]]; then
    if is_weak_jwt "${line#JWT_SECRET=}"; then
      printf 'JWT_SECRET=%s\n' "$NEW_JWT"
      continue
    fi
  elif [[ "$line" == ENCRYPTION_KEY=* ]]; then
    if is_weak_enc "${line#ENCRYPTION_KEY=}"; then
      printf 'ENCRYPTION_KEY=%s\n' "$NEW_ENC"
      continue
    fi
  fi
  printf '%s\n' "$line"
done < .env > "$tmp"
mv "$tmp" .env

echo "Updated JWT_SECRET and ENCRYPTION_KEY in .env (left non-default values untouched)"
