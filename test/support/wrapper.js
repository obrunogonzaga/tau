import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

export const repoDir = path.resolve(import.meta.dirname, '..', '..')
const wrapperPath = path.join(repoDir, 'bin', 'tau.js')
const promptPath = path.join(repoDir, 'prompts', 'system-prompt.md')
const configPath = path.join(repoDir, 'config', 'tau.config.json')
const systemPrompt = fs.readFileSync(promptPath, 'utf8').trim()

export const config = JSON.parse(fs.readFileSync(configPath, 'utf8'))
export const dailyModels = 'openai-codex/gpt-5.3-codex-spark:low,openai-codex/gpt-5.5:xhigh'
export const extensionPath = (name) => path.join(repoDir, 'extensions', name)
export const withSystemPrompt = (args) => ['--append-system-prompt', systemPrompt, ...args]

export const assertToolList = (record, expectedTools) => {
  const toolIndex = record.args.indexOf('--tools')

  assert.notEqual(toolIndex, -1)
  assert.equal(record.args[toolIndex + 1], expectedTools)
}

export const runWrapperResult = (args, env = {}) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tau-'))
  const binDir = path.join(tempDir, 'bin')
  const recordPath = path.join(tempDir, 'record.json')

  fs.mkdirSync(binDir)
  fs.writeFileSync(
    path.join(binDir, 'pi'),
    '#!/usr/bin/env node\n' +
      'import fs from \'node:fs\'\n' +
      'fs.writeFileSync(process.env.TAU_TEST_RECORD, JSON.stringify({\n' +
      '  args: process.argv.slice(2),\n' +
      '  agentDir: process.env.PI_CODING_AGENT_DIR,\n' +
      '  sessionDir: process.env.PI_CODING_AGENT_SESSION_DIR,\n' +
      '  brand: process.env.TAU_BRAND\n' +
      '}))\n',
    { mode: 0o755 },
  )

  const result = spawnSync(process.execPath, [wrapperPath, ...args], {
    env: {
      ...process.env,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? 'openai-test-key',
      GITHUB_TOKEN: process.env.GITHUB_TOKEN ?? 'gh-test-token',
      TAU_BANNER: '0',
      TAU_TEST_RECORD: recordPath,
      TAU_LOCAL_CONFIG: path.join(tempDir, 'no-local-overlay.json'),
      PATH: binDir + ':' + process.env.PATH,
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

export const runDoctorResult = ({ env = {}, settings = true, pi = true, tmux = null } = {}) => {
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
    writeExecutable(path.join(binDir, 'tmux'), '#!/bin/sh\necho ' + JSON.stringify(tmux) + '\n')
  }

  const mergedEnv = {
    ...process.env,
    HOME: homeDir,
    TAU_BANNER: '0',
    PATH: binDir,
    ...env,
  }
  if (!('TMUX' in env)) delete mergedEnv.TMUX

  return spawnSync(process.execPath, [wrapperPath, 'doctor'], {
    env: mergedEnv,
    encoding: 'utf8',
  })
}

export const runWrapper = (args) => {
  const { record, result } = runWrapperResult(args)

  assert.equal(result.status, 0)

  return record
}
