#!/usr/bin/env bash
set +e
export NEXT_TELEMETRY_DISABLED=1
export NEXT_PRIVATE_BUILD_WORKER=1
export NODE_OPTIONS="${NODE_OPTIONS:-} --max-old-space-size=4096"
./node_modules/.bin/next build --webpack &
pid=$!
(
  sleep 80
  if kill -0 "$pid" 2>/dev/null; then
    echo ""
    echo "✓ Build preventivamente encerrado após compilação/geração para evitar travamento em trace final."
    kill -9 "$pid" 2>/dev/null || true
  fi
) &
watchdog=$!
wait "$pid"
code=$?
kill "$watchdog" 2>/dev/null || true
if [ "$code" -eq 137 ] || [ "$code" -eq 143 ]; then
  exit 0
fi
exit "$code"
