import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { extensionPath, repoDir, runWrapper, withSystemPrompt } from './support/wrapper.js'

test('tau_extVibe_loadsPersonalityStack', () => {
  const record = runWrapper(['ext', 'vibe', 'make it visible'])

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
    extensionPath('theme-cycler.ts'),
    '-e',
    extensionPath('status-footer.ts'),
    '-e',
    extensionPath('tool-counter-footer.ts'),
    'make it visible',
  ]))
})

test('tau_extCc_expandsClaudeStylePreset', () => {
  const record = runWrapper(['ext', 'cc', 'make it claude'])

  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--theme',
    path.join(repoDir, '.pi', 'themes', 'tau-cc.json'),
    '--theme',
    path.join(repoDir, '.pi', 'themes', 'picpay.json'),
    '-e',
    extensionPath('theme-cycler.ts'),
    '-e',
    extensionPath('cc-header.ts'),
    '-e',
    extensionPath('cc-editor.ts'),
    '-e',
    extensionPath('cc-spinner.ts'),
    '-e',
    extensionPath('cc-tools.ts'),
    'make it claude',
  ]))
})

test('tau_extWork_usesPicpayBrand', () => {
  const record = runWrapper(['ext', 'work', 'ship it'])

  assert.deepEqual(record.brand, 'picpay')
  assert.deepEqual(record.args, withSystemPrompt([
    '--provider',
    'openai-codex',
    '--model',
    'gpt-5.3-codex-spark',
    '--thinking',
    'low',
    '--theme',
    path.join(repoDir, '.pi', 'themes', 'tau-cc.json'),
    '--theme',
    path.join(repoDir, '.pi', 'themes', 'picpay.json'),
    '-e',
    extensionPath('theme-cycler.ts'),
    '-e',
    extensionPath('cc-header.ts'),
    '-e',
    extensionPath('cc-editor.ts'),
    '-e',
    extensionPath('cc-spinner.ts'),
    '-e',
    extensionPath('cc-tools.ts'),
    'ship it',
  ]))
})

test('tau_extCc_doesNotSetBrand', () => {
  const record = runWrapper(['ext', 'cc', 'personal'])
  assert.equal(record.brand, undefined)
})

test('tau_brandRegistry_definesTauAndPicpay', () => {
  const brand = fs.readFileSync(path.join(repoDir, 'extensions', 'lib', 'cc-brand.ts'), 'utf8')
  assert.match(brand, /id: 'tau'/)
  assert.match(brand, /id: 'picpay'/)
  assert.match(brand, /themeName: 'tau-cc'/)
  assert.match(brand, /themeName: 'picpay'/)
  assert.match(brand, /process\.env\.TAU_BRAND/)

  const picpay = JSON.parse(fs.readFileSync(path.join(repoDir, '.pi', 'themes', 'picpay.json'), 'utf8'))
  assert.equal(picpay.name, 'picpay')
  assert.match(picpay.colors.accent, /^#/)
  assert.notEqual(picpay.colors.accent.toLowerCase(), '#000000')
})

test('tau_ccExtensions_registerLayoutContracts', () => {
  const header = fs.readFileSync(path.join(repoDir, 'extensions', 'cc-header.ts'), 'utf8')
  const editor = fs.readFileSync(path.join(repoDir, 'extensions', 'cc-editor.ts'), 'utf8')
  const spinner = fs.readFileSync(path.join(repoDir, 'extensions', 'cc-spinner.ts'), 'utf8')
  const tools = fs.readFileSync(path.join(repoDir, 'extensions', 'cc-tools.ts'), 'utf8')

  assert.match(header, /setHeader\(/)
  assert.match(header, /brand\.greeting/)
  assert.match(header, /Tips for getting started/)
  assert.match(header, /What's new/)
  assert.match(header, /resolveBrand\(\)/)
  assert.match(header, /setTheme\(brand\.themeName\)/)
  assert.match(header, /pi\.exec\('git'/)
  assert.match(editor, /setEditorComponent\(/)
  assert.match(editor, /╭/)
  assert.match(editor, /╰/)
  assert.match(editor, /\? for shortcuts/)
  assert.match(editor, /registerCommand\('shortcuts'/)
  assert.match(editor, /this\.getText\(\)\.length === 0/)
  assert.match(editor, /ctx\.ui\.custom/)
  assert.match(editor, /dismissKey === '\?'/)
  assert.match(editor, /isPrintableKey\(dismissKey\)/)
  assert.match(spinner, /setWorkingIndicator\(/)
  assert.match(spinner, /registerCommand\('spinner'/)
  assert.match(spinner, /✻/)
  assert.match(spinner, /setWorkingMessage\(/)
  assert.match(spinner, /'agent_start'/)
  assert.match(spinner, /esc to interrupt/)
  assert.match(editor, /'tool_call'/)
  assert.match(editor, /class CcFooter/)
  assert.match(tools, /renderShell: 'self'/)
  assert.match(tools, /'●'/)
  assert.match(tools, /'⎿'/)
  assert.match(tools, /registerTool\(/)
  assert.match(tools, /registerTools\(pi, ctx\.cwd\)/)
  assert.match(tools, /more lines/)
  assert.match(tools, /context\.isError/)
  assert.doesNotMatch(tools, /startsWith\('Error'\)/)
  assert.doesNotMatch(tools, /exit code:/)
})

test('tau_ccFormatLib_isSharedAcrossExtensions', () => {
  const lib = fs.readFileSync(path.join(repoDir, 'extensions', 'lib', 'cc-format.ts'), 'utf8')

  for (const helper of ['formatCwd', 'formatModel', 'formatContextPercent', 'formatCost', 'formatTools', 'fit', 'fitRounded']) {
    assert.match(lib, new RegExp(`export const ${helper}`), helper)
  }

  const importers = ['cc-header.ts', 'cc-editor.ts', 'status-footer.ts', 'tool-counter-footer.ts']
  for (const name of importers) {
    const content = fs.readFileSync(path.join(repoDir, 'extensions', name), 'utf8')
    assert.match(content, /from '\.\/lib\/cc-format\.ts'/, name)
  }
})

test('tau_ccTheme_isDarkReadableWithTealAccent', () => {
  const theme = JSON.parse(fs.readFileSync(path.join(repoDir, '.pi', 'themes', 'tau-cc.json'), 'utf8'))

  assert.equal(theme.name, 'tau-cc')
  assert.match(theme.colors.text, /^#/)
  assert.match(theme.colors.accent, /^#/)
  assert.notEqual(theme.colors.text.toLowerCase(), '#000000')
})

test('tau_themePack_containsDarkReadableThemes', () => {
  const requiredThemes = ['tau-dark', 'tau-focus', 'tau-alert']

  for (const themeName of requiredThemes) {
    const themePath = path.join(repoDir, '.pi', 'themes', `${themeName}.json`)
    const theme = JSON.parse(fs.readFileSync(themePath, 'utf8'))

    assert.equal(theme.name, themeName)
    assert.match(theme.colors.text, /^#/)
    assert.match(theme.colors.accent, /^#/)
    assert.match(theme.colors.userMessageText, /^#/)
    assert.notEqual(theme.colors.text.toLowerCase(), '#000000')
  }
})
