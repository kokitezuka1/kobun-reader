#!/bin/bash
#
#  古文リーダー ── GitHub Pages への公開スクリプト
#
#  Finder でこのファイルをダブルクリックすると、ターミナルが開いて公開まで行います。
#  初回は GitHub のログインとリポジトリ作成、二回目からは変更の push だけを行います。
#
set -uo pipefail
cd "$(dirname "$0")" || exit 1

BOLD=$'\033[1m'; DIM=$'\033[2m'; GREEN=$'\033[32m'; RED=$'\033[31m'; YEL=$'\033[33m'; OFF=$'\033[0m'
say()  { printf '%s\n' "$*"; }
step() { printf '\n%s▸ %s%s\n' "$BOLD" "$*" "$OFF"; }
ok()   { printf '%s  ✓ %s%s\n' "$GREEN" "$*" "$OFF"; }
warn() { printf '%s  ! %s%s\n' "$YEL" "$*" "$OFF"; }
die()  { printf '\n%s✗ %s%s\n' "$RED" "$*" "$OFF"; printf '\n'; read -n 1 -s -r -p "何かキーを押すと閉じます "; exit 1; }

printf '%s\n' "════════════════════════════════════════════"
printf '%s  古文リーダー を GitHub Pages に公開します%s\n' "$BOLD" "$OFF"
printf '%s\n' "════════════════════════════════════════════"

# ── 1. ページを組み直す ────────────────────────────────
step "ページを組み直しています"
command -v python3 >/dev/null 2>&1 || die "python3 が見つかりません。"
python3 build.py || die "build.py でエラーが起きました。"

# ── 2. 必要なコマンドの確認 ────────────────────────────
step "必要なコマンドを確認しています"
command -v git >/dev/null 2>&1 || die "git が見つかりません。Xcode Command Line Tools を入れてください： xcode-select --install"
ok "git"

if ! command -v gh >/dev/null 2>&1; then
  warn "GitHub CLI（gh）が入っていません。リポジトリの作成と Pages の設定に必要です。"
  if command -v brew >/dev/null 2>&1; then
    read -r -p "  Homebrew で今すぐ入れますか？ [y/N] " yn
    case "$yn" in
      [yY]*) brew install gh || die "gh のインストールに失敗しました。" ;;
      *)     die "gh を入れてから、もう一度このファイルをダブルクリックしてください。" ;;
    esac
  else
    die "Homebrew が無いため自動で入れられません。https://cli.github.com/ から gh を入れてください。"
  fi
fi
ok "gh"

if ! gh auth status >/dev/null 2>&1; then
  step "GitHub にログインします（ブラウザが開きます）"
  gh auth login || die "ログインに失敗しました。"
fi
GH_USER="$(gh api user --jq .login 2>/dev/null)"
[ -n "$GH_USER" ] || die "GitHub のユーザー名を取得できませんでした。"
ok "GitHub ユーザー： $GH_USER"

# ── 3. git リポジトリの用意 ────────────────────────────
if [ ! -d .git ]; then
  step "git リポジトリを作ります"
  git init -b main >/dev/null || die "git init に失敗しました。"
  ok "git init"
fi

if [ -z "$(git config user.email || true)" ]; then
  step "コミットに使う名前とメールアドレスを設定します"
  read -r -p "  名前: " GN;  [ -n "$GN" ] || die "名前が空です。"
  read -r -p "  メール: " GE; [ -n "$GE" ] || die "メールアドレスが空です。"
  git config user.name  "$GN"
  git config user.email "$GE"
fi

[ -f .gitignore ] || cat > .gitignore <<'EOF'
.DS_Store
.claude/
EOF
# GitHub Pages に Jekyll 処理をさせない
[ -f .nojekyll ] || : > .nojekyll

# ── 4. コミット ────────────────────────────────────────
step "変更をコミットします"
git add -A
if git diff --cached --quiet; then
  ok "変更はありませんでした"
else
  DEFMSG="サイトを更新（$(date '+%Y-%m-%d %H:%M')）"
  read -r -p "  コミットメッセージ [$DEFMSG]: " MSG
  git commit -q -m "${MSG:-$DEFMSG}" || die "コミットに失敗しました。"
  ok "コミットしました"
fi

# ── 5. リポジトリの作成 or push ───────────────────────
if ! git remote get-url origin >/dev/null 2>&1; then
  step "GitHub に新しいリポジトリを作ります"
  DEFREPO="kobun-reader"
  read -r -p "  リポジトリ名 [$DEFREPO]: " REPO
  REPO="${REPO:-$DEFREPO}"
  gh repo create "$REPO" --public --source=. --remote=origin --push \
    --description "古文の名文を縦書きで読み、語をクリックすると品詞・活用・意味が引ける学習サイト" \
    || die "リポジトリの作成に失敗しました。同じ名前が既にあるかもしれません。"
  ok "作成して push しました"
else
  step "GitHub に push します"
  git push -u origin main || die "push に失敗しました。"
  ok "push しました"
fi

SLUG="$(gh repo view --json nameWithOwner --jq .nameWithOwner)"
REPONAME="${SLUG#*/}"

# ── 6. GitHub Pages を有効にする ──────────────────────
step "GitHub Pages の設定を確認します"
if gh api "repos/$SLUG/pages" >/dev/null 2>&1; then
  ok "Pages は有効になっています"
else
  if gh api --method POST "repos/$SLUG/pages" \
       -f "source[branch]=main" -f "source[path]=/" >/dev/null 2>&1; then
    ok "Pages を有効にしました"
  else
    warn "Pages を自動で有効にできませんでした。"
    say  "   https://github.com/$SLUG/settings/pages を開き、"
    say  "   Source を「Deploy from a branch」→ main / (root) にしてください。"
  fi
fi

URL="https://${GH_USER}.github.io/${REPONAME}/"
printf '\n%s════════════════════════════════════════════%s\n' "$BOLD" "$OFF"
printf '%s  公開しました%s\n' "$GREEN$BOLD" "$OFF"
printf '  %s%s%s\n' "$BOLD" "$URL" "$OFF"
printf '%s  初回は反映まで1〜2分かかります。%s\n' "$DIM" "$OFF"
printf '%s  リポジトリ： https://github.com/%s%s\n' "$DIM" "$SLUG" "$OFF"
printf '%s════════════════════════════════════════════%s\n\n' "$BOLD" "$OFF"

read -r -p "ブラウザで開きますか？ [Y/n] " yn
case "$yn" in [nN]*) ;; *) open "$URL" ;; esac

printf '\n'
read -n 1 -s -r -p "何かキーを押すと閉じます "
printf '\n'
