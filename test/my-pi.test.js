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
const dailyModels = 'openai-codex/gpt-5.3-codex-spark:low,openai-codex/gpt-5.5:xhigh'

const withSystemPrompt = (args) => ['--append-system-prompt', systemPrompt, ...args]

const assertToolList = (record, expectedTools) => {
  const toolIndex = record.args.indexOf('--tools')

  assert.notEqual(toolIndex, -1)
  assert.equal(record.args[toolIndex + 1], expectedTools)
}

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

test('myPi_routerProfile_addsDailyModelCyclingArgs', () => {
  const record = runWrapper(['router', 'route this'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--models',
    dailyModels,
    'route this',
  ]))
})

test('myPi_askAlias_usesPrintMode', () => {
  const record = runWrapper(['ask', 'quick question'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '-p',
    'quick question',
  ]))
})

test('myPi_codeAlias_usesDefaultFastProfile', () => {
  const record = runWrapper(['code', 'implement feature'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    'implement feature',
  ]))
})

test('myPi_reviewAlias_usesReadOnlyPrintMode', () => {
  const record = runWrapper(['review', 'review diff'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--tools',
    'read,grep,find,ls',
    '-p',
    'review diff',
  ]))
  assertToolList(record, 'read,grep,find,ls')
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
    'read,grep,find,ls',
    '-p',
    'review diff',
  ]))
  assertToolList(record, 'read,grep,find,ls')
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
    'read,grep,find,ls',
    '-p',
    'review diff',
  ]))
  assertToolList(record, 'read,grep,find,ls')
})

test('myPi_planAlias_usesPlanningArgs', () => {
  const record = runWrapper(['plan', 'design milestone'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
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
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--append-system-prompt',
    'Fix narrowly. Inspect real state, edit only needed files, test before reporting done.',
    'bug',
  ]))
})

test('myPi_commitAlias_usesCommitArgs', () => {
  const record = runWrapper(['commit', 'current diff'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
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
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
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
  assertToolList(record, 'read,grep,find,ls,bash')
})

test('myPi_shipAlias_usesDefaultFastProfile', () => {
  const record = runWrapper(['ship', 'implement feature'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--append-system-prompt',
    'Implement explicitly. Edit, test, document, and verify before reporting done.',
    'implement feature',
  ]))
})

test('myPi_shipAliasWithDeepProfile_usesDeepProfile', () => {
  const record = runWrapper(['ship', '--profile', 'deep', 'hard implementation'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.5',
    '--thinking',
    'xhigh',
    '--append-system-prompt',
    'Implement explicitly. Edit, test, document, and verify before reporting done.',
    'hard implementation',
  ]))
})

test('myPi_shipAliasWithRouterProfile_addsModelCyclingArgs', () => {
  const record = runWrapper(['ship', '--profile', 'router', 'uncertain implementation'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--models',
    dailyModels,
    '--append-system-prompt',
    'Implement explicitly. Edit, test, document, and verify before reporting done.',
    'uncertain implementation',
  ]))
})

test('myPi_continueAlias_forwardsContinueWithPrompt', () => {
  const record = runWrapper(['continue', 'finish this'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--continue',
    'finish this',
  ]))
})

test('myPi_resumeAlias_forwardsResume', () => {
  const record = runWrapper(['resume'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--resume',
  ]))
})

test('myPi_resumeAlias_preservesPromptArgs', () => {
  const record = runWrapper(['resume', 'continue from selection'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--resume',
    'continue from selection',
  ]))
})

test('myPi_forkAlias_forwardsForkSessionId', () => {
  const record = runWrapper(['fork', 'session-123'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--fork',
    'session-123',
  ]))
})

test('myPi_forkAlias_preservesArgsAfterSessionId', () => {
  const record = runWrapper(['fork', 'session-123', 'try another path'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--fork',
    'session-123',
    'try another path',
  ]))
})

test('myPi_exportAlias_forwardsExportSessionId', () => {
  const record = runWrapper(['export', 'session-123'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--export',
    'session-123',
  ]))
})

test('myPi_exportAlias_preservesOutputPath', () => {
  const record = runWrapper(['export', 'session-123', 'session.html'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--export',
    'session-123',
    'session.html',
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

test('myPi_workProfileFlag_usesCopilotOnlyWhenForced', () => {
  const record = runWrapper(['--profile', 'work', 'quick task'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'github-copilot',
    '--model',
    'gpt-5.5',
    '--thinking',
    'medium',
    'quick task',
  ]))
})

test('myPi_routerProfileFlag_addsDailyModelCyclingArgs', () => {
  const record = runWrapper(['--profile', 'router', 'quick task'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--models',
    dailyModels,
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
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--tools',
    'read,grep,find,ls',
    '-p',
    'check',
    '--profile',
    'literal',
  ]))
})

test('myPi_defaultArgs_appendsSystemPrompt', () => {
  const record = runWrapper(['hello'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    'hello',
  ]))
})

test('myPi_promptOptOut_skipsSystemPrompt', () => {
  const { record, result } = runWrapperResult(['hello'], { MY_PI_NO_PROMPT: '1' })

  assert.equal(result.status, 0)
  assert.deepEqual(record.args, [
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    'hello',
  ])
})

test('myPi_promptOptOut_skipsTaskPrompt', () => {
  const { record, result } = runWrapperResult(['plan', 'raw plan'], { MY_PI_NO_PROMPT: '1' })

  assert.equal(result.status, 0)
  assert.deepEqual(record.args, [
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
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
