#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
HOOKS_DIR="$ROOT_DIR/.git/hooks"
TARGET_HOOK="$HOOKS_DIR/pre-commit"
SOURCE_HOOK="$ROOT_DIR/scripts/git-hooks/pre-commit"

if [[ ! -f "$SOURCE_HOOK" ]]; then
  echo "pre-commit template not found at $SOURCE_HOOK" >&2
  exit 1
fi

mkdir -p "$HOOKS_DIR"
cp "$SOURCE_HOOK" "$TARGET_HOOK"
chmod +x "$TARGET_HOOK"

echo "Installed pre-commit hook -> $TARGET_HOOK"
