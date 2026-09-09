#!/usr/bin/env bash
#
# Post-deployment security verification for an Eventium instance.
#
# Checks the boundaries that matter on a running deployment: that the GraphQL API
# refuses anonymous callers, that a public broadcast token cannot read beyond its
# own page, that credentials are never echoed back, that webhook ingress
# authenticates, and that rate limiting is active.
#
# Read-only unless --with-writes is passed (which installs and removes a throwaway
# data source to exercise credential handling).
#
# Usage:
#   BASE_URL=https://eventium.example.com \
#   ADMIN_EMAIL=admin@eventium.local ADMIN_PASSWORD=... \
#   BROADCAST_TOKEN=... ./scripts/verify-deployment.sh [--with-writes]
#
set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"
ADMIN_EMAIL="${ADMIN_EMAIL:-}"
ADMIN_PASSWORD="${ADMIN_PASSWORD:-}"
BROADCAST_TOKEN="${BROADCAST_TOKEN:-}"
WITH_WRITES=false
[[ "${1:-}" == "--with-writes" ]] && WITH_WRITES=true

JAR="$(mktemp)"
BODY="$(mktemp)"
trap 'rm -f "$JAR" "$BODY"' EXIT

pass=0
fail=0
skip=0

green() { printf '\033[32m%s\033[0m' "$1"; }
red()   { printf '\033[31m%s\033[0m' "$1"; }
grey()  { printf '\033[90m%s\033[0m' "$1"; }

check() {  # label, expected substring, actual
  if [[ "$3" == *"$2"* ]]; then
    printf '%s  %s\n' "$(green PASS)" "$1"; pass=$((pass + 1))
  else
    printf '%s  %s\n        expected: %s\n        got:      %s\n' \
      "$(red FAIL)" "$1" "$2" "${3:0:300}"; fail=$((fail + 1))
  fi
}

refute() {  # label, forbidden substring, actual
  if [[ "$3" == *"$2"* ]]; then
    printf '%s  %s\n        response contained: %s\n' "$(red FAIL)" "$1" "$2"; fail=$((fail + 1))
  else
    printf '%s  %s\n' "$(green PASS)" "$1"; pass=$((pass + 1))
  fi
}

skipped() { printf '%s  %s %s\n' "$(grey SKIP)" "$1" "$(grey "($2)")"; skip=$((skip + 1)); }

gql()      { printf '%s' "$1" > "$BODY"; curl -s        -X POST "$BASE_URL/graphql" -H 'Content-Type: application/json' --data-binary @"$BODY"; }
gql_auth() { printf '%s' "$1" > "$BODY"; curl -s -b "$JAR" -X POST "$BASE_URL/graphql" -H 'Content-Type: application/json' --data-binary @"$BODY"; }

echo "Verifying $BASE_URL"
echo

echo "── Health ─────────────────────────────────────────────"
health=$(curl -s "$BASE_URL/health")
check "readiness reports the database as reachable" '"database":"ok"' "$health"
check "readiness reports Redis as reachable" '"redis":"ok"' "$health"

echo
echo "── Anonymous access is refused ────────────────────────"
check "plugins query needs a session" "Authentication required" \
  "$(gql '{"query":"{ plugins { id config } }"}')"
check "dashboards query needs a session" "Authentication required" \
  "$(gql '{"query":"{ dashboards { id name } }"}')"
check "installPlugin needs a session" "Authentication required" \
  "$(gql '{"query":"mutation($i: InstallPluginInput!) { installPlugin(input: $i) { id } }","variables":{"i":{"pluginId":"gitlab","name":"probe"}}}')"
check "binding resolution needs a session or broadcast token" "Authentication required" \
  "$(gql '{"query":"query($b: JSON!) { resolveBindings(bindings: $b) }","variables":{"b":[{"ref":"gitlab:repository.name"}]}}')"
check "server config stays public" "webhookBaseUrl" \
  "$(gql '{"query":"{ serverConfig { webhookBaseUrl } }"}')"

echo
echo "── Production hardening ───────────────────────────────"
check "GraphiQL explorer is not exposed" "404" \
  "$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/graphiql")"
check "open registration is disabled" "Registration is disabled" \
  "$(curl -s -X POST "$BASE_URL/api/auth/register" -H 'Content-Type: application/json' \
      -d '{"email":"probe@example.invalid","name":"Probe","password":"a-long-enough-password"}')"
check "malformed webhook plugin id is refused" "Malformed plugin id" \
  "$(curl -s -X POST "$BASE_URL/api/webhooks/..%2Fetc" -H 'Content-Type: application/json' -d '{}')"

echo
echo "── Public broadcast scope ─────────────────────────────"
if [[ -z "$BROADCAST_TOKEN" ]]; then
  skipped "broadcast checks" "set BROADCAST_TOKEN"
else
  check "broadcast page is readable by token" '"dashboards"' "$(curl -s "$BASE_URL/api/broadcast/$BROADCAST_TOKEN")"
  check "an unknown token is not found" "not found" "$(curl -s "$BASE_URL/api/broadcast/0000000000000000000000")"
  check "a token cannot resolve a binding outside its own page" "not part of this broadcast" \
    "$(gql "{\"query\":\"query(\$b: JSON!, \$t: String) { resolveBindings(bindings: \$b, broadcastToken: \$t) }\",\"variables\":{\"b\":[{\"ref\":\"zzunlikely:thing.name\"}],\"t\":\"$BROADCAST_TOKEN\"}}")"
fi

echo
echo "── Authenticated surface ──────────────────────────────"
if [[ -z "$ADMIN_EMAIL" || -z "$ADMIN_PASSWORD" ]]; then
  skipped "authenticated checks" "set ADMIN_EMAIL and ADMIN_PASSWORD"
else
  login=$(curl -s -c "$JAR" -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' \
    -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}")
  check "admin can sign in" '"role"' "$login"
  check "session cookie is HttpOnly" "HttpOnly" \
    "$(curl -s -i -X POST "$BASE_URL/api/auth/login" -H 'Content-Type: application/json' \
        -d "{\"email\":\"$ADMIN_EMAIL\",\"password\":\"$ADMIN_PASSWORD\"}" | grep -i 'set-cookie')"
  check "authenticated dashboards query works" '"data":{"dashboards"' "$(gql_auth '{"query":"{ dashboards { id name } }"}')"

  listed=$(gql_auth '{"query":"{ plugins { id name config } }"}')
  refute "no plugin config field looks like a bearer token" "glpat-" "$listed"
  if [[ "$listed" == *"••••••••"* || "$listed" == *'"config":{}'* || "$listed" == *'"plugins":[]'* ]]; then
    printf '%s  %s\n' "$(green PASS)" "stored credentials are masked in API responses"; pass=$((pass + 1))
  else
    printf '%s  %s\n        got: %s\n' "$(red FAIL)" \
      "plugin config was returned unmasked" "${listed:0:300}"; fail=$((fail + 1))
  fi

  check "malformed binding refs are rejected" "Invalid bindings" \
    "$(gql_auth '{"query":"query($b: JSON!) { resolveBindings(bindings: $b) }","variables":{"b":[{"ref":"nonsense"}]}}')"
  check "notification actions must carry a valid URL" "Invalid rule input" \
    "$(gql_auth '{"query":"mutation($i: CreateNotificationRuleInput!) { createNotificationRule(input: $i) { id } }","variables":{"i":{"name":"probe","eventPattern":"*","actions":[{"type":"webhook","config":{"url":"not-a-url"}}]}}}')"

  if $WITH_WRITES; then
    echo
    echo "── Credential round-trip (writes) ─────────────────────"
    install=$(gql_auth '{"query":"mutation($i: InstallPluginInput!) { installPlugin(input: $i) { id name config } }","variables":{"i":{"pluginId":"gitlab","name":"verify-probe","config":{"url":"https://gitlab.invalid","token":"probe-secret-do-not-use","webhookSecret":"probe-hook-secret"}}}}')
    check  "a data source can be installed" "verify-probe" "$install"
    check  "its config comes back masked" "••••••••" "$install"
    refute "the plaintext token is never echoed back" "probe-secret-do-not-use" "$install"

    probe_id=$(printf '%s' "$install" | grep -oE '"id":"[^"]+"' | head -1 | cut -d'"' -f4)
    if [[ -n "$probe_id" ]]; then
      check "a webhook with the wrong secret is refused" "Webhook rejected" \
        "$(curl -s -X POST "$BASE_URL/api/webhooks/gitlab" -H 'Content-Type: application/json' \
            -H 'X-Gitlab-Event: Push Hook' -H 'X-Gitlab-Token: definitely-wrong' -d '{}')"
      gql_auth "{\"query\":\"mutation(\$id: ID!) { uninstallPlugin(id: \$id) { id } }\",\"variables\":{\"id\":\"$probe_id\"}}" > /dev/null
      printf '%s  %s\n' "$(green PASS)" "probe data source removed"; pass=$((pass + 1))
    fi
  else
    echo
    skipped "credential round-trip" "pass --with-writes"
  fi
fi

echo
echo "── Rate limiting ──────────────────────────────────────"
limited=false
for i in $(seq 1 25); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$BASE_URL/api/auth/login" \
    -H 'Content-Type: application/json' -d "{\"email\":\"probe@example.invalid\",\"password\":\"wrong-$i\"}")
  [[ "$code" == "429" ]] && { limited=true; break; }
done
if $limited; then
  printf '%s  %s\n' "$(green PASS)" "repeated failed logins are throttled"; pass=$((pass + 1))
else
  printf '%s  %s\n' "$(red FAIL)" "repeated failed logins were never throttled"; fail=$((fail + 1))
fi
echo
echo "══════════════════════════════════════════════════════"
printf 'passed: %d   failed: %d   skipped: %d\n' "$pass" "$fail" "$skip"
[[ $fail -eq 0 ]] || exit 1
