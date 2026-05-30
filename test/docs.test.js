import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'

import { repoDir } from './support/wrapper.js'

test('tau_ccDocs_documentPresetAndRecipe', () => {
  const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8')
  const commands = fs.readFileSync(path.join(repoDir, 'docs', 'COMMANDS.md'), 'utf8')
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'))

  assert.match(readme, /tau ext cc/)
  assert.match(commands, /tau ext cc/)
  assert.match(commands, /\/theme tau-cc/)
  assert.equal(packageJson.scripts['ext:cc'], 'tau ext cc')
})

test('tau_themeDocs_documentVibeThemeCommandAndShortcuts', () => {
  const readme = fs.readFileSync(path.join(repoDir, 'README.md'), 'utf8')
  const commands = fs.readFileSync(path.join(repoDir, 'docs', 'COMMANDS.md'), 'utf8')
  const themeReadme = fs.readFileSync(path.join(repoDir, '.pi', 'themes', 'README.md'), 'utf8')
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoDir, 'package.json'), 'utf8'))

  assert.match(readme, /tau ext vibe/)
  assert.match(readme, /\/theme tau-dark/)
  assert.match(commands, /tau ext vibe/)
  assert.match(commands, /\/theme <name>/)
  assert.match(commands, /Ctrl\+Shift\+T/)
  assert.match(commands, /Ctrl\+Alt\+T/)
  assert.match(themeReadme, /tau-dark/)
  assert.match(themeReadme, /tau-focus/)
  assert.match(themeReadme, /tau-alert/)
  assert.equal(packageJson.scripts['ext:vibe'], 'tau ext vibe')
})

test('tau_orchestrationResearchDocuments_recordM10Decisions', () => {
  const piToPi = fs.readFileSync(path.join(repoDir, '.pi', 'research', 'pi-to-pi-communication.md'), 'utf8')
  const metaAgent = fs.readFileSync(path.join(repoDir, '.pi', 'research', 'meta-agent-builder.md'), 'utf8')

  assert.match(piToPi, /Decision: local-only first/)
  assert.match(piToPi, /Security model/)
  assert.match(piToPi, /Auth\/token handling/)
  assert.match(piToPi, /Minimal workflow/)
  assert.match(metaAgent, /First meta-agent scope/)
  assert.match(metaAgent, /Experts/)
  assert.match(metaAgent, /Docs lookup/)
  assert.match(metaAgent, /Smoke checks/)
  assert.match(metaAgent, /Review before activation/)
})
