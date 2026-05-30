import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { extensionPath, repoDir, runWrapper, runWrapperResult, withSystemPrompt } from './support/wrapper.js'

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
    '.pi/agents/agent-chain.yaml',
    '.pi/agents/teams.yaml',
    '.pi/chains',
    '.pi/damage-control-rules.yaml',
    '.pi/extensions',
    '.pi/rules',
    '.pi/teams',
    '.pi/themes',
    'extensions/damage-control.ts',
    'extensions/persona-selector.ts',
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

test('tau_extTeamAndChain_loadPersonaSelector', () => {
  const teamRecord = runWrapper(['ext', 'team', 'plan this'])
  const chainRecord = runWrapper(['ext', 'chain', 'ship this'])

  assert.equal(teamRecord.args.includes(extensionPath('persona-selector.ts')), true)
  assert.equal(chainRecord.args.includes(extensionPath('persona-selector.ts')), true)
})

test('tau_extOrchestrate_loadsAdvancedOrchestrationExtensions', () => {
  const record = runWrapper(['ext', 'orchestrate', 'coordinate this'])

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
    extensionPath('subagent-mode.ts'),
    '-e',
    extensionPath('session-replay.ts'),
    '-e',
    extensionPath('cross-agent-loader.ts'),
    '-e',
    extensionPath('status-footer.ts'),
    '-e',
    extensionPath('tool-counter-footer.ts'),
    '--append-system-prompt',
    'Advanced orchestration active. Use /sub for isolated background research, /replay for audit timeline, and /xload to inspect safe cross-agent assets.',
    'coordinate this',
  ]))
})

test('tau_orchestrationExtensions_registerRequiredCommands', () => {
  const subagent = fs.readFileSync(path.join(repoDir, 'extensions', 'subagent-mode.ts'), 'utf8')
  const subagentStore = fs.readFileSync(path.join(repoDir, 'extensions', 'lib', 'subagent-store.js'), 'utf8')
  const safety = fs.readFileSync(path.join(repoDir, 'extensions', 'lib', 'safety.js'), 'utf8')
  const replay = fs.readFileSync(path.join(repoDir, 'extensions', 'session-replay.ts'), 'utf8')
  const loader = fs.readFileSync(path.join(repoDir, 'extensions', 'cross-agent-loader.ts'), 'utf8')

  assert.match(subagent, /registerCommand\('sub'/)
  assert.match(subagent, /tools:\s*\[\s*'read',\s*'grep',\s*'find',\s*'ls'\s*\]/)
  assert.match(subagentStore, /status:\s*'running'/)
  assert.match(subagentStore, /setStatus\(job, 'done'\)/)
  assert.match(subagentStore, /setStatus\(job, 'error'\)/)
  assert.match(subagentStore, /setStatus\(job, 'cancelled'\)/)
  assert.match(subagent, /sendMessage/)
  assert.match(replay, /registerCommand\('replay'/)
  assert.match(replay, /message\.role === 'user'/)
  assert.match(replay, /message\.role === 'assistant'/)
  assert.match(replay, /tool_execution_start/)
  assert.match(replay, /next|prev|all/)
  assert.match(safety, /SENSITIVE_KEY/)
  assert.match(safety, /SECRET_TEXT_PATTERN/)
  assert.match(replay, /redactValue\(event\.args\)/)
  assert.match(loader, /registerCommand\('xload'/)
  assert.match(loader, /\.claude/)
  assert.match(loader, /\.gemini/)
  assert.match(loader, /\.codex/)
  assert.match(loader, /\.pi/)
  assert.match(safety, /SECRET_FILE_PATTERN/)
  assert.match(safety, /BLOCKED_DIRS/)
  assert.match(loader, /toLowerCase\(\)\.includes\(filter\)/)
})

test('tau_orchestrationUi_keepsLongOutputOutOfBelowEditorWidget', () => {
  const subagent = fs.readFileSync(path.join(repoDir, 'extensions', 'subagent-mode.ts'), 'utf8')
  const replay = fs.readFileSync(path.join(repoDir, 'extensions', 'session-replay.ts'), 'utf8')

  assert.doesNotMatch(subagent, /setWidget\(SUBAGENT_KEY/)
  assert.doesNotMatch(replay, /setWidget\('tau-replay'/)
})

test('tau_replay_filtersThinkingBlocks', () => {
  const replay = fs.readFileSync(path.join(repoDir, 'extensions', 'session-replay.ts'), 'utf8')

  assert.match(replay, /type === 'thinking'/)
  assert.match(replay, /filter\(Boolean\)/)
})

test('tau_orchestrateM11_formatsSubagentStatusCards', () => {
  const subagent = fs.readFileSync(path.join(repoDir, 'extensions', 'lib', 'subagent-store.js'), 'utf8')

  assert.match(subagent, /renderStatusCard/)
  assert.match(subagent, /promptPreview/)
  assert.match(subagent, /lastActivity/)
  assert.match(subagent, /formatElapsed/)
})

test('tau_orchestrateM11_showsPromptElapsedAndSummary', () => {
  const subagent = fs.readFileSync(path.join(repoDir, 'extensions', 'lib', 'subagent-store.js'), 'utf8')

  assert.match(subagent, /originalPrompt/)
  assert.match(subagent, /startedAt/)
  assert.match(subagent, /finishedAt/)
  assert.match(subagent, /summary/)
  assert.match(subagent, /currentSummary/)
})

test('tau_orchestrateM11_registersSubagentNavigationCommands', () => {
  const subagent = fs.readFileSync(path.join(repoDir, 'extensions', 'subagent-mode.ts'), 'utf8')
  const subagentStore = fs.readFileSync(path.join(repoDir, 'extensions', 'lib', 'subagent-store.js'), 'utf8')

  assert.match(subagent, /registerCommand\('sub list'/)
  assert.match(subagent, /registerCommand\('sub show'/)
  assert.match(subagent, /registerCommand\('sub open'/)
  assert.match(subagent, /registerCommand\('sub cancel'/)
  assert.match(subagentStore, /detail fallback/)
})

test('tau_orchestrateM11_recordsBoundedTimelineWithoutThinking', () => {
  const subagent = fs.readFileSync(path.join(repoDir, 'extensions', 'lib', 'subagent-store.js'), 'utf8')

  assert.match(subagent, /recordEvent/)
  assert.match(subagent, /assistant/)
  assert.match(subagent, /tool/)
  assert.match(subagent, /completion/)
  assert.match(subagent, /error/)
  assert.match(subagent, /thinking/)
  assert.match(subagent, /truncateText/)
  assert.match(subagent, /MAX_EVENT_TEXT/)
  assert.match(subagent, /maxResultText/)
})

test('tau_personaSelector_registersSystemCommandAndStatus', () => {
  const content = fs.readFileSync(path.join(repoDir, 'extensions', 'persona-selector.ts'), 'utf8')

  assert.match(content, /registerCommand\('system'/)
  assert.match(content, /before_agent_start/)
  assert.match(content, /setStatus/)
  assert.match(content, /system persona/)
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
