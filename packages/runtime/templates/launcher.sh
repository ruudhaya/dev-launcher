#!/bin/zsh -l
# shellcheck shell=bash
#
# devlaunch launcher — Contents/MacOS/launcher inside a generated .app bundle.
#
# Real zsh (the shebang's "-l" makes it a login shell, so nvm/fnm/volta/asdf
# init scripts in .zprofile/.zshrc load before we look for Node) — but
# written in a bash/zsh-compatible subset so ShellCheck (which has no zsh
# mode at all, hence "shell=bash" above) can actually check it. That means:
#   - no zsh-only parameter flags like ${(P)var} or ${(@s:|:)str}; indirect
#     variable lookups go through eval (see error_field), and splitting the
#     catalog's pipe-separated ACTIONS goes through `set --` after `IFS='|'`
#   - `setopt SH_WORD_SPLIT` right below makes that `set --` split the way
#     it would in bash — zsh does NOT word-split unquoted expansions by
#     default, unlike every other shell this script could plausibly run
#     under, so this line is not optional.
#   - resolving this script's own directory uses plain dirname/pwd, not
#     zsh's ${0:A:h}.
#
# shellcheck disable=SC1091,SC2154
# (SC1091: launcher.env/strings.sh are sourced from a path only known at
#  bundle-generation time, so ShellCheck can't follow them; SC2154: every
#  DEVLAUNCH_* variable this script reads comes from one of those two files.)

setopt SH_WORD_SPLIT

# Test-only hook: a login shell re-runs /etc/zprofile (path_helper) and
# ~/.zprofile on every launch, which can reorder PATH ahead of anything the
# caller exported — real dotfiles win in production, which is the whole
# point of "-l", but it means a bats suite's mocked osascript/lsof/npm/etc.
# can get silently shadowed by the real ones. If the (bats-only) test suite
# set this, re-assert it now, after the login shell's own startup has
# already run. Never set for a real generated bundle.
if [ -n "${DEVLAUNCH_TEST_PATH_OVERRIDE:-}" ]; then
  PATH="${DEVLAUNCH_TEST_PATH_OVERRIDE}" # full replacement — for a test that needs a tool to be genuinely absent
elif [ -n "${DEVLAUNCH_TEST_PATH_PREPEND:-}" ]; then
  PATH="${DEVLAUNCH_TEST_PATH_PREPEND}:${PATH}"
fi

PROG_DIR="$(cd "$(dirname "$0")" && pwd)"           # .../Contents/MacOS
RESOURCES_DIR="$(cd "${PROG_DIR}/../Resources" && pwd)"
BUNDLE_DIR="$(cd "${PROG_DIR}/../.." && pwd)"       # .../<Name>.app

source "${RESOURCES_DIR}/launcher.env"
source "${RESOURCES_DIR}/strings.sh"

SUPPORT_DIR="${HOME}/Library/Application Support/devlaunch"
RUN_DIR="${SUPPORT_DIR}/run"
LOG_DIR="${HOME}/Library/Logs/devlaunch"
LOG_FILE="${LOG_DIR}/${DEVLAUNCH_SLUG}.log"
PID_FILE="${RUN_DIR}/${DEVLAUNCH_SLUG}.pid"
LOCKHASH_FILE="${RUN_DIR}/${DEVLAUNCH_SLUG}.lockhash"
LOG_MAX_BYTES=$((5 * 1024 * 1024))

SERVER_PID=""

# ---------------------------------------------------------------------------
# Small helpers: quoting, logging, notifications, the error catalog.
# ---------------------------------------------------------------------------

# Wraps $1 in single quotes for safe embedding in a shell command string,
# escaping any embedded single quotes.
quote_shell() {
  local s=$1
  s=${s//\'/\'\\\'\'}
  printf "'%s'" "$s"
}

# Wraps $1 in double quotes for safe embedding in an AppleScript string.
quote_applescript() {
  local s=$1
  s=${s//\\/\\\\}
  s=${s//\"/\\\"}
  printf '"%s"' "$s"
}

log() {
  mkdir -p "${LOG_DIR}"
  printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >>"${LOG_FILE}"
}

notify() {
  local title=$1 body=$2
  osascript -e "display notification $(quote_applescript "${body}") with title $(quote_applescript "${title}")" \
    >/dev/null 2>&1 || true
}

# error_field CODE FIELD -> the value of DEVLAUNCH_ERROR_<CODE>_<FIELD>,
# sourced from strings.sh. Indirect lookup via eval since ShellCheck's bash
# mode (and POSIX sh) has no zsh-style ${(P)var}.
error_field() {
  local code=$1 field=$2 var
  var="DEVLAUNCH_ERROR_${code}_${field}"
  eval "printf '%s' \"\${${var}:-}\""
}

# Shows the catalog dialog for CODE and prints the clicked button's label —
# or nothing if the dialog was dismissed (Escape / red close button).
show_error_dialog() {
  local code=$1
  local title explanation actions_raw button_list result
  title="$(error_field "${code}" TITLE)"
  explanation="$(error_field "${code}" EXPLANATION)"
  actions_raw="$(error_field "${code}" ACTIONS)"

  local old_ifs=$IFS
  IFS='|'
  # Intentional word-splitting on the catalog's pipe-separated actions.
  # shellcheck disable=SC2086
  set -- $actions_raw
  IFS=$old_ifs

  button_list=""
  local b
  for b in "$@"; do
    button_list="${button_list}$(quote_applescript "${b}"), "
  done
  button_list=${button_list%, }

  result=$(osascript -e "display dialog $(quote_applescript "${explanation}") with title $(quote_applescript "${title}") buttons {${button_list}}" 2>/dev/null) || {
    printf ''
    return 0
  }
  printf '%s' "${result#button returned:}"
}

log "launch (devlaunch ${DEVLAUNCH_VERSION:-?}, mode=${DEVLAUNCH_MODE:-?})"

# ---------------------------------------------------------------------------
# 6b. Log rotation — rotated at 5 MB, keep 3 backups.
# ---------------------------------------------------------------------------
rotate_log_if_needed() {
  mkdir -p "${LOG_DIR}"
  [ -f "${LOG_FILE}" ] || return 0
  local size
  size=$(wc -c <"${LOG_FILE}" 2>/dev/null | tr -d ' ')
  [ -n "${size}" ] || return 0
  [ "${size}" -lt "${LOG_MAX_BYTES}" ] && return 0
  rm -f "${LOG_FILE}.3"
  [ -f "${LOG_FILE}.2" ] && mv "${LOG_FILE}.2" "${LOG_FILE}.3"
  [ -f "${LOG_FILE}.1" ] && mv "${LOG_FILE}.1" "${LOG_FILE}.2"
  mv "${LOG_FILE}" "${LOG_FILE}.1"
}

# ---------------------------------------------------------------------------
# 2. Project folder gone.
# ---------------------------------------------------------------------------
locate_folder_hint() {
  local chosen
  chosen=$(osascript -e 'POSIX path of (choose folder with prompt "Where did this project move to?")' 2>/dev/null) || return 0
  osascript -e "display dialog $(quote_applescript "To point this launcher at ${chosen}, run this in a terminal:

npx devlaunch init --cwd \"${chosen}\" --name \"${DEVLAUNCH_NAME}\"") with title $(quote_applescript "${DEVLAUNCH_NAME}") buttons {\"OK\"} default button \"OK\"" \
    >/dev/null 2>&1 || true
}

remove_app() {
  notify "${DEVLAUNCH_NAME}" "Removing this launcher…"
  ( sleep 1; rm -rf "${BUNDLE_DIR}" ) &
  disown 2>/dev/null || true
}

check_project_dir() {
  [ -d "${DEVLAUNCH_PROJECT_DIR}" ] && return 0
  log "PROJECT_MOVED: ${DEVLAUNCH_PROJECT_DIR} does not exist"
  case "$(show_error_dialog PROJECT_MOVED)" in
    "Locate Folder…") locate_folder_hint ;;
    "Remove App") remove_app ;;
  esac
  return 1
}

# ---------------------------------------------------------------------------
# 3. Single instance via PID file. Clean stale PID files.
# ---------------------------------------------------------------------------
stop_pid() {
  local pid=$1
  kill -TERM -- "-${pid}" 2>/dev/null || kill -TERM "${pid}" 2>/dev/null || true
  sleep 1
  if kill -0 "${pid}" 2>/dev/null; then
    kill -KILL -- "-${pid}" 2>/dev/null || kill -KILL "${pid}" 2>/dev/null || true
  fi
}

clean_stale_pid() {
  [ -f "${PID_FILE}" ] || return 0
  local pid
  pid=$(cat "${PID_FILE}" 2>/dev/null)
  if [ -z "${pid}" ] || ! kill -0 "${pid}" 2>/dev/null; then
    log "cleaning stale PID file (pid=${pid:-unknown})"
    rm -f "${PID_FILE}"
  fi
}

# Returns 0 to continue starting fresh, 1 if this invocation is done
# (already running and the user chose Open/Stop, or dismissed the menu).
check_single_instance() {
  mkdir -p "${RUN_DIR}"
  clean_stale_pid
  [ -f "${PID_FILE}" ] || return 0

  local pid choice
  pid=$(cat "${PID_FILE}")
  choice=$(osascript -e "display dialog $(quote_applescript "${DEVLAUNCH_NAME} is already running.") with title $(quote_applescript "${DEVLAUNCH_NAME}") buttons {\"Open\", \"Restart\", \"Stop\"} default button \"Open\"" 2>/dev/null) || return 1
  choice=${choice#button returned:}

  case "${choice}" in
    Open)
      open "http://localhost:${DEVLAUNCH_PORT:-3000}${DEVLAUNCH_OPEN_PATH}" >/dev/null 2>&1
      return 1
      ;;
    Restart)
      log "restarting (was pid ${pid})"
      stop_pid "${pid}"
      rm -f "${PID_FILE}"
      return 0
      ;;
    Stop)
      log "stopping (pid ${pid}) at user request"
      stop_pid "${pid}"
      rm -f "${PID_FILE}"
      return 1
      ;;
    *)
      return 1
      ;;
  esac
}

# ---------------------------------------------------------------------------
# 1. Node version.
# ---------------------------------------------------------------------------
ensure_node() {
  if ! command -v node >/dev/null 2>&1; then
    log "NODE_NOT_FOUND"
    handle_dialog_choice NODE_NOT_FOUND "$(show_error_dialog NODE_NOT_FOUND)"
    return 1
  fi

  [ -n "${DEVLAUNCH_NODE_VERSION:-}" ] || return 0

  local current
  current=$(node --version 2>/dev/null)
  current=${current#v}
  if [[ "${current}" == "${DEVLAUNCH_NODE_VERSION}"* ]]; then
    return 0
  fi

  # Try the usual version managers before giving up. Each is a no-op if not
  # installed (`command -v` already gated the login shell picking it up).
  if command -v nvm >/dev/null 2>&1; then
    nvm use "${DEVLAUNCH_NODE_VERSION}" >/dev/null 2>&1 || true
  fi
  if command -v fnm >/dev/null 2>&1; then
    eval "$(fnm env 2>/dev/null)" || true
    fnm use "${DEVLAUNCH_NODE_VERSION}" >/dev/null 2>&1 || true
  fi

  current=$(node --version 2>/dev/null)
  current=${current#v}
  if [[ "${current}" == "${DEVLAUNCH_NODE_VERSION}"* ]]; then
    return 0
  fi

  log "NODE_VERSION_MISSING: wanted ${DEVLAUNCH_NODE_VERSION}, have ${current}"
  handle_dialog_choice NODE_VERSION_MISSING "$(show_error_dialog NODE_VERSION_MISSING)"
  return 1
}

# ---------------------------------------------------------------------------
# 4. Dependencies — install if node_modules is missing or the lockfile
#    changed since the last successful install.
# ---------------------------------------------------------------------------
lockfile_name() {
  case "${DEVLAUNCH_PACKAGE_MANAGER}" in
    npm) printf 'package-lock.json' ;;
    pnpm) printf 'pnpm-lock.yaml' ;;
    yarn) printf 'yarn.lock' ;;
    bun)
      if [ -f "${DEVLAUNCH_PROJECT_DIR}/bun.lockb" ]; then
        printf 'bun.lockb'
      else
        printf 'bun.lock'
      fi
      ;;
    *) printf '' ;;
  esac
}

install_dependencies_if_needed() {
  local lockfile current_hash="" stored_hash="" need_install=0
  lockfile=$(lockfile_name)

  [ -d "${DEVLAUNCH_PROJECT_DIR}/node_modules" ] || need_install=1

  if [ -n "${lockfile}" ] && [ -f "${DEVLAUNCH_PROJECT_DIR}/${lockfile}" ]; then
    current_hash=$(shasum -a 256 "${DEVLAUNCH_PROJECT_DIR}/${lockfile}" | awk '{print $1}')
    [ -f "${LOCKHASH_FILE}" ] && stored_hash=$(cat "${LOCKHASH_FILE}")
    [ "${current_hash}" = "${stored_hash}" ] || need_install=1
  fi

  [ "${need_install}" -eq 1 ] || return 0

  notify "${DEVLAUNCH_NAME}" "Installing dependencies…"
  log "installing dependencies (${DEVLAUNCH_PACKAGE_MANAGER} install)"
  if ( cd "${DEVLAUNCH_PROJECT_DIR}" && "${DEVLAUNCH_PACKAGE_MANAGER}" install >>"${LOG_FILE}" 2>&1 ); then
    mkdir -p "${RUN_DIR}"
    # Recompute after installing, not before: a lockfile that didn't exist
    # yet (first install of a fresh clone) only appears once install runs.
    if [ -n "${lockfile}" ] && [ -f "${DEVLAUNCH_PROJECT_DIR}/${lockfile}" ]; then
      shasum -a 256 "${DEVLAUNCH_PROJECT_DIR}/${lockfile}" | awk '{print $1}' >"${LOCKHASH_FILE}"
    fi
    return 0
  fi

  log "DEPS_INSTALL_FAILED"
  handle_dialog_choice DEPS_INSTALL_FAILED "$(show_error_dialog DEPS_INSTALL_FAILED)"
  return 1
}

# ---------------------------------------------------------------------------
# 5. Port already in use.
# ---------------------------------------------------------------------------
find_listening_pid() {
  lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -n1
}

check_port() {
  [ -n "${DEVLAUNCH_PORT:-}" ] || return 0
  local pid
  pid=$(find_listening_pid "${DEVLAUNCH_PORT}")
  [ -n "${pid}" ] || return 0

  local pname
  pname=$(ps -p "${pid}" -o comm= 2>/dev/null)
  pname=${pname##*/}
  log "PORT_IN_USE: ${DEVLAUNCH_PORT} held by ${pname:-pid $pid}"

  case "$(show_error_dialog PORT_IN_USE)" in
    "Use Another Port")
      local candidate=$((DEVLAUNCH_PORT + 1)) tries=0
      while [ "${tries}" -lt 20 ]; do
        if [ -z "$(find_listening_pid "${candidate}")" ]; then
          notify "${DEVLAUNCH_NAME}" "Port ${DEVLAUNCH_PORT} was busy — using ${candidate} instead."
          log "using alternate port ${candidate}"
          DEVLAUNCH_PORT=${candidate}
          return 0
        fi
        candidate=$((candidate + 1))
        tries=$((tries + 1))
      done
      return 1
      ;;
    "Quit Other App")
      local confirm
      confirm=$(osascript -e "display dialog $(quote_applescript "Quit \"${pname}\" (process ${pid}) so ${DEVLAUNCH_NAME} can use port ${DEVLAUNCH_PORT}?") buttons {\"Cancel\", \"Quit\"} default button \"Quit\"" 2>/dev/null) || return 1
      case "${confirm}" in
        *Quit*)
          log "quitting pid ${pid} (${pname}) to free port ${DEVLAUNCH_PORT}"
          kill "${pid}" 2>/dev/null || true
          sleep 1
          return 0
          ;;
        *) return 1 ;;
      esac
      ;;
    *)
      return 1
      ;;
  esac
}

# ---------------------------------------------------------------------------
# 6a. Start — terminal or headless.
# ---------------------------------------------------------------------------
start_headless() {
  mkdir -p "${RUN_DIR}"
  ( cd "${DEVLAUNCH_PROJECT_DIR}" && exec "${DEVLAUNCH_PACKAGE_MANAGER}" run "${DEVLAUNCH_SCRIPT}" ) >>"${LOG_FILE}" 2>&1 &
  SERVER_PID=$!
  printf '%s' "${SERVER_PID}" >"${PID_FILE}"
  log "started headless (pid ${SERVER_PID})"
}

start_terminal() {
  mkdir -p "${RUN_DIR}"
  local wrapper="${RUN_DIR}/${DEVLAUNCH_SLUG}.terminal-cmd.sh"
  {
    printf '#!/bin/zsh -l\n'
    printf 'cd %s || exit 1\n' "$(quote_shell "${DEVLAUNCH_PROJECT_DIR}")"
    printf 'echo $$ >%s\n' "$(quote_shell "${PID_FILE}")"
    printf 'trap '\''rm -f %s'\'' EXIT\n' "$(quote_shell "${PID_FILE}")"
    printf '%s run %s 2>&1 | tee -a %s\n' \
      "$(quote_shell "${DEVLAUNCH_PACKAGE_MANAGER}")" \
      "$(quote_shell "${DEVLAUNCH_SCRIPT}")" \
      "$(quote_shell "${LOG_FILE}")"
  } >"${wrapper}"
  chmod +x "${wrapper}"
  osascript -e "tell application \"Terminal\" to do script $(quote_applescript "${wrapper}")" >/dev/null 2>&1 || true
  log "started in Terminal (wrapper ${wrapper})"
}

# ---------------------------------------------------------------------------
# 7. Ready detection: the ready-line regex (approximated here by a generic
#    localhost-URL match, since every framework devlaunch detects prints
#    one), falling back to polling the port.
# ---------------------------------------------------------------------------
wait_for_ready() {
  sleep 1 # give the process (or Terminal's wrapper) a moment to write its PID
  if [ -z "${SERVER_PID}" ] && [ -f "${PID_FILE}" ]; then
    SERVER_PID=$(cat "${PID_FILE}")
  fi

  local deadline
  deadline=$(($(date +%s) + ${DEVLAUNCH_READY_TIMEOUT_SECONDS:-90}))

  while [ "$(date +%s)" -lt "${deadline}" ]; do
    if [ -n "${SERVER_PID}" ] && ! kill -0 "${SERVER_PID}" 2>/dev/null; then
      log "SERVER_EXITED_EARLY (pid ${SERVER_PID})"
      handle_dialog_choice SERVER_EXITED_EARLY "$(show_error_dialog SERVER_EXITED_EARLY)"
      return 1
    fi

    if [ -f "${LOG_FILE}" ] && grep -Eqi 'https?://(localhost|127\.0\.0\.1|0\.0\.0\.0):[0-9]+' "${LOG_FILE}"; then
      return 0
    fi

    if [ -n "${DEVLAUNCH_PORT:-}" ] && nc -z -G 1 127.0.0.1 "${DEVLAUNCH_PORT}" 2>/dev/null; then
      return 0
    fi

    sleep 1
  done

  log "READY_TIMEOUT after ${DEVLAUNCH_READY_TIMEOUT_SECONDS:-90}s"
  handle_dialog_choice READY_TIMEOUT "$(show_error_dialog READY_TIMEOUT)"
  return 1
}

open_ready_browser() {
  local url="http://localhost:${DEVLAUNCH_PORT:-3000}${DEVLAUNCH_OPEN_PATH}"
  if [ -n "${DEVLAUNCH_BROWSER:-}" ]; then
    open -a "${DEVLAUNCH_BROWSER}" "${url}" >/dev/null 2>&1
  else
    open "${url}" >/dev/null 2>&1
  fi
  log "ready at ${url}"
  notify "${DEVLAUNCH_NAME}" "Ready at ${url}"
}

# ---------------------------------------------------------------------------
# Copy Report — runs the vendored CLI so the launcher can build a full,
# redacted report offline; falls back to a minimal shell-only report (same
# marker line, same redaction intent) if Node isn't available.
# ---------------------------------------------------------------------------
redact_line() {
  # Best-effort only: the real redaction (packages/core/src/redact) runs
  # when the vendored CLI is available. This exists solely for the
  # Node-unavailable fallback below.
  sed -E \
    -e 's/sk-[A-Za-z0-9]{16,}/[REDACTED]/g' \
    -e 's/gh[pousr]_[A-Za-z0-9]{20,}/[REDACTED]/g' \
    -e 's/AKIA[0-9A-Z]{16}/[REDACTED]/g' \
    -e 's/xox[baprs]-[A-Za-z0-9-]{10,}/[REDACTED]/g' \
    -e 's/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/[REDACTED]/g' \
    -e 's/([Bb]earer) [A-Za-z0-9._-]+/\1 [REDACTED]/g' \
    -e 's/([Pp]assword)[[:space:]]*=[[:space:]]*[^[:space:]]+/\1=[REDACTED]/g'
}

minimal_shell_report() {
  local code=$1
  printf 'devlaunch report v1\n\n'
  printf 'Error: %s — %s\n\n' "${code}" "$(error_field "${code}" TITLE)"
  printf 'Project: %s\n' "${DEVLAUNCH_PROJECT_DIR}"
  printf 'devlaunch: %s\n\n' "${DEVLAUNCH_VERSION:-unknown}"
  printf 'Logs (last 80 lines, redacted):\n'
  if [ -f "${LOG_FILE}" ]; then
    tail -n 80 "${LOG_FILE}" | redact_line
  fi
  # The backticks are literal markdown, not command substitution.
  # shellcheck disable=SC2016
  printf '\nRun `npx devlaunch doctor --json` for a full environment check.\n'
}

copy_report() {
  local code=$1
  if command -v node >/dev/null 2>&1 && [ -f "${RESOURCES_DIR}/devlaunch.mjs" ]; then
    if node "${RESOURCES_DIR}/devlaunch.mjs" report --clipboard --code "${code}" \
      --project-dir "${DEVLAUNCH_PROJECT_DIR}" --log-file "${LOG_FILE}" >/dev/null 2>&1; then
      notify "${DEVLAUNCH_NAME}" "Report copied. Paste it wherever you need it."
      return 0
    fi
  fi
  # Node unavailable, or the vendored CLI failed (e.g. `report` isn't wired
  # up yet) — fall back to a shell-only report with the same marker line.
  minimal_shell_report "${code}" | pbcopy
  notify "${DEVLAUNCH_NAME}" "Report copied (minimal — the full report needs Node)."
}

# Central place mapping a dialog's clicked button to an action, for the
# codes whose dialogs offer View Logs / Copy Report (see the error catalog).
handle_dialog_choice() {
  local code=$1 choice=$2
  case "${choice}" in
    "View Logs") open "${LOG_FILE}" >/dev/null 2>&1 || true ;;
    "Copy Report") copy_report "${code}" ;;
  esac
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
  rotate_log_if_needed
  check_project_dir || return 0
  check_single_instance || return 0
  ensure_node || return 0
  install_dependencies_if_needed || return 0
  check_port || return 0

  if [ "${DEVLAUNCH_MODE:-terminal}" = "headless" ]; then
    start_headless
  else
    start_terminal
  fi

  wait_for_ready || return 0
  open_ready_browser
}

main "$@"
