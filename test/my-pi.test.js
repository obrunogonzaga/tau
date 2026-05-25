import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const repoDir = path.resolve(import.meta.dirname, '..')
const wrapperPath = path.join(repoDir, 'bin', 'my-pi.js')
const promptPath = path.join(repoDir, 'prompts', 'system-prompt.md')
const systemPrompt = fs.readFileSync(promptPath, 'utf8').trim()

const withSystemPrompt = (args) => ['--append-system-prompt', systemPrompt, ...args]

const runWrapperResult = (args, env = {}) => {
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

  const result = spawnSync(process.execPath, [wrapperPath, ...args], {
    env: {
      ...process.env,
      MY_PI_BANNER: '0',
      MY_PI_TEST_RECORD: recordPath,
      PATH: `${binDir}:${process.env.PATH}`,
      ...env,
    },
    encoding: 'utf8',
  })

  const record = fs.existsSync(recordPath) ? JSON.parse(fs.readFileSync(recordPath, 'utf8')) : null

  return { record, result }
}

const runWrapper = (args) => {
  const { record, result } = runWrapperResult(args)

  assert.equal(result.status, 0)

  return record
}

test('myPi_fastProfile_prependsFastModelArgs', () => {
  const record = runWrapper(['fast', 'hello'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    'hello',
  ]))
  assert.equal(record.agentDir, path.join(os.homedir(), '.pi', 'agent'))
  assert.equal(record.sessionDir, path.join(os.homedir(), '.pi', 'my-pi', 'sessions'))
})

test('myPi_workProfile_prependsCopilotArgs', () => {
  const record = runWrapper(['work', 'ship it'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'github-copilot',
    '--model',
    'gpt-5.5',
    '--thinking',
    'medium',
    'ship it',
  ]))
})

test('myPi_deepProfile_prependsOpenAiCodexArgs', () => {
  const record = runWrapper(['deep', 'debug hard bug'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.5',
    '--thinking',
    'xhigh',
    'debug hard bug',
  ]))
})

test('myPi_askAlias_usesPrintMode', () => {
  const record = runWrapper(['ask', 'quick question'])

  assert.deepEqual(record.args, withSystemPrompt(['-p', 'quick question']))
})

test('myPi_codeAlias_usesWorkProfile', () => {
  const record = runWrapper(['code', 'implement feature'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'github-copilot',
    '--model',
    'gpt-5.5',
    '--thinking',
    'medium',
    'implement feature',
  ]))
})

test('myPi_reviewAlias_usesReadOnlyPrintMode', () => {
  const record = runWrapper(['review', 'review diff'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'github-copilot',
    '--model',
    'gpt-5.5',
    '--thinking',
    'medium',
    '--tools',
    'read,grep,find,ls,bash',
    '-p',
    'review diff',
  ]))
})

test('myPi_reviewAliasWithDeepProfile_usesDeepReadOnlyPrintMode', () => {
  const record = runWrapper(['review', '--profile', 'deep', 'review diff'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.5',
    '--thinking',
    'xhigh',
    '--tools',
    'read,grep,find,ls,bash',
    '-p',
    'review diff',
  ]))
})

test('myPi_reviewAliasWithEqualsProfile_usesDeepReadOnlyPrintMode', () => {
  const record = runWrapper(['review', '--profile=deep', 'review diff'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.5',
    '--thinking',
    'xhigh',
    '--tools',
    'read,grep,find,ls,bash',
    '-p',
    'review diff',
  ]))
})

test('myPi_planAlias_usesPlanningArgs', () => {
  const record = runWrapper(['plan', 'design milestone'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'github-copilot',
    '--model',
    'gpt-5.5',
    '--thinking',
    'medium',
    '--tools',
    'read,grep,find,ls',
    '-p',
    '--append-system-prompt',
    'Plan first. Do not implement unless explicitly asked. End with unresolved questions.',
    'design milestone',
  ]))
})

test('myPi_grillAlias_usesCriticalReviewArgs', () => {
  const record = runWrapper(['grill', 'review plan'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.5',
    '--thinking',
    'xhigh',
    '--tools',
    'read,grep,find,ls',
    '-p',
    '--append-system-prompt',
    'Critique the plan hard. Surface risks, weak assumptions, missing tests, and open questions.',
    'review plan',
  ]))
})

test('myPi_fixAlias_usesFocusedWorkArgs', () => {
  const record = runWrapper(['fix', 'bug'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'github-copilot',
    '--model',
    'gpt-5.5',
    '--thinking',
    'medium',
    '--append-system-prompt',
    'Fix narrowly. Inspect real state, edit only needed files, test before reporting done.',
    'bug',
  ]))
})

test('myPi_commitAlias_usesCommitArgs', () => {
  const record = runWrapper(['commit', 'current diff'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'github-copilot',
    '--model',
    'gpt-5.5',
    '--thinking',
    'medium',
    '--tools',
    'read,grep,find,ls,bash',
    '-p',
    '--append-system-prompt',
    'Prepare concise conventional commit guidance. Inspect state before proposing text.',
    'current diff',
  ]))
})

test('myPi_prAlias_usesPrArgs', () => {
  const record = runWrapper(['pr', 'current branch'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'github-copilot',
    '--model',
    'gpt-5.5',
    '--thinking',
    'medium',
    '--tools',
    'read,grep,find,ls,bash',
    '-p',
    '--append-system-prompt',
    'Prepare concise PR text with summary, tests, risks, and checklist.',
    'current branch',
  ]))
})

test('myPi_debugAlias_usesDebugArgs', () => {
  const record = runWrapper(['debug', 'repro failure'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.5',
    '--thinking',
    'xhigh',
    '--tools',
    'read,grep,find,ls,bash',
    '-p',
    '--append-system-prompt',
    'Investigate first. Reproduce, isolate evidence, then suggest the smallest fix.',
    'repro failure',
  ]))
})

test('myPi_profileFlag_usesProfile', () => {
  const record = runWrapper(['--profile', 'fast', 'quick task'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    'quick task',
  ]))
})

test('myPi_equalsProfileFlag_usesProfile', () => {
  const record = runWrapper(['--profile=fast', 'quick task'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    'quick task',
  ]))
})

test('myPi_profileTextAfterPromptStart_preservesPromptText', () => {
  const record = runWrapper(['review', 'check', '--profile', 'literal'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'github-copilot',
    '--model',
    'gpt-5.5',
    '--thinking',
    'medium',
    '--tools',
    'read,grep,find,ls,bash',
    '-p',
    'check',
    '--profile',
    'literal',
  ]))
})

test('myPi_defaultArgs_appendsSystemPrompt', () => {
  const record = runWrapper(['hello'])

  assert.deepEqual(record.args, withSystemPrompt(['hello']))
})

test('myPi_promptOptOut_skipsSystemPrompt', () => {
  const { record, result } = runWrapperResult(['hello'], { MY_PI_NO_PROMPT: '1' })

  assert.equal(result.status, 0)
  assert.deepEqual(record.args, ['hello'])
})

test('myPi_promptOptOut_skipsTaskPrompt', () => {
  const { record, result } = runWrapperResult(['plan', 'raw plan'], { MY_PI_NO_PROMPT: '1' })

  assert.equal(result.status, 0)
  assert.deepEqual(record.args, [
    '--provider',
    'github-copilot',
    '--model',
    'gpt-5.5',
    '--thinking',
    'medium',
    '--tools',
    'read,grep,find,ls',
    '-p',
    'raw plan',
  ])
})

test('myPi_unknownProfile_failsFast', () => {
  const { result } = runWrapperResult(['review', '--profile', 'missing', 'review diff'])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Unknown profile: missing/)
})

test('myPi_missingProfileValue_failsFast', () => {
  const { result } = runWrapperResult(['review', '--profile'])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Missing value for --profile/)
})
