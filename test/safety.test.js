import assert from 'node:assert/strict'
import test from 'node:test'

import { isBlockedPath, isSafeCrossAgentFile, isSecretLikeText, isSensitivePath, redactValue } from '../extensions/lib/safety.js'

test('safety_redactValue_redactsSensitiveKeysAndTokens', () => {
  const value = redactValue({
    nested: {
      github: 'github_pat_1234567890abcdef1234567890',
      ok: 'README.md',
    },
    OPENAI_API_KEY: 'sk-proj-1234567890abcdef1234567890',
  })

  assert.deepEqual(value, {
    nested: {
      github: '[redacted]',
      ok: 'README.md',
    },
    OPENAI_API_KEY: '[redacted]',
  })
})

test('safety_detectsSensitivePaths', () => {
  assert.equal(isSensitivePath('/repo/.env.local'), true)
  assert.equal(isSensitivePath('/repo/.npmrc'), true)
  assert.equal(isSensitivePath('/repo/.netrc'), true)
  assert.equal(isSensitivePath('/repo/src/index.js'), false)
})

test('safety_crossAgentFiles_skipBlockedAndSecretFiles', () => {
  assert.equal(isBlockedPath('/repo/node_modules/pkg/README.md'), true)
  assert.equal(isSafeCrossAgentFile('/repo/.codex/skills/demo/SKILL.md'), true)
  assert.equal(isSafeCrossAgentFile('/repo/.codex/token.json'), false)
  assert.equal(isSafeCrossAgentFile('/repo/.codex/config/.npmrc'), false)
})

test('safety_detectsSecretLikeText', () => {
  assert.equal(isSecretLikeText('ghu_1234567890abcdef1234567890'), true)
  assert.equal(isSecretLikeText('plain text'), false)
})
