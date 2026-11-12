#!/bin/zsh
unsetopt BG_NICE
cd -- "$(dirname "$0")"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"
if ! command -v node >/dev/null 2>&1; then
  echo 'Node.js 22 이상이 필요합니다. https://nodejs.org 에서 설치한 뒤 다시 실행해 주세요.'
  read -k 1 '?아무 키나 누르면 닫힙니다.'
  exit 1
fi
if [ ! -d node_modules/ai ]; then
  npm ci --cache "${TMPDIR:-/tmp}/love-exception-npm-cache" || exit 1
fi
GAME_PORT=$(node --input-type=module -e "for (const file of ['.env.local', '.env']) { try { process.loadEnvFile(file) } catch {} } console.log(process.env.PORT || 3210)")
GAME_URL="http://127.0.0.1:$GAME_PORT"
launch_game() {
  local chrome_binary='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
  if [ -x "$chrome_binary" ]; then
    "$chrome_binary" \
      --user-data-dir="$PWD/.game-browser" \
      --autoplay-policy=no-user-gesture-required \
      --no-first-run --no-default-browser-check \
      --window-size=1463,800 \
      --app="$GAME_URL" >/dev/null 2>&1 &!
  else
    echo 'Chrome이 없어 기본 브라우저로 엽니다. 자동재생은 브라우저에서 허용해야 합니다.'
    open "$GAME_URL"
  fi
}
server_ready() {
  curl -fsS "$GAME_URL/api/status" 2>/dev/null | /usr/bin/grep -q 'love-exception'
}
if server_ready; then
  launch_game
  exit 0
fi
(
  for attempt in {1..60}; do
    if server_ready; then
      launch_game
      exit 0
    fi
    sleep 0.5
  done
  echo '게임 서버가 준비되지 않았습니다. 실행 창의 오류를 확인해 주세요.'
) &
node server.mjs
