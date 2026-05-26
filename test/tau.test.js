import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import test from 'node:test'

const repoDir = path.resolve(import.meta.dirname, '..')
const wrapperPath = path.join(repoDir, 'bin', 'tau.js')
const promptPath = path.join(repoDir, 'prompts', 'system-prompt.md')
const configPath = path.join(repoDir, 'config', 'tau.config.json')
const systemPrompt = fs.readFileSync(promptPath, 'utf8').trim()
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
const dailyModels = 'openai-codex/gpt-5.3-codex-spark:low,openai-codex/gpt-5.5:xhigh'
const extensionPath = (name) => path.join(repoDir, 'extensions', name)

const withSystemPrompt = (args) => ['--append-system-prompt', systemPrompt, ...args]

const assertToolList = (record, expectedTools) => {
  const toolIndex = record.args.indexOf('--tools')

  assert.notEqual(toolIndex, -1)
  assert.equal(record.args[toolIndex + 1], expectedTools)
}

const runWrapperResult = (args, env = {}) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tau-'))
  const binDir = path.join(tempDir, 'bin')
  const recordPath = path.join(tempDir, 'record.json')

  fs.mkdirSync(binDir)
  fs.writeFileSync(
    path.join(binDir, 'pi'),
    `#!/usr/bin/env node
import fs from 'node:fs'
fs.writeFileSync(process.env.TAU_TEST_RECORD, JSON.stringify({
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
      TAU_BANNER: '0',
      TAU_TEST_RECORD: recordPath,
      PATH: `${binDir}:${process.env.PATH}`,
      ...env,
    },
    encoding: 'utf8',
  })

  const record = fs.existsSync(recordPath) ? JSON.parse(fs.readFileSync(recordPath, 'utf8')) : null

  return { record, result }
}

const writeExecutable = (filePath, content) => {
  fs.writeFileSync(filePath, content, { mode: 0o755 })
}

const runDoctorResult = ({ env = {}, settings = true, pi = true, tmux = null } = {}) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tau-doctor-'))
  const binDir = path.join(tempDir, 'bin')
  const homeDir = path.join(tempDir, 'home')
  const settingsPath = path.join(homeDir, '.pi', 'agent', 'settings.json')

  fs.mkdirSync(binDir)
  if (settings) {
    fs.mkdirSync(path.dirname(settingsPath), { recursive: true })
    fs.writeFileSync(settingsPath, '{}')
  }
  if (pi) {
    writeExecutable(path.join(binDir, 'pi'), '#!/bin/sh\necho "pi 1.0.0"\n')
  }
  if (tmux !== null) {
    writeExecutable(path.join(binDir, 'tmux'), `#!/bin/sh\necho ${JSON.stringify(tmux)}\n`)
  }

  return spawnSync(process.execPath, [wrapperPath, 'doctor'], {
    env: {
      ...process.env,
      HOME: homeDir,
      TAU_BANNER: '0',
      PATH: binDir,
      ...env,
    },
    encoding: 'utf8',
  })
}

const runWrapper = (args) => {
  const { record, result } = runWrapperResult(args)

  assert.equal(result.status, 0)

  return record
}

test('tau_fastProfile_prependsFastModelArgs', () => {
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
  assert.equal(record.sessionDir, path.join(os.homedir(), '.pi', 'tau', 'sessions'))
})

test('tau_noArgs_loadsTauBanner', () => {
  const record = runWrapper([])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '-e',
    extensionPath('tau-banner.ts'),
  ]))
})

test('tau_workProfile_prependsCopilotArgs', () => {
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

test('tau_deepProfile_prependsOpenAiCodexArgs', () => {
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

test('tau_routerProfile_addsDailyModelCyclingArgs', () => {
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

test('tau_configFile_containsProfilesAndAliases', () => {
  assert.deepEqual(Object.keys(config.profiles).sort(), ['deep', 'fast', 'router', 'work'])
  assert.deepEqual(Object.keys(config.aliases).sort(), [
    'ask',
    'code',
    'commit',
    'continue',
    'debug',
    'export',
    'fix',
    'fork',
    'grill',
    'plan',
    'pr',
    'resume',
    'review',
    'ship',
  ])
  assert.deepEqual(Object.keys(config.extensionPresets).sort(), [
    'banner',
    'chain',
    'damage',
    'damage-continue',
    'focus',
    'minimal',
    'safe',
    'team',
  ])
})

test('tau_extBanner_expandsBannerPreset', () => {
  const record = runWrapper(['ext', 'banner'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '-e',
    extensionPath('tau-banner.ts'),
  ]))
})

test('tau_extMinimal_expandsExtensionPreset', () => {
  const record = runWrapper(['ext', 'minimal', 'focus now'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '-e',
    extensionPath('tau-banner.ts'),
    '-e',
    extensionPath('status-footer.ts'),
    'focus now',
  ]))
})

test('tau_extFocus_expandsStackedExtensionPreset', () => {
  const record = runWrapper(['ext', 'focus', 'work clean'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '-e',
    extensionPath('purpose-gate.ts'),
    '-e',
    extensionPath('task-discipline.ts'),
    '-e',
    extensionPath('pure-focus.ts'),
    '-e',
    extensionPath('status-footer.ts'),
    'work clean',
  ]))
})

test('tau_extSafe_expandsToolCounterPreset', () => {
  const record = runWrapper(['ext', 'safe', 'watch tools'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '-e',
    extensionPath('tau-banner.ts'),
    '-e',
    extensionPath('purpose-gate.ts'),
    '-e',
    extensionPath('task-discipline.ts'),
    '-e',
    extensionPath('damage-control.ts'),
    '-e',
    extensionPath('status-footer.ts'),
    '-e',
    extensionPath('tool-counter-footer.ts'),
    '--append-system-prompt',
    'Use purpose and task discipline. Damage control is active; continue with safe alternatives when blocked.',
    'watch tools',
  ]))
})

test('tau_extDamage_expandsDamageControlPreset', () => {
  const record = runWrapper(['ext', 'damage', 'protect this'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '-e',
    extensionPath('tau-banner.ts'),
    '-e',
    extensionPath('damage-control.ts'),
    '-e',
    extensionPath('status-footer.ts'),
    '-e',
    extensionPath('tool-counter-footer.ts'),
    '--append-system-prompt',
    'Damage control active. If a tool is blocked, continue with a safe alternative and explain the smaller next step.',
    'protect this',
  ]))
})

test('tau_extDamageContinue_expandsContinuePrompt', () => {
  const record = runWrapper(['ext', 'damage-continue', 'keep going'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '-e',
    extensionPath('tau-banner.ts'),
    '-e',
    extensionPath('damage-control.ts'),
    '-e',
    extensionPath('status-footer.ts'),
    '-e',
    extensionPath('tool-counter-footer.ts'),
    '--append-system-prompt',
    'Damage control continue mode. Treat blocks as feedback. Do not stop; choose a safe read-only or narrower alternative.',
    'keep going',
  ]))
})

test('tau_extUnknownPreset_failsFast', () => {
  const { result } = runWrapperResult(['ext', 'missing'])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Unknown extension preset: missing/)
})

test('tau_extensionStructure_containsLocalPiFolders', () => {
  const requiredPaths = [
    '.pi/agents',
    '.pi/chains',
    '.pi/damage-control-rules.yaml',
    '.pi/extensions',
    '.pi/rules',
    '.pi/teams',
    '.pi/themes',
    'extensions/damage-control.ts',
    'extensions/purpose-gate.ts',
    'extensions/task-discipline.ts',
    'extensions/tau-banner.ts',
    'extensions/status-footer.ts',
    'extensions/tool-counter-footer.ts',
  ]

  for (const requiredPath of requiredPaths) {
    assert.equal(fs.existsSync(path.join(repoDir, requiredPath)), true, requiredPath)
  }
})

test('tau_damageControlRules_coverDestructiveAndSensitiveDefaults', () => {
  const rulesPath = path.join(repoDir, '.pi', 'damage-control-rules.yaml')
  const rules = fs.readFileSync(rulesPath, 'utf8')
  const section = (name) => {
    const lines = rules.split('\n')
    const start = lines.findIndex((line) => line.trim() === `${name}:`)
    const rest = lines.slice(start + 1)
    const items = rest.slice(0, rest.findIndex((line) => /^\S/.test(line)) === -1 ? rest.length : rest.findIndex((line) => /^\S/.test(line)))

    return items
      .map((line) => line.match(/^\s*-\s*"(.+)"\s*$/)?.[1])
      .filter(Boolean)
      .map((rule) => new RegExp(JSON.parse(`"${rule}"`)))
  }

  const destructiveCommands = section('destructiveCommands')
  const sensitivePaths = section('sensitivePaths')

  assert.equal(destructiveCommands.some((rule) => rule.test('rm -rf dist')), true)
  assert.equal(destructiveCommands.some((rule) => rule.test('git reset --hard HEAD')), true)
  assert.equal(sensitivePaths.some((rule) => rule.test('/Users/me/.ssh/id_ed25519')), true)
  assert.equal(sensitivePaths.some((rule) => rule.test('/repo/.env.local')), true)
  assert.equal(sensitivePaths.some((rule) => rule.test('/repo/src/index.ts')), false)
})

test('tau_askAlias_usesPrintMode', () => {
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

test('tau_codeAlias_usesDefaultFastProfile', () => {
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

test('tau_reviewAlias_usesReadOnlyPrintMode', () => {
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

test('tau_reviewAliasWithDeepProfile_usesDeepReadOnlyPrintMode', () => {
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

test('tau_reviewAliasWithEqualsProfile_usesDeepReadOnlyPrintMode', () => {
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

test('tau_planAlias_usesPlanningArgs', () => {
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

test('tau_grillAlias_usesCriticalReviewArgs', () => {
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

test('tau_fixAlias_usesFocusedWorkArgs', () => {
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

test('tau_commitAlias_usesCommitArgs', () => {
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

test('tau_prAlias_usesPrArgs', () => {
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

test('tau_debugAlias_usesDebugArgs', () => {
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

test('tau_shipAlias_usesDefaultFastProfile', () => {
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

test('tau_shipAliasWithDeepProfile_usesDeepProfile', () => {
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

test('tau_shipAliasWithRouterProfile_addsModelCyclingArgs', () => {
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

test('tau_continueAlias_forwardsContinueWithPrompt', () => {
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

test('tau_resumeAlias_forwardsResume', () => {
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

test('tau_resumeAlias_preservesPromptArgs', () => {
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

test('tau_forkAlias_forwardsForkSessionId', () => {
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

test('tau_forkAlias_preservesArgsAfterSessionId', () => {
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

test('tau_exportAlias_forwardsExportSessionId', () => {
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

test('tau_exportAlias_preservesOutputPath', () => {
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

test('tau_profileFlag_usesProfile', () => {
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

test('tau_workProfileFlag_usesCopilotOnlyWhenForced', () => {
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

test('tau_routerProfileFlag_addsDailyModelCyclingArgs', () => {
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

test('tau_equalsProfileFlag_usesProfile', () => {
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

test('tau_profileTextAfterPromptStart_preservesPromptText', () => {
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

test('tau_defaultArgs_appendsSystemPrompt', () => {
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

test('tau_promptOptOut_skipsSystemPrompt', () => {
  const { record, result } = runWrapperResult(['hello'], { TAU_NO_PROMPT: '1' })

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

test('tau_promptOptOut_skipsTaskPrompt', () => {
  const { record, result } = runWrapperResult(['plan', 'raw plan'], { TAU_NO_PROMPT: '1' })

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

test('tau_unknownProfile_failsFast', () => {
  const { result } = runWrapperResult(['review', '--profile', 'missing', 'review diff'])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Unknown profile: missing/)
})

test('tau_missingProfileValue_failsFast', () => {
  const { result } = runWrapperResult(['review', '--profile'])

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Missing value for --profile/)
})

test('tau_invalidConfig_failsFastWithClearError', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tau-config-'))
  const brokenConfigPath = path.join(tempDir, 'config.json')
  fs.writeFileSync(brokenConfigPath, '{"profiles":{}}')

  const { result } = runWrapperResult(['hello'], { TAU_CONFIG_PATH: brokenConfigPath })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Invalid config/)
})

test('tau_doctor_reportsConcisePassingChecks', () => {
  const result = runDoctorResult({
    env: {
      OPENAI_API_KEY: 'secret-openai',
      GITHUB_TOKEN: 'secret-github',
    },
  })

  assert.equal(result.status, 0)
  assert.match(result.stdout, /\[ok\] node/)
  assert.match(result.stdout, /\[ok\] pi/)
  assert.match(result.stdout, /\[ok\] settings/)
  assert.match(result.stdout, /\[ok\] sessions/)
  assert.match(result.stdout, /\[ok\] key openai-codex: present/)
  assert.match(result.stdout, /\[ok\] key github-copilot: present/)
  assert.doesNotMatch(result.stdout, /secret-openai|secret-github/)
})

test('tau_doctor_failsWhenRequiredCheckFails', () => {
  const result = runDoctorResult({ pi: false, settings: false })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /\[fail\] pi/)
  assert.match(result.stdout, /\[fail\] settings/)
})

test('tau_doctor_checksTmuxExtendedKeysInsideTmux', () => {
  const result = runDoctorResult({
    env: { TMUX: '/tmp/tmux' },
    tmux: 'off',
  })

  assert.equal(result.status, 1)
  assert.match(result.stdout, /\[fail\] tmux extended-keys: off/)
})
