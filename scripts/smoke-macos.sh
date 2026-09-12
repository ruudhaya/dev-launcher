#!/bin/bash
# macOS-only smoke test for the launcher runtime (L1-2). There's no CLI yet
# (that's L1-3), so this generates real bundles directly through
# @devlaunch/core (see lib/generate-bundle.mjs), then drives the real
# launcher.sh: for the happy-path examples, start headless, wait for ready,
# curl the port, stop, and check it's really gone; for every
# examples/broken/* fixture, start it and assert the right error code shows
# up in its log within a short timeout, then force it down (it's sitting on
# a real, unclickable dialog at that point — this is a CI job, not a human).
#
# Usage: pnpm build && ./scripts/smoke-macos.sh   (from the repo root)

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SMOKE_HOME="$(mktemp -d "${TMPDIR:-/tmp}/devlaunch-smoke.XXXXXX")"
BUNDLE_LOCATION="${SMOKE_HOME}/Applications"
mkdir -p "${BUNDLE_LOCATION}"

FAILURES=0

# shellcheck disable=SC2329 # called indirectly via `trap cleanup EXIT` below
cleanup() {
  pkill -9 -f "${SMOKE_HOME}" >/dev/null 2>&1 || true
  pkill -9 osascript >/dev/null 2>&1 || true
  rm -rf "${SMOKE_HOME}"
}
trap cleanup EXIT

section() { printf '\n== %s ==\n' "$1"; }
pass() { printf '  ok   %s\n' "$1"; }
fail() {
  printf '  FAIL %s\n' "$1"
  FAILURES=$((FAILURES + 1))
}

generate_bundle() {
  # generate_bundle <projectDir> [flagsJson] — echoes bundlePath, slug, port
  # (one per line) on success.
  HOME="${SMOKE_HOME}" node "${REPO_ROOT}/scripts/lib/generate-bundle.mjs" \
    "$1" "${BUNDLE_LOCATION}" "${2:-}"
}

# Recursively kills PID and everything it spawned — see the matching
# kill_tree in launcher.sh for why a plain process-group kill isn't enough
# (a background job in a non-interactive shell isn't reliably its own
# process group leader without job control, so "npm run dev" can leave its
# "vite"/"next" child running after the top PID alone is killed).
kill_tree() {
  local pid="$1"
  local child
  for child in $(pgrep -P "${pid}" 2>/dev/null); do
    kill_tree "${child}"
  done
  kill -9 "${pid}" 2>/dev/null || true
}

# --- happy-path fixtures -----------------------------------------------------

run_happy_fixture() {
  local name="$1" project_dir="$2" install_cmd="$3"
  section "happy path: ${name}"

  if [ -n "${install_cmd}" ] && [ ! -d "${project_dir}/node_modules" ]; then
    if ! ( cd "${project_dir}" && eval "${install_cmd}" ) >/dev/null 2>&1; then
      fail "${name}: could not install its own dependencies (fixture problem, not devlaunch)"
      return
    fi
  fi

  local output bundle_path slug port
  if ! output="$(generate_bundle "${project_dir}")"; then
    fail "${name}: generate_bundle failed"
    return
  fi
  bundle_path="$(printf '%s\n' "${output}" | sed -n '1p')"
  slug="$(printf '%s\n' "${output}" | sed -n '2p')"
  port="$(printf '%s\n' "${output}" | sed -n '3p')"
  local launcher="${bundle_path}/Contents/MacOS/launcher"
  local pid_file="${SMOKE_HOME}/Library/Application Support/devlaunch/run/${slug}.pid"

  HOME="${SMOKE_HOME}" "${launcher}" >/dev/null 2>&1 &
  local launcher_pid=$!

  local waited=0 ready=0
  while [ "${waited}" -lt 60 ]; do
    if curl -s -o /dev/null -m 1 "http://localhost:${port}/"; then
      ready=1
      break
    fi
    sleep 1
    waited=$((waited + 1))
  done

  if [ "${ready}" -eq 1 ]; then
    pass "${name}: became ready on port ${port} in ~${waited}s"
  else
    fail "${name}: never became ready on port ${port} within 60s"
  fi

  if [ -f "${pid_file}" ]; then
    kill_tree "$(cat "${pid_file}")"
  fi
  wait "${launcher_pid}" 2>/dev/null
  sleep 1

  if curl -s -o /dev/null -m 1 "http://localhost:${port}/" 2>/dev/null; then
    fail "${name}: still listening on port ${port} after stop"
  else
    pass "${name}: stopped cleanly"
  fi
}

# --- broken fixtures ---------------------------------------------------------

run_broken_fixture() {
  local name="$1" project_dir="$2" expected_code="$3"
  section "broken fixture: ${name} (expect ${expected_code})"

  local output bundle_path slug
  if ! output="$(generate_bundle "${project_dir}" '{"readyTimeoutSeconds":5}')"; then
    fail "${name}: generate_bundle failed"
    return
  fi
  bundle_path="$(printf '%s\n' "${output}" | sed -n '1p')"
  slug="$(printf '%s\n' "${output}" | sed -n '2p')"
  local launcher="${bundle_path}/Contents/MacOS/launcher"
  local log_file="${SMOKE_HOME}/Library/Logs/devlaunch/${slug}.log"

  HOME="${SMOKE_HOME}" "${launcher}" >/dev/null 2>&1 &
  local launcher_pid=$!

  local waited=0 found=0
  while [ "${waited}" -lt 15 ]; do
    if [ -f "${log_file}" ] && grep -q "${expected_code}" "${log_file}"; then
      found=1
      break
    fi
    sleep 1
    waited=$((waited + 1))
  done

  if [ "${found}" -eq 1 ]; then
    pass "${name}: raised ${expected_code}"
  else
    fail "${name}: did not raise ${expected_code} within 15s"
    [ -f "${log_file}" ] && sed 's/^/    log: /' "${log_file}"
  fi

  # The launcher is very likely blocked on a real, unclickable dialog now —
  # this is a CI job, not a human. Force everything down: the launcher
  # itself, whatever dev server it may have actually started (its own
  # command line won't mention the bundle path, e.g. wrong-port-config gets
  # this far before timing out — so pkill -f bundle_path alone won't catch
  # it), and anything else matching this bundle for good measure.
  local pid_file="${SMOKE_HOME}/Library/Application Support/devlaunch/run/${slug}.pid"
  if [ -f "${pid_file}" ]; then
    kill_tree "$(cat "${pid_file}")"
  fi
  kill -9 "${launcher_pid}" 2>/dev/null || true
  pkill -9 -f "${bundle_path}" >/dev/null 2>&1 || true
}

# --- run it -------------------------------------------------------------------

pnpm --filter @devlaunch/core build >/dev/null

# vite-react pins Node via .nvmrc and is intentionally excluded here — a CI/
# dev machine's active Node rarely matches every example's own pin without
# nvm/fnm already configured for it, which is an environment concern, not a
# devlaunch one. next-app and with-claude-launch-json pin nothing, so they
# exercise the happy path on whatever Node is already active.
# --ignore-workspace: examples/next-app sits inside this repo's own pnpm
# workspace but isn't a member of it (see pnpm-workspace.yaml) — without
# this flag, pnpm treats the install as targeting the whole monorepo instead
# of this fixture's own, separate dependencies. Real projects don't have
# this wrinkle; it's purely a side effect of fixtures living in this repo.
run_happy_fixture "next-app" "${REPO_ROOT}/examples/next-app" "pnpm install --ignore-workspace"
run_happy_fixture "with-claude-launch-json" "${REPO_ROOT}/examples/with-claude-launch-json" "npm install"

run_broken_fixture "missing-dependency" "${REPO_ROOT}/examples/broken/missing-dependency" "DEPS_INSTALL_FAILED"
run_broken_fixture "crash-on-start" "${REPO_ROOT}/examples/broken/crash-on-start" "SERVER_EXITED_EARLY"
run_broken_fixture "wrong-port-config" "${REPO_ROOT}/examples/broken/wrong-port-config" "READY_TIMEOUT"
run_broken_fixture "node-version-mismatch" "${REPO_ROOT}/examples/broken/node-version-mismatch" "NODE_VERSION_MISSING"

section "result"
if [ "${FAILURES}" -eq 0 ]; then
  printf 'all smoke checks passed\n'
  exit 0
fi
printf '%d smoke check(s) failed\n' "${FAILURES}"
exit 1
