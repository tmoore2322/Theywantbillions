#!/usr/bin/env bash
# They Want Billions — launcher. Serves the folder locally and opens the game.
cd "$(dirname "$0")"
PORT=${PORT:-8765}
python3 dev/serve.py "$PORT" >/dev/null 2>&1 &
SRV=$!
sleep 0.5
URL="http://127.0.0.1:$PORT/index.html"
echo "They Want Billions running at $URL  (Ctrl+C to stop)"
if command -v xdg-open >/dev/null; then xdg-open "$URL" >/dev/null 2>&1; else echo "Open $URL in your browser."; fi
trap "kill $SRV 2>/dev/null" EXIT
wait $SRV
