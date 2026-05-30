#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'
import { appendSystemPrompt, resolveArgs, splitModelId } from '../src/args.js'
import { loadConfig, localConfigPath } from '../src/config.js'

const rawArgs = process.argv.slice(2)

const resolveRepoPath = (...segments) => path.resolve(import.meta.dirname, '..', ...segments)

const defaultConfigPath = resolveRepoPath('config', 'tau.config.json')

const resolveConfigPath = () => {
  const configPath = process.env.TAU_CONFIG_PATH
  if (!configPath) return defaultConfigPath
  return path.isAbsolute(configPath) ? configPath : path.resolve(process.cwd(), configPath)
}

const resolvePromptPath = () => resolveRepoPath('prompts', 'system-prompt.md')

const shouldSkipAuthCheck = () => {
  const value = process.env.TAU_SKIP_AUTH_CHECK
  return value === '1' || value?.toLowerCase() === 'true'
}

const shouldAppendPrompt = () => process.env.TAU_NO_PROMPT !== '1'

const readPrompt = () => fs.readFileSync(resolvePromptPath(), 'utf8').trim()

const HOME_DIR = os.homedir()
const defaultSettingsPath = path.join(HOME_DIR, '.pi', 'agent', 'settings.json')
const configuredPath = process.env.TAU_SETTINGS_PATH

const resolveSettingsPath = (rawPath) => {
  if (!rawPath) return defaultSettingsPath
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath)
}

const settingsPath = resolveSettingsPath(configuredPath)
const fallbackPath = fs.existsSync(settingsPath) ? settingsPath : defaultSettingsPath
const configDir = path.dirname(fallbackPath)
const sessionDir = path.join(HOME_DIR, '.pi', 'tau', 'sessions')

const printCheck = (status, name, detail) => {
  console.log(`[${status}] ${name}${detail ? `: ${detail}` : ''}`)
}

const checkNode = () => {
  const [major, minor] = process.versions.node.split('.').map(Number)
  const ok = major > 22 || (major === 22 && minor >= 19)
  return { ok, detail: process.versions.node }
}

const checkCommand = (command, args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  const detail = result.stdout?.trim() || result.stderr?.trim() || result.error?.message || 'missing'
  return { ok: result.status === 0, detail }
}

const checkSettings = () => ({ ok: fs.existsSync(settingsPath), detail: settingsPath })

const checkSessions = () => {
  try {
    fs.mkdirSync(sessionDir, { recursive: true })
    fs.accessSync(sessionDir, fs.constants.W_OK)
    return { ok: true, detail: sessionDir }
  } catch (error) {
    return { ok: false, detail: error.message }
  }
}

const checkTmux = () => {
  if (!process.env.TMUX) return { ok: true, status: 'skip', detail: 'not inside tmux' }
  const result = spawnSync('tmux', ['show-options', '-gqv', 'extended-keys'], { encoding: 'utf8' })
  if (result.error) return { ok: false, detail: result.error.message }
  const value = result.stdout?.trim() || result.stderr?.trim() || 'missing'
  return { ok: result.status === 0 && value === 'on', detail: value }
}

const checkProviderKeys = (provider, names) => {
  if (!Array.isArray(names)) {
    printCheck('warn', `key ${provider}`, 'mapping missing')
    return
  }

  if (names.length === 0) {
    printCheck('ok', `key ${provider}`, 'tokenless/login mode')
    return
  }

  const present = names.some((name) => Boolean(process.env[name]))
  printCheck(present ? 'ok' : 'warn', `key ${provider}`, present ? 'present' : 'missing')
}

const runRequiredCheck = (name, check) => {
  const result = check()
  printCheck(result.status ?? (result.ok ? 'ok' : 'fail'), name, result.detail)
  return result.ok
}

const resolveProviderFromProfile = (config, profileName) => {
  const profile = config.profiles[profileName]
  if (!profile) throw new Error(`Invalid config: unknown profile ${profileName}`)
  if (!profile.id) return null

  const { provider } = splitModelId(profile.id)
  return provider
}

const requireAuthForProfile = (config, profileName) => {
  const provider = resolveProviderFromProfile(config, profileName)
  if (!provider) return // passthrough profile: pi handles auth/login itself
  const names = config.providerKeys?.[provider]

  if (!Array.isArray(names)) {
    throw new Error(`Missing auth mapping: no provider key names configured for ${provider}`)
  }

  if (names.length === 0) {
    return
  }

  const hasAuth = names.some((name) => Boolean(process.env[name]))
  if (!hasAuth) {
    throw new Error(`missing authentication for provider ${provider}. Set one of: ${names.join(', ')}`)
  }
}

const runDoctor = (config) => {
  const results = [
    runRequiredCheck('node', checkNode),
    runRequiredCheck('pi', () => checkCommand('pi', ['--version'])),
    runRequiredCheck('tmux extended-keys', checkTmux),
    runRequiredCheck('settings', checkSettings),
    runRequiredCheck('sessions', checkSessions),
  ]
  const defaultProfile = config.profiles[config.defaultProfile]
  const target = defaultProfile?.id ? `${config.defaultProfile} (${defaultProfile.id})` : `${config.defaultProfile} (pi default / login)`
  printCheck('ok', 'default profile', target)
  Object.entries(config.providerKeys ?? {}).forEach(([provider, names]) => checkProviderKeys(provider, names))
  console.log(`[tip] per-machine default: create ${localConfigPath()} with {"defaultProfile":"local"} to use pi's own login`)
  return results.every(Boolean) ? 0 : 1
}

let args
let config
let selectedProfileName
let selectedBrand

try {
  config = loadConfig(resolveConfigPath())
  if (rawArgs[0] === 'doctor') process.exit(runDoctor(config))
  const resolved = resolveArgs(config, rawArgs, {
    repoDir: resolveRepoPath(),
    shouldAppendPrompt: shouldAppendPrompt(),
  })
  args = resolved.args
  selectedProfileName = resolved.profileName
  selectedBrand = resolved.brand
  if (!shouldSkipAuthCheck()) {
    requireAuthForProfile(config, selectedProfileName)
  }
  if (shouldAppendPrompt()) args = appendSystemPrompt(args, readPrompt())
} catch (error) {
  console.error(`[tau] ${error.message}`)
  process.exit(1)
}

if (configuredPath && !fs.existsSync(settingsPath)) {
  console.error(`[tau] TAU_SETTINGS_PATH not found: ${settingsPath}`)
  console.error(`[tau] fallback settings: ${defaultSettingsPath}`)
}

const logsDir = path.join(configDir, 'tau', 'logs')
const logFile = path.join(logsDir, `pi-${new Date().toISOString().slice(0, 10)}.log`)
const logEntry = `${new Date().toISOString()} start cmd=pi settings=${fallbackPath} args=${JSON.stringify(args)}\n`

try {
  fs.mkdirSync(logsDir, { recursive: true })
  fs.appendFileSync(logFile, logEntry)
} catch {}

const resolvedBrand = process.env.TAU_BRAND ?? selectedBrand
const env = {
  ...process.env,
  PI_CODING_AGENT_DIR: configDir,
  PI_CODING_AGENT_SESSION_DIR: sessionDir,
  ...(resolvedBrand ? { TAU_BRAND: resolvedBrand } : {}),
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
  console.error(`[tau] failed to start pi: ${error.message}`)
  process.exit(1)
})
