#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn } from 'node:child_process'

const rawArgs = process.argv.slice(2)

const profiles = {
  deep: ['--provider', 'openai-codex', '--model', 'gpt-5.5', '--thinking', 'xhigh'],
  fast: ['--provider', 'openai-codex', '--model', 'gpt-5.3-codex-spark', '--thinking', 'low'],
  work: ['--provider', 'github-copilot', '--model', 'gpt-5.5', '--thinking', 'medium'],
}

const aliasExtras = {
  ask: ['-p'],
  code: [],
  review: ['--tools', 'read,grep,find,ls,bash', '-p'],
}

const aliasProfiles = {
  ask: [],
  code: profiles.work,
  review: profiles.work,
}

const extractProfileAt = (args, profileIndex) => {
  const profileName = args[profileIndex + 1]
  if (!profileName) throw new Error('Missing value for --profile')
  if (!profiles[profileName]) throw new Error(`Unknown profile: ${profileName}`)

  const cleanArgs = args.filter((_, index) => index !== profileIndex && index !== profileIndex + 1)

  return { args: cleanArgs, profileName }
}

const extractProfile = (args) => {
  if (args[0] === '--profile') return extractProfileAt(args, 0)
  if (aliasProfiles[args[0]] && args[1] === '--profile') return extractProfileAt(args, 1)

  return { args, profileName: null }
}

const resolveArgs = (rawInputArgs) => {
  const { args: inputArgs, profileName } = extractProfile(rawInputArgs)
  const [firstArg, ...restArgs] = inputArgs

  if (aliasProfiles[firstArg]) {
    const profileArgs = profiles[profileName] ?? aliasProfiles[firstArg]

    return [...profileArgs, ...aliasExtras[firstArg], ...restArgs]
  }

  const resolvedProfileName = profileName ?? firstArg
  if (!profiles[resolvedProfileName]) return [firstArg, ...restArgs].filter((arg) => arg !== undefined)

  return [...profiles[resolvedProfileName], ...(profileName ? inputArgs : restArgs)]
}

let args

try {
  args = resolveArgs(rawArgs)
} catch (error) {
  console.error(`[my-pi] ${error.message}`)
  process.exit(1)
}

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
