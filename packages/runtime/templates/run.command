#!/bin/sh
# devlaunch .command wrapper — PLACEHOLDER
#
# Double-clicking a .command file opens Terminal and runs it. The generated
# version forwards to the launcher inside the .app bundle so non-technical
# teammates can start the project without touching a shell.

set -eu

BUNDLE_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)

echo "devlaunch: this is a placeholder wrapper in ${BUNDLE_DIR}"
echo "devlaunch: the generated version will exec the bundled launcher.sh"
