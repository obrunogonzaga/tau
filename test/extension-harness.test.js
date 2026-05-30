import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import crossAgentLoader from '../extensions/cross-agent-loader.ts'
import damageControl from '../extensions/damage-control.ts'
import personaSelector from '../extensions/persona-selector.ts'
import purposeGate from '../extensions/purpose-gate.ts'
import sessionReplay from '../extensions/session-replay.ts'
import taskDiscipline from '../extensions/task-discipline.ts'
import themeCycler from '../extensions/theme-cycler.ts'
import { createExtensionHarness } from './support/extension-harness.js'

test('damageControl_destructiveCommand_blocksToolCall', () => {
  const harness = createExtensionHarness()
  damageControl(harness.pi)

  const result = harness.emit('tool_call', {
    input: { command: 'git reset --hard' },
    toolName: 'bash',
  })

  assert.equal(result.block, true)
  assert.match(result.reason, /blocked destructive command/)
})

test('sessionReplay_replayAll_redactsSensitiveToolArgs', async () => {
  const harness = createExtensionHarness()
  sessionReplay(harness.pi)

  harness.addMessage('user', 'ship it')
  harness.emit('tool_execution_start', {
    args: {
      token: 'ghp_1234567890abcdefABCDEF',
      path: 'README.md',
    },
    toolCallId: 'tool-1',
    toolName: 'bash',
  })

  await harness.runCommand('replay', 'all')

  assert.equal(harness.notifications.length, 1)
  assert.match(harness.notifications[0].message, /ship it/)
  assert.match(harness.notifications[0].message, /"token":"\[redacted\]"/)
  assert.match(harness.notifications[0].message, /"path":"README.md"/)
})

test('themeCycler_themeCommand_listsSwitchesAndCyclesThemes', async () => {
  const harness = createExtensionHarness({
    themes: [{ name: 'tau-dark' }, { name: 'tau-focus' }],
  })
  themeCycler(harness.pi)

  const resources = harness.emit('resources_discover', { cwd: os.tmpdir() })
  harness.emit('session_start')
  await harness.runCommand('theme', '')
  await harness.runCommand('theme', 'tau-focus')
  await harness.runShortcut(1)

  assert.equal(resources.themePaths.some((themePath) => themePath.endsWith('tau-cc.json')), true)
  assert.match(harness.notifications[0].message, /themes: tau-dark, tau-focus/)
  assert.equal(harness.theme.name, 'tau-dark')
  assert.equal(harness.statuses.get('tau-theme'), 'theme tau-dark')
})

test('purposeGate_purposeCommandUpdatesPromptAndUi', async () => {
  const harness = createExtensionHarness()
  purposeGate(harness.pi)

  await harness.runCommand('purpose', 'ship quality baseline')
  const result = await harness.emitAsync('before_agent_start', { systemPrompt: 'Base prompt' })

  assert.equal(harness.statuses.get('tau-purpose'), 'purpose ship quality baseline')
  assert.equal(harness.widgets.has('tau-purpose'), true)
  assert.match(harness.notifications[0].message, /purpose ship quality baseline/)
  assert.match(result.systemPrompt, /Session purpose: ship quality baseline/)
})

test('taskDiscipline_taskCommandTracksTaskStates', async () => {
  const harness = createExtensionHarness()
  taskDiscipline(harness.pi)

  harness.emit('session_start')
  await harness.runCommand('task', 'add write harness tests')
  await harness.runCommand('task', 'start 1')
  await harness.runCommand('task', 'done 1')
  await harness.runCommand('task', 'list')

  assert.equal(harness.statuses.get('tau-tasks'), 'tasks p0 i0 d1')
  assert.deepEqual(harness.entries.at(-1).data.tasks, [
    { id: 1, title: 'write harness tests', state: 'done' },
  ])
  assert.match(harness.notifications.at(-1).message, /1\. \[done\] write harness tests/)
})

test('personaSelector_systemCommandSelectsPersonaAndAppendsPrompt', async () => {
  const harness = createExtensionHarness()
  personaSelector(harness.pi)

  await harness.runCommand('system', 'planner')
  const result = await harness.emitAsync('before_agent_start', { systemPrompt: 'Base prompt' })

  assert.equal(harness.statuses.get('tau-persona'), 'system persona planner')
  assert.match(harness.notifications[0].message, /system persona planner/)
  assert.match(result.systemPrompt, /Active local system persona: planner/)
  assert.match(result.systemPrompt, /## Role/)
})

test('crossAgentLoader_xloadListsSafeAssetsAndFiltersSecrets', async () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'tau-xload-'))
  const skillDir = path.join(cwd, '.codex', 'skills', 'demo')
  const agentDir = path.join(cwd, '.pi', 'agents')
  fs.mkdirSync(skillDir, { recursive: true })
  fs.mkdirSync(agentDir, { recursive: true })
  fs.writeFileSync(path.join(skillDir, 'tau-phase-two-skill.md'), '# Demo skill')
  fs.writeFileSync(path.join(agentDir, 'tau-phase-two-helper.md'), '# Helper agent')
  fs.writeFileSync(path.join(cwd, '.codex', 'token.json'), '{}')

  const harness = createExtensionHarness({ cwd })
  crossAgentLoader(harness.pi)

  await harness.runCommand('xload', 'tau-phase-two')

  assert.match(harness.notifications[0].message, /xload 2 items/)
  assert.match(harness.notifications[0].message, /\[skill\] tau-phase-two-skill/)
  assert.match(harness.notifications[0].message, /\[agent\] tau-phase-two-helper/)
  assert.doesNotMatch(harness.notifications[0].message, /token/)
  assert.equal(harness.entries[0].customType, 'tau-cross-agent-loader')
})
