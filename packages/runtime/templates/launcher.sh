#!/bin/sh
# devlaunch launcher — PLACEHOLDER
#
# The real script is generated per project by @devlaunch/core and embedded in a
# macOS .app bundle. At runtime it will:
#   1. cd into the absolute project directory (baked in at generate time)
#   2. select the detected Node version
#   3. start the detected dev script with the detected package manager
#   4. wait for the port to accept connections, then open the browser
#   5. surface any failure as a native macOS dialog with an action
#
# This template contains no project logic yet. It only proves out the contract
# and the shell test / ShellCheck wiring.

set -eu

PROG="devlaunch-launcher"

usage() {
  cat <<EOF
${PROG} (placeholder)

Usage: ${PROG} <project-dir>

Generated launchers embed their own project directory and take no arguments.
This placeholder just validates input and exits.
EOF
}

main() {
  if [ "$#" -ne 1 ]; then
    usage >&2
    return 64
  fi

  case "$1" in
    -h | --help)
      usage
      return 0
      ;;
  esac

  project_dir="$1"

  if [ ! -d "${project_dir}" ]; then
    echo "${PROG}: not a directory: ${project_dir}" >&2
    return 66
  fi

  echo "${PROG}: would start the dev server in ${project_dir} (not implemented yet)"
  return 0
}

main "$@"
