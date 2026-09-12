#!/usr/bin/env bash
# Shared setup for launcher.bats — `load test_helper` from the .bats file.

RUNTIME_DIR="$(cd "${BATS_TEST_DIRNAME}/.." && pwd)"
LAUNCHER_TEMPLATE="${RUNTIME_DIR}/templates/launcher.sh"
STRINGS_TEMPLATE="${RUNTIME_DIR}/templates/strings.sh"
MOCK_BIN="${BATS_TEST_DIRNAME}/mock-bin"

# Builds a fake "Test App.app" bundle (real launcher.sh + real strings.sh +
# a generated launcher.env), a fake project directory (with node_modules
# already present, so the default is "no install needed"), a fake HOME, and
# puts the mock tools (osascript, lsof, nc, ps, open, pbcopy, npm/pnpm/yarn/
# bun) first on PATH. Exports LAUNCHER, FAKE_HOME, PROJECT_DIR,
# MOCK_STATE_DIR for the test to use.
#
# Usage: setup_bundle [KEY=value ...]  — appended to launcher.env, so a test
# can override a default (e.g. `setup_bundle DEVLAUNCH_MODE=terminal`).
setup_bundle() {
  FAKE_HOME="${BATS_TEST_TMPDIR}/home"
  PROJECT_DIR="${BATS_TEST_TMPDIR}/project"
  MOCK_STATE_DIR="${BATS_TEST_TMPDIR}/mock-state"
  BUNDLE_DIR="${FAKE_HOME}/Applications/Test App.app"
  LAUNCHER="${BUNDLE_DIR}/Contents/MacOS/launcher"

  mkdir -p "${FAKE_HOME}/Applications" "${PROJECT_DIR}/node_modules" "${MOCK_STATE_DIR}" \
    "${BUNDLE_DIR}/Contents/MacOS" "${BUNDLE_DIR}/Contents/Resources"

  cp "${LAUNCHER_TEMPLATE}" "${LAUNCHER}"
  chmod +x "${LAUNCHER}"
  cp "${STRINGS_TEMPLATE}" "${BUNDLE_DIR}/Contents/Resources/strings.sh"

  printf '{"name":"fixture"}' >"${PROJECT_DIR}/package.json"

  {
    printf 'DEVLAUNCH_PROJECT_DIR="%s"\n' "${PROJECT_DIR}"
    printf 'DEVLAUNCH_NAME="Test App"\n'
    printf 'DEVLAUNCH_SLUG="test-app"\n'
    printf 'DEVLAUNCH_SCRIPT="dev"\n'
    printf 'DEVLAUNCH_PORT="4599"\n'
    printf 'DEVLAUNCH_MODE="headless"\n'
    printf 'DEVLAUNCH_OPEN_PATH="/"\n'
    printf 'DEVLAUNCH_READY_TIMEOUT_SECONDS="6"\n'
    printf 'DEVLAUNCH_PACKAGE_MANAGER="npm"\n'
    printf 'DEVLAUNCH_VERSION="0.0.0"\n'
    for kv in "$@"; do
      printf '%s\n' "${kv}"
    done
  } >"${BUNDLE_DIR}/Contents/Resources/launcher.env"

  export MOCK_STATE_DIR
  export PATH="${MOCK_BIN}:${PATH}"
  # launcher.sh is a login shell (needs to be, for real nvm/fnm/volta/asdf
  # use) — that means /etc/zprofile's path_helper reorders PATH on every
  # invocation, which can shadow the plain PATH prepend above. See the
  # matching comment in launcher.sh.
  export DEVLAUNCH_TEST_PATH_PREPEND="${MOCK_BIN}"
}

# A dev script that starts, prints a ready line, and idles until killed.
write_ready_server() {
  cat >"${MOCK_STATE_DIR}/server-behavior.sh" <<'EOF'
#!/bin/sh
echo "Local: http://localhost:4599/"
while true; do sleep 1; done
EOF
  chmod +x "${MOCK_STATE_DIR}/server-behavior.sh"
}

# A dev script that exits immediately (simulates a crash).
write_crashing_server() {
  cat >"${MOCK_STATE_DIR}/server-behavior.sh" <<'EOF'
#!/bin/sh
echo "simulated crash: OPENAI_API_KEY=sk-thisisarealsecretvalue123"
exit 1
EOF
  chmod +x "${MOCK_STATE_DIR}/server-behavior.sh"
}

# A dev script that starts and idles, but never prints a ready line and
# never listens on the configured port (drives a READY_TIMEOUT).
write_never_ready_server() {
  cat >"${MOCK_STATE_DIR}/server-behavior.sh" <<'EOF'
#!/bin/sh
echo "still booting..."
while true; do sleep 1; done
EOF
  chmod +x "${MOCK_STATE_DIR}/server-behavior.sh"
}

run_launcher() {
  HOME="${FAKE_HOME}" run "${LAUNCHER}"
}

log_file() { printf '%s' "${FAKE_HOME}/Library/Logs/devlaunch/test-app.log"; }
pid_file() { printf '%s' "${FAKE_HOME}/Library/Application Support/devlaunch/run/test-app.pid"; }

dialog_calls() { cat "${MOCK_STATE_DIR}/osascript-calls.log" 2>/dev/null || true; }
open_calls() { cat "${MOCK_STATE_DIR}/open-calls.log" 2>/dev/null || true; }
pm_calls() { cat "${MOCK_STATE_DIR}/pm-calls.log" 2>/dev/null || true; }

# Stops whatever the current test's launcher may have started, so a
# background dev-server mock never outlives its test.
stop_any_running_server() {
  local pf
  pf="$(pid_file)"
  if [ -f "${pf}" ]; then
    local pid
    pid="$(cat "${pf}" 2>/dev/null || true)"
    if [ -n "${pid}" ]; then
      kill -TERM -- "-${pid}" 2>/dev/null || kill -TERM "${pid}" 2>/dev/null || true
    fi
  fi
}
