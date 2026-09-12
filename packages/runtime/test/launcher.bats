#!/usr/bin/env bats
# Real end-to-end tests for launcher.sh: every test runs the actual script as
# a subprocess (not sourced), against a real fake bundle + fake project, with
# osascript/lsof/nc/ps/open/pbcopy/npm(+pnpm/yarn/bun) replaced by fakes on
# PATH (see mock-bin/) that record what they were called with and answer
# dialogs from files the test controls. CI also runs ShellCheck against the
# same templates (see package.json's lint:shell).

load test_helper

teardown() {
  stop_any_running_server
}

TEMPLATES="${BATS_TEST_DIRNAME}/../templates"

@test "launcher.sh is valid zsh" {
  run zsh -n "${TEMPLATES}/launcher.sh"
  [ "$status" -eq 0 ]
}

@test "run.command is syntactically valid POSIX sh" {
  run sh -n "${TEMPLATES}/run.command"
  [ "$status" -eq 0 ]
}

@test "Info.plist is well-formed XML" {
  if command -v plutil >/dev/null 2>&1; then
    run plutil -lint "${TEMPLATES}/Info.plist"
  elif command -v xmllint >/dev/null 2>&1; then
    run xmllint --noout "${TEMPLATES}/Info.plist"
  else
    skip "no plist/xml validator available"
  fi
  [ "$status" -eq 0 ]
}

# --- happy path -------------------------------------------------------------

@test "starts headless, detects ready, and opens the browser" {
  setup_bundle
  write_ready_server
  run_launcher
  [ "$status" -eq 0 ]

  [ -f "$(pid_file)" ]
  grep -q 'ready at http://localhost:4599/' "$(log_file)"
  grep -q '\[http://localhost:4599/\]' <(open_calls)
}

@test "does not reinstall dependencies when node_modules already exists" {
  setup_bundle
  write_ready_server
  run_launcher
  [ "$status" -eq 0 ]
  ! grep -q 'run.*install' <(pm_calls)
}

@test "installs dependencies when node_modules is missing" {
  setup_bundle
  write_ready_server
  rm -rf "${PROJECT_DIR}/node_modules"
  run_launcher
  [ "$status" -eq 0 ]
  grep -q 'CALL(npm): \[install\]' <(pm_calls)
}

# --- PROJECT_MOVED -----------------------------------------------------------

@test "PROJECT_MOVED: shows the catalog dialog when the project folder is gone" {
  setup_bundle
  rm -rf "${PROJECT_DIR}"
  echo "Cancel" >"${MOCK_STATE_DIR}/dialog-button"
  run_launcher
  [ "$status" -eq 0 ]
  grep -q "This app's project folder can't be found" <(dialog_calls)
  grep -q 'Locate Folder' <(dialog_calls)
}

@test "PROJECT_MOVED: Remove App deletes the bundle" {
  setup_bundle
  rm -rf "${PROJECT_DIR}"
  echo "Remove App" >"${MOCK_STATE_DIR}/dialog-button"
  run_launcher
  [ "$status" -eq 0 ]
  sleep 1.5
  [ ! -d "${BUNDLE_DIR}" ]
}

# --- single instance ----------------------------------------------------------

@test "cleans up a stale PID file and starts normally" {
  setup_bundle
  write_ready_server
  mkdir -p "$(dirname "$(pid_file)")"
  echo "999999" >"$(pid_file)" # a PID that (almost certainly) doesn't exist
  run_launcher
  [ "$status" -eq 0 ]
  grep -q 'cleaning stale PID file' "$(log_file)"
  grep -q 'ready at' "$(log_file)"
}

@test "already running: Stop kills the process and clears the PID file" {
  setup_bundle
  write_ready_server
  run_launcher
  [ "$status" -eq 0 ]
  local first_pid
  first_pid="$(cat "$(pid_file)")"

  echo "Stop" >"${MOCK_STATE_DIR}/dialog-button"
  run_launcher
  [ "$status" -eq 0 ]
  [ ! -f "$(pid_file)" ]
  run kill -0 "${first_pid}"
  [ "$status" -ne 0 ]
}

@test "already running: Open reveals the app without starting a second copy" {
  setup_bundle
  write_ready_server
  run_launcher
  [ "$status" -eq 0 ]

  echo "Open" >"${MOCK_STATE_DIR}/dialog-button"
  run_launcher
  [ "$status" -eq 0 ]
  # Only the first launch's install/run calls are present — no second start.
  [ "$(grep -c 'CALL(npm): \[run' <(pm_calls))" -eq 1 ]
}

# --- Node -----------------------------------------------------------------

@test "NODE_NOT_FOUND: shows the catalog dialog when node isn't on PATH" {
  setup_bundle
  # A real, freestanding path with no node anywhere on it. Plain PATH
  # prepending isn't enough here: as a login shell, /etc/zprofile's
  # path_helper would still re-add the system's real node further down —
  # DEVLAUNCH_TEST_PATH_OVERRIDE replaces PATH outright (see launcher.sh).
  local no_node_bin="${BATS_TEST_TMPDIR}/no-node-bin"
  mkdir -p "${no_node_bin}"
  for tool in osascript lsof nc ps open pbcopy; do
    ln -s "${MOCK_BIN}/${tool}" "${no_node_bin}/${tool}"
  done
  echo "Cancel" >"${MOCK_STATE_DIR}/dialog-button"
  DEVLAUNCH_TEST_PATH_OVERRIDE="${no_node_bin}:/usr/bin:/bin" HOME="${FAKE_HOME}" run "${LAUNCHER}"
  [ "$status" -eq 0 ]
  grep -q "Node.js isn't available" <(dialog_calls)
}

# --- dependencies -----------------------------------------------------------

@test "DEPS_INSTALL_FAILED: shows the catalog dialog when install fails" {
  setup_bundle
  rm -rf "${PROJECT_DIR}/node_modules"
  echo "1" >"${MOCK_STATE_DIR}/install-exit-code"
  echo "Cancel" >"${MOCK_STATE_DIR}/dialog-button"
  run_launcher
  [ "$status" -eq 0 ]
  grep -q "dependencies failed to install" <(dialog_calls)
}

# --- port in use --------------------------------------------------------------

@test "PORT_IN_USE: shows the catalog dialog naming the process, Cancel stops" {
  setup_bundle
  echo "4599" >"${MOCK_STATE_DIR}/listening-port"
  echo "4242" >"${MOCK_STATE_DIR}/listening-pid"
  echo "python3" >"${MOCK_STATE_DIR}/process-name"
  echo "Cancel" >"${MOCK_STATE_DIR}/dialog-button"
  run_launcher
  [ "$status" -eq 0 ]
  grep -q "Another app is already using this port" <(dialog_calls)
  [ ! -f "$(pid_file)" ]
}

@test "PORT_IN_USE: Use Another Port starts on the next free port" {
  setup_bundle
  cat >"${MOCK_STATE_DIR}/server-behavior.sh" <<'EOF'
#!/bin/sh
echo "Local: http://localhost:4600/"
while true; do sleep 1; done
EOF
  chmod +x "${MOCK_STATE_DIR}/server-behavior.sh"
  echo "4599" >"${MOCK_STATE_DIR}/listening-port"
  echo "4242" >"${MOCK_STATE_DIR}/listening-pid"
  echo "Use Another Port" >"${MOCK_STATE_DIR}/dialog-button"
  run_launcher
  [ "$status" -eq 0 ]
  grep -q 'using alternate port 4600' "$(log_file)"
}

@test "PORT_IN_USE: Quit Other App kills it and proceeds on the original port" {
  setup_bundle
  write_ready_server
  echo "4599" >"${MOCK_STATE_DIR}/listening-port"
  # A disposable, harmless process to be "the other app" — never the test's
  # own PID, since check_port will genuinely try to kill whatever PID we
  # give it here.
  sleep 300 &
  local disposable_pid=$!
  echo "${disposable_pid}" >"${MOCK_STATE_DIR}/listening-pid"
  echo "Quit Other App" >"${MOCK_STATE_DIR}/dialog-button"
  run_launcher
  [ "$status" -eq 0 ]
  grep -q 'ready at http://localhost:4599/' "$(log_file)"
  run kill -0 "${disposable_pid}"
  [ "$status" -ne 0 ]
  kill "${disposable_pid}" 2>/dev/null || true
}

# --- server failures ----------------------------------------------------------

@test "SERVER_EXITED_EARLY: shows the catalog dialog when the process dies before ready" {
  setup_bundle
  write_crashing_server
  echo "Cancel" >"${MOCK_STATE_DIR}/dialog-button"
  run_launcher
  [ "$status" -eq 0 ]
  grep -q "dev server stopped unexpectedly" <(dialog_calls)
}

@test "READY_TIMEOUT: shows the catalog dialog when it never becomes ready" {
  setup_bundle
  write_never_ready_server
  echo "Cancel" >"${MOCK_STATE_DIR}/dialog-button"
  run_launcher
  [ "$status" -eq 0 ]
  grep -q "taking too long to start" <(dialog_calls)
}

@test "View Logs opens the log file" {
  setup_bundle
  write_crashing_server
  echo "View Logs" >"${MOCK_STATE_DIR}/dialog-button"
  run_launcher
  [ "$status" -eq 0 ]
  grep -q "$(log_file)" <(open_calls)
}

# --- Copy Report / redaction --------------------------------------------------

@test "Copy Report: includes the marker line and redacts a secret from the logs" {
  setup_bundle
  write_crashing_server
  echo "Copy Report" >"${MOCK_STATE_DIR}/dialog-button"
  run_launcher
  [ "$status" -eq 0 ]

  local report="${MOCK_STATE_DIR}/pbcopy-captured.txt"
  [ -f "${report}" ]
  grep -q '^devlaunch report v1' "${report}"
  grep -q '\[REDACTED\]' "${report}"
  ! grep -q 'sk-thisisarealsecretvalue123' "${report}"
}

# --- log rotation --------------------------------------------------------------

@test "rotates the log at 5MB, keeping up to 3 backups" {
  setup_bundle
  write_ready_server
  mkdir -p "$(dirname "$(log_file)")"
  # A log already at the rotation threshold from a previous run.
  yes "old log line" | head -c 5300000 >"$(log_file)"
  cp "$(log_file)" "$(log_file).1"
  run_launcher
  [ "$status" -eq 0 ]
  [ -f "$(log_file).1" ]
  [ -f "$(log_file).2" ]
  grep -q 'ready at' "$(log_file)"
}
