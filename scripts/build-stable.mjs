import { spawnSync } from 'node:child_process'
const isWindows = process.platform === 'win32'
if (!isWindows) {
  const res = spawnSync('bash', ['scripts/build-stable.sh'], { stdio: 'inherit' })
  process.exit(res.status ?? 1)
}
const res = spawnSync('node_modules/.bin/next.cmd', ['build', '--webpack'], { stdio: 'inherit', shell: true, env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1' } })
process.exit(res.status ?? 1)
