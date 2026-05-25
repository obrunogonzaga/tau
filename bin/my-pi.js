#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const rawArgs = process.argv.slice(2)

const profiles = {
  deep: ['--provider', 'openai', '--model', 'gpt-5.5', '--thinking', 'xhigh'],
  fast: ['--provider', 'openai-codex', '--model', 'gpt-5.3-codex-spark', '--thinking', 'low'],
  work: ['--provider', 'github-copilot', '--model', 'gpt-5.5', '--thinking', 'medium'],
}

const resolveArgs = ([firstArg, ...restArgs]) => {
  if (!profiles[firstArg]) return [firstArg, ...restArgs].filter((arg) => arg !== undefined)

  return [...profiles[firstArg], ...restArgs]
}

const args = resolveArgs(rawArgs)

const HOME_DIR = os.homedir()
const defaultSettingsPath = path.join(HOME_DIR, '.pi', 'agent', 'settings.json')
const configuredPath = process.env.MY_PI_SETTINGS_PATH

const resolveSettingsPath = (rawPath) => {
  if (!rawPath) return defaultSettingsPath
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath)
}

const settingsPath = resolveSettingsPath(configuredPath)
const fallbackPath = fs.existsSync(settingsPath) ? settingsPath : defaultSettingsPath
const configDir = path.dirname(fallbackPath)
const sessionDir = path.join(HOME_DIR, '.pi', 'my-pi', 'sessions')

if (configuredPath && !fs.existsSync(settingsPath)) {
  console.error(`[my-pi] MY_PI_SETTINGS_PATH not found: ${settingsPath}`)
  console.error(`[my-pi] fallback settings: ${defaultSettingsPath}`)
}

const logsDir = path.join(configDir, 'my-pi', 'logs')
const logFile = path.join(logsDir, `pi-${new Date().toISOString().slice(0, 10)}.log`)
const logEntry = `${new Date().toISOString()} start cmd=pi settings=${fallbackPath} args=${JSON.stringify(args)}\n`
const banner = process.env.MY_PI_BANNER || 'My Pi'

if (process.env.MY_PI_BANNER !== '0') {
  console.log(`[${banner}] starting`)
}

try {
  fs.mkdirSync(logsDir, { recursive: true })
  fs.appendFileSync(logFile, logEntry)
} catch {}

const env = {
  ...process.env,
  PI_CODING_AGENT_DIR: configDir,
  PI_CODING_AGENT_SESSION_DIR: sessionDir,
}

const child = spawn('pi', args, {
  stdio: 'inherit',
  env,
})

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})

child.on('error', (error) => {
  console.error(`[my-pi] failed to start pi: ${error.message}`)
  process.exit(1)
})
