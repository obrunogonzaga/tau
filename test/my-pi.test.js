import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const repoDir = path.resolve(import.meta.dirname, '..')
const wrapperPath = path.join(repoDir, 'bin', 'my-pi.js')

test('myPi_fastProfile_prependsFastModelArgs', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'my-pi-'))
  const binDir = path.join(tempDir, 'bin')
  const recordPath = path.join(tempDir, 'record.json')

  fs.mkdirSync(binDir)
  fs.writeFileSync(
    path.join(binDir, 'pi'),
    `#!/usr/bin/env node
import fs from 'node:fs'
fs.writeFileSync(process.env.MY_PI_TEST_RECORD, JSON.stringify({
  args: process.argv.slice(2),
  agentDir: process.env.PI_CODING_AGENT_DIR,
  sessionDir: process.env.PI_CODING_AGENT_SESSION_DIR
}))
`,
    { mode: 0o755 },
  )

  const result = spawnSync(process.execPath, [wrapperPath, 'fast', 'hello'], {
    env: {
      ...process.env,
      MY_PI_BANNER: '0',
      MY_PI_TEST_RECORD: recordPath,
      PATH: `${binDir}:${process.env.PATH}`,
    },
    encoding: 'utf8',
  })

  assert.equal(result.status, 0)

  const record = JSON.parse(fs.readFileSync(recordPath, 'utf8'))

  assert.deepEqual(record.args, [
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    'hello',
  ])
  assert.equal(record.agentDir, path.join(os.homedir(), '.pi', 'agent'))
  assert.equal(record.sessionDir, path.join(os.homedir(), '.pi', 'agent', 'sessions'))
})
