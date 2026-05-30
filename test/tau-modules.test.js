import assert from 'node:assert/strict'
import path from 'node:path'
import test from 'node:test'

import { resolveArgs } from '../src/args.js'
import { deepMerge, validateConfig } from '../src/config.js'

const repoDir = path.resolve(import.meta.dirname, '..')
const extensionPath = (name) => path.join(repoDir, 'extensions', name)

const config = {
  defaultProfile: 'fast',
  providerKeys: {
    'openai-codex': [],
  },
  profiles: {
    fast: {
      id: 'openai-codex/gpt-5.3-codex-spark',
      thinking: 'low',
    },
    deep: {
      id: 'openai-codex/gpt-5.5',
      thinking: 'xhigh',
    },
    local: {},
    router: {
      id: 'openai-codex/gpt-5.3-codex-spark',
      thinking: 'low',
      models: ['fast', 'deep'],
    },
  },
  aliases: {
    ask: {
      extras: ['-p'],
      profile: 'fast',
    },
    debug: {
      extras: ['--tools', 'read,grep,find,ls,bash', '-p'],
      profile: 'deep',
      prompt: 'Investigate first.',
    },
  },
  extensionPresets: {
    safe: {
      extensions: ['tau-banner.ts', 'damage-control.ts'],
      profile: 'fast',
      prompt: 'Damage control active.',
    },
  },
}

test('resolveArgs_extPreset_expandsProfileExtensionsAndPrompt', () => {
  const resolved = resolveArgs(config, ['ext', 'safe', 'ship'], { repoDir, shouldAppendPrompt: true })

  assert.deepEqual(resolved, {
    args: [
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
      '--append-system-prompt',
      'Damage control active.',
      'ship',
    ],
    profileName: 'fast',
    brand: undefined,
  })
})

test('deepMerge_nestedObjects_keepsBaseFields', () => {
  const merged = deepMerge(config, {
    defaultProfile: 'local',
    profiles: {
      fast: {
        thinking: 'medium',
      },
    },
  })

  assert.equal(merged.defaultProfile, 'local')
  assert.equal(merged.profiles.fast.id, 'openai-codex/gpt-5.3-codex-spark')
  assert.equal(merged.profiles.fast.thinking, 'medium')
})

test('validateConfig_unknownDefaultProfile_throws', () => {
  assert.throws(() => validateConfig({ ...config, defaultProfile: 'missing' }), /defaultProfile unknown/)
})

test('validateConfig_missingExtensionFile_throws', () => {
  const brokenConfig = deepMerge(config, {
    extensionPresets: {
      safe: {
        extensions: ['missing-extension.ts'],
      },
    },
  })

  assert.throws(
    () => validateConfig(brokenConfig, { repoDir }),
    /extension preset safe missing extension file missing-extension\.ts/,
  )
})

test('validateConfig_missingThemeFile_throws', () => {
  const brokenConfig = deepMerge(config, {
    extensionPresets: {
      safe: {
        themes: ['missing-theme'],
      },
    },
  })

  assert.throws(
    () => validateConfig(brokenConfig, { repoDir }),
    /extension preset safe missing theme file missing-theme/,
  )
})
