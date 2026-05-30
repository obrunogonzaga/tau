import assert from 'node:assert/strict'
import test from 'node:test'

import { createSubagentStore } from '../extensions/lib/subagent-store.js'

test('subagentStore_createAndComplete_rendersStatusAndList', () => {
  const store = createSubagentStore({ now: () => 1_000 })
  const job = store.create('inspect docs for gaps')

  assert.equal(job.status, 'running')
  assert.match(store.summary(), /r1 d0 e0 c0/)
  assert.match(store.list(), /#1 running/)

  store.finish(job.id)

  assert.equal(job.status, 'done')
  assert.match(store.summary(), /r0 d1 e0 c0/)
  assert.match(store.show(job.id), /completion: done/)
})

test('subagentStore_updateFromEvent_tracksToolAndAssistantText', () => {
  const store = createSubagentStore({ now: () => 1_000 })
  const job = store.create('inspect')

  store.updateFromEvent(job.id, { toolName: 'read' })
  store.updateFromEvent(job.id, { assistantMessageEvent: { delta: 'found issue' } })

  assert.match(store.show(job.id), /last assistant/)
  assert.match(store.show(job.id), /tool: read/)
  assert.match(store.show(job.id), /assistant: found issue/)
  assert.match(store.show(job.id), /result found issue/)
})

test('subagentStore_cancel_marksRunningJobCancelled', () => {
  const store = createSubagentStore({ now: () => 1_000 })
  const job = store.create('slow task')

  assert.equal(store.cancel(job.id), true)
  assert.equal(job.status, 'cancelled')
  assert.match(store.summary(), /r0 d0 e0 c1/)
  assert.match(store.show(job.id), /completion: cancelled/)
})

test('subagentStore_result_isCapped', () => {
  const store = createSubagentStore({ maxResultText: 12, now: () => 1_000 })
  const job = store.create('large output')

  store.updateFromEvent(job.id, { assistantMessageEvent: { delta: '1234567890' } })
  store.updateFromEvent(job.id, { assistantMessageEvent: { delta: 'abcdef' } })

  assert.equal(job.result, '567890abcdef')
})
