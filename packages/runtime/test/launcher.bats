#!/usr/bin/env bats
# Shell template tests. Run with bats-core:  bats packages/runtime/test
# CI also runs ShellCheck against the same templates.

TEMPLATES="${BATS_TEST_DIRNAME}/../templates"

@test "launcher.sh is syntactically valid POSIX sh" {
  run sh -n "${TEMPLATES}/launcher.sh"
  [ "$status" -eq 0 ]
}

@test "run.command is syntactically valid POSIX sh" {
  run sh -n "${TEMPLATES}/run.command"
  [ "$status" -eq 0 ]
}

@test "launcher.sh prints usage and exits 64 with no arguments" {
  run sh "${TEMPLATES}/launcher.sh"
  [ "$status" -eq 64 ]
  [[ "$output" == *"Usage:"* ]]
}

@test "launcher.sh --help exits 0" {
  run sh "${TEMPLATES}/launcher.sh" --help
  [ "$status" -eq 0 ]
}

@test "launcher.sh rejects a missing project directory" {
  run sh "${TEMPLATES}/launcher.sh" /no/such/dir/devlaunch
  [ "$status" -eq 66 ]
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
