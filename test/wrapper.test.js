import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import {
  assertToolList,
  config,
  dailyModels,
  extensionPath,
  runDoctorResult,
  runWrapper,
  runWrapperResult,
  withSystemPrompt,
} from './support/wrapper.js'

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

test('tau_localProfile_isPassthroughWithNoModelArgs', () => {
  const record = runWrapper(['--profile', 'local', 'hi'])

  assert.deepEqual(record.args, withSystemPrompt(['hi']))
})

test('tau_localProfile_skipsAuthWhenNoKeys', () => {
  const { result } = runWrapperResult(['--profile', 'local', 'hi'], {
    OPENAI_API_KEY: '',
    GITHUB_TOKEN: '',
  })

  assert.equal(result.status, 0)
})

test('tau_localOverlay_overridesDefaultProfile', () => {
  const overlayDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tau-overlay-'))
  const overlayPath = path.join(overlayDir, 'config.local.json')
  fs.writeFileSync(overlayPath, JSON.stringify({ defaultProfile: 'local' }))

  const { record, result } = runWrapperResult(['just answer'], { TAU_LOCAL_CONFIG: overlayPath })

  assert.equal(result.status, 0)
  assert.deepEqual(record.args, withSystemPrompt(['just answer']))
})

test('tau_localOverlay_mergesProfileFields', () => {
  const overlayDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tau-overlay-'))
  const overlayPath = path.join(overlayDir, 'config.local.json')
  fs.writeFileSync(
    overlayPath,
    JSON.stringify({
      profiles: { fast: { id: 'openrouter/anthropic/claude-sonnet-4', thinking: 'medium' } },
      providerKeys: { openrouter: ['OPENROUTER_API_KEY'] },
    }),
  )

  const { record, result } = runWrapperResult(['fast', 'hi'], {
    TAU_LOCAL_CONFIG: overlayPath,
    OPENROUTER_API_KEY: 'or-test-key',
  })

  assert.equal(result.status, 0)
  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openrouter',
    '--model',
    'anthropic/claude-sonnet-4',
    '--thinking',
    'medium',
    'hi',
  ]))
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
  assert.deepEqual(Object.keys(config.profiles).sort(), ['deep', 'fast', 'local', 'router', 'work'])
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
    'cc',
    'chain',
    'damage',
    'damage-continue',
    'focus',
    'minimal',
    'orchestrate',
    'safe',
    'team',
    'vibe',
    'work',
  ])
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

test('tau_auth_missingForProvider_failsBeforeSpawn', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tau-config-auth-fail-'))
  const customConfigPath = path.join(tempDir, 'config.json')

  const customConfig = {
    defaultProfile: 'fast',
    providerKeys: {
      'openai-codex': ['OPENAI_API_KEY'],
    },
    profiles: {
      fast: {
        id: 'openai-codex/gpt-5.3-codex-spark',
        thinking: 'low',
      },
    },
    aliases: {},
    extensionPresets: {},
  }

  fs.writeFileSync(customConfigPath, JSON.stringify(customConfig))

  const { result } = runWrapperResult(['hello'], {
    TAU_CONFIG_PATH: customConfigPath,
    OPENAI_API_KEY: '',
    GITHUB_TOKEN: '',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /missing authentication for provider openai-codex/)
})

test('tau_missingProviderKeyMapping_failsFast', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tau-config-mapping-'))
  const customConfigPath = path.join(tempDir, 'config.json')

  const configPathContent = JSON.stringify({
    defaultProfile: 'fast',
    providerKeys: {
      openai: ['OPENAI_API_KEY'],
    },
    profiles: {
      fast: {
        id: 'ghost/gpt-5',
        thinking: 'low',
      },
    },
    aliases: {},
    extensionPresets: {},
  })

  fs.writeFileSync(customConfigPath, configPathContent)

  const { result } = runWrapperResult(['hello'], {
    TAU_CONFIG_PATH: customConfigPath,
    OPENAI_API_KEY: 'openai-test-key',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Missing auth mapping: no provider key names configured for ghost/)
})

test('tau_tokenlessProviderCanSkipKeyRequirement', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tau-config-tokenless-'))
  const customConfigPath = path.join(tempDir, 'config.json')

  const configPathContent = JSON.stringify({
    defaultProfile: 'fast',
    providerKeys: {
      'openai-codex': [],
    },
    profiles: {
      fast: {
        id: 'openai-codex/gpt-5.3-codex-spark',
        thinking: 'low',
      },
    },
    aliases: {},
    extensionPresets: {},
  })

  fs.writeFileSync(customConfigPath, configPathContent)

  const { record, result } = runWrapperResult(['hello'], {
    TAU_CONFIG_PATH: customConfigPath,
    OPENAI_API_KEY: '',
  })

  assert.equal(result.status, 0)
  assert.equal(record.args.includes('--append-system-prompt'), true)
})

test('tau_auth_check_canBeSkippedWithEnvFlag', () => {
  const { record, result } = runWrapperResult(['hello'], {
    OPENAI_API_KEY: '',
    TAU_SKIP_AUTH_CHECK: '1',
  })

  assert.equal(result.status, 0)
  assert.equal(record.args.includes('--append-system-prompt'), true)
})

test('tau_invalidConfig_failsFastWithClearError', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tau-config-'))
  const brokenConfigPath = path.join(tempDir, 'config.json')
  fs.writeFileSync(brokenConfigPath, '{"profiles":{}}')

  const { result } = runWrapperResult(['hello'], { TAU_CONFIG_PATH: brokenConfigPath })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /Invalid config/)
})

test('tau_invalidProfileModelFormat_isRejected', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tau-model-'))
  const brokenConfigPath = path.join(tempDir, 'config.json')

  const brokenConfig = {
    defaultProfile: 'fast',
    providerKeys: {
      openai: ['OPENAI_API_KEY'],
    },
    profiles: {
      fast: {
        id: 'gpt-only',
        thinking: 'low',
      },
      openai: {
        id: 'openai-codex/gpt-5.3-codex-spark',
        thinking: 'low',
      },
    },
    aliases: {},
    extensionPresets: {},
  }

  fs.writeFileSync(brokenConfigPath, JSON.stringify(brokenConfig))

  const { result } = runWrapperResult(['hello'], {
    TAU_CONFIG_PATH: brokenConfigPath,
    OPENAI_API_KEY: 'openai-test-key',
  })

  assert.equal(result.status, 1)
  assert.match(result.stderr, /id must be <provider>\/<model>/)
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
  assert.match(result.stdout, /\[ok\] default profile/)
  assert.match(result.stdout, /\[ok\] key github-copilot: present/)
  assert.match(result.stdout, /\[ok\] key openai-codex: (present|tokenless\/login mode)/)
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
