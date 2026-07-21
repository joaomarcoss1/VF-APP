import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const nextCli = require.resolve('next/dist/bin/next')

const env = {
  ...process.env,
  NEXT_TELEMETRY_DISABLED: '1',
}

console.log('VF Nexus build estável: executando Next via Node, compatível com Windows/Vercel...')

const result = spawnSync(process.execPath, [nextCli, 'build', '--webpack'], {
  stdio: 'inherit',
  env,
})

if (result.error) {
  console.error(result.error)
  process.exit(1)
}

process.exit(result.status ?? 1)
