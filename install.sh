#!/usr/bin/env bash
# tokens-xyz-skill installer
# Usage: ./install.sh [-y]

set -euo pipefail

SKILL_NAME="tokens-xyz-skill"
REPO_URL="https://github.com/YOUR_GITHUB/tokens-xyz-skill"  # update before publishing
NON_INTERACTIVE=false

# ── Parse flags ────────────────────────────────────────────────────────────────
for arg in "$@"; do
  case $arg in
    -y|--yes) NON_INTERACTIVE=true ;;
  esac
done

# ── Helpers ────────────────────────────────────────────────────────────────────
info()    { echo "  ℹ️  $*"; }
success() { echo "  ✅ $*"; }
warn()    { echo "  ⚠️  $*"; }
error()   { echo "  ❌ $*" >&2; exit 1; }

confirm() {
  if $NON_INTERACTIVE; then return 0; fi
  read -r -p "   $1 [Y/n] " reply
  [[ "${reply:-Y}" =~ ^[Yy]$ ]]
}

# ── Banner ─────────────────────────────────────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   tokens-xyz-skill installer             ║"
echo "  ║   Tokens.xyz Asset Intelligence          ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""

# ── Install location ──────────────────────────────────────────────────────────
PERSONAL_DIR="$HOME/.claude/skills/$SKILL_NAME"
PROJECT_DIR="./.claude/skills/$SKILL_NAME"

if $NON_INTERACTIVE; then
  INSTALL_DIR="$PERSONAL_DIR"
else
  echo "  Where do you want to install?"
  echo "  1) Personal  → $PERSONAL_DIR"
  echo "  2) Project   → $PROJECT_DIR"
  echo "  3) Custom path"
  read -r -p "   Choice [1]: " loc_choice
  case "${loc_choice:-1}" in
    2) INSTALL_DIR="$PROJECT_DIR" ;;
    3) read -r -p "   Enter path: " INSTALL_DIR ;;
    *) INSTALL_DIR="$PERSONAL_DIR" ;;
  esac
fi

info "Installing to: $INSTALL_DIR"
mkdir -p "$INSTALL_DIR"

# ── Copy skill files ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

cp -r "$SCRIPT_DIR/skill"    "$INSTALL_DIR/"
cp -r "$SCRIPT_DIR/commands" "$INSTALL_DIR/"
cp -r "$SCRIPT_DIR/agents"   "$INSTALL_DIR/"
cp -r "$SCRIPT_DIR/rules"    "$INSTALL_DIR/"

success "Skill files installed"

# ── CLAUDE.md ─────────────────────────────────────────────────────────────────
if confirm "Copy CLAUDE.md to ~/.claude/?"; then
  mkdir -p "$HOME/.claude"
  if [[ -f "$HOME/.claude/CLAUDE.md" ]]; then
    warn "CLAUDE.md already exists — appending tokens-xyz-skill section"
    echo "" >> "$HOME/.claude/CLAUDE.md"
    cat "$SCRIPT_DIR/CLAUDE.md" >> "$HOME/.claude/CLAUDE.md"
  else
    cp "$SCRIPT_DIR/CLAUDE.md" "$HOME/.claude/CLAUDE.md"
  fi
  success "CLAUDE.md updated"
fi

# ── .env setup ────────────────────────────────────────────────────────────────
echo ""
echo "  ┌─────────────────────────────────────────────────────┐"
echo "  │  API Key Setup (Required)                           │"
echo "  └─────────────────────────────────────────────────────┘"
echo ""
echo "  This skill requires a Tokens.xyz API key."
echo ""
echo "  How to get one:"
echo "    1. Go to https://tokens.xyz"
echo "    2. Request API access (approved within 24h)"
echo "    3. Find your key in the API Manager dashboard"
echo "    4. If your key is 'legacy hash-only', regenerate it"
echo "       (the old key deactivates immediately)"
echo ""

ENV_FILE=".env"
if [[ ! -f "$ENV_FILE" ]]; then
  if confirm "Create a .env file in the current directory?"; then
    cat > "$ENV_FILE" <<'EOF'
# Tokens.xyz API Key
# Get yours at: https://tokens.xyz → API Manager
# NEVER commit this file to git
TOKENS_XYZ_API_KEY=your_key_here
EOF
    success ".env created — add your key to TOKENS_XYZ_API_KEY"
  fi
else
  if ! grep -q "TOKENS_XYZ_API_KEY" "$ENV_FILE"; then
    echo "" >> "$ENV_FILE"
    echo "# Tokens.xyz API Key — get yours at: https://tokens.xyz → API Manager" >> "$ENV_FILE"
    echo "TOKENS_XYZ_API_KEY=your_key_here" >> "$ENV_FILE"
    success "TOKENS_XYZ_API_KEY added to existing .env"
  else
    info ".env already has TOKENS_XYZ_API_KEY — skipping"
  fi
fi

# ── .gitignore ────────────────────────────────────────────────────────────────
GITIGNORE=".gitignore"
MISSING_ENTRIES=()

for entry in ".env" ".env.local" ".env.*.local"; do
  if [[ ! -f "$GITIGNORE" ]] || ! grep -qxF "$entry" "$GITIGNORE"; then
    MISSING_ENTRIES+=("$entry")
  fi
done

if [[ ${#MISSING_ENTRIES[@]} -gt 0 ]]; then
  if confirm "Add .env entries to .gitignore?"; then
    printf "%s\n" "${MISSING_ENTRIES[@]}" >> "$GITIGNORE"
    success ".gitignore updated (protects your API key from being committed)"
  else
    warn "⚠️  Make sure .env is in your .gitignore before committing!"
  fi
else
  success ".gitignore already protects .env files"
fi

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "  ╔══════════════════════════════════════════╗"
echo "  ║   Installation complete! 🎉              ║"
echo "  ╚══════════════════════════════════════════╝"
echo ""
echo "  Next steps:"
echo "  1. Add your key to .env: TOKENS_XYZ_API_KEY=your_key_here"
echo "  2. Load .env in your app (dotenv / python-dotenv)"
echo "  3. Try: /token-check solana"
echo ""
echo "  Skill docs: $INSTALL_DIR/skill/SKILL.md"
echo "  API docs:   https://docs.tokens.xyz/v1/quickstart"
echo ""