import assert from 'node:assert/strict'
import test from 'node:test'

import damageControl from '../extensions/damage-control.ts'
import sessionReplay from '../extensions/session-replay.ts'
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
