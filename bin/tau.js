#!/usr/bin/env node
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawn, spawnSync } from 'node:child_process'

const rawArgs = process.argv.slice(2)

const resolveRepoPath = (...segments) => path.resolve(import.meta.dirname, '..', ...segments)

const defaultConfigPath = resolveRepoPath('config', 'tau.config.json')

const resolveConfigPath = () => {
  const configPath = process.env.TAU_CONFIG_PATH
  if (!configPath) return defaultConfigPath
  return path.isAbsolute(configPath) ? configPath : path.resolve(process.cwd(), configPath)
}

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'))

const splitModelId = (modelId) => {
  const [provider, model] = modelId.split('/')

  return { model, provider }
}

const modelPattern = (modelConfig) => `${modelConfig.id}:${modelConfig.thinking}`

const profileBaseArgs = (modelConfig) => {
  const { model, provider } = splitModelId(modelConfig.id)

  return ['--provider', provider, '--model', model, '--thinking', modelConfig.thinking]
}

const hasText = (value) => typeof value === 'string' && value.length > 0

const validateProfile = (name, profile, profiles) => {
  if (!profile || !hasText(profile.id) || !hasText(profile.thinking)) {
    throw new Error(`Invalid config: profile ${name} requires id and thinking`)
  }
  if (profile.models?.some((modelName) => !profiles[modelName])) {
    throw new Error(`Invalid config: profile ${name} has unknown model reference`)
  }
}

const validateAlias = (name, alias, profiles) => {
  if (!alias || !profiles[alias.profile] || !Array.isArray(alias.extras)) {
    throw new Error(`Invalid config: alias ${name} requires profile and extras`)
  }
}

const validateExtensionPreset = (name, preset, profiles) => {
  if (!preset || !profiles[preset.profile] || !Array.isArray(preset.extensions)) {
    throw new Error(`Invalid config: extension preset ${name} requires profile and extensions`)
  }
  if (preset.extensions.some((extension) => !hasText(extension))) {
    throw new Error(`Invalid config: extension preset ${name} has invalid extension`)
  }
  if (preset.prompt !== undefined && !hasText(preset.prompt)) {
    throw new Error(`Invalid config: extension preset ${name} has invalid prompt`)
  }
}

const validateConfig = (config) => {
  if (!config?.profiles || !config?.aliases || !config?.extensionPresets || !hasText(config.defaultProfile)) {
    throw new Error('Invalid config: profiles, aliases, extensionPresets, and defaultProfile are required')
  }
  if (!config.profiles[config.defaultProfile]) throw new Error('Invalid config: defaultProfile unknown')
  Object.entries(config.profiles).forEach(([name, profile]) => validateProfile(name, profile, config.profiles))
  Object.entries(config.aliases).forEach(([name, alias]) => validateAlias(name, alias, config.profiles))
  Object.entries(config.extensionPresets).forEach(([name, preset]) =>
    validateExtensionPreset(name, preset, config.profiles),
  )
}

const loadConfig = () => {
  try {
    const config = readJson(resolveConfigPath())
    validateConfig(config)
    return config
  } catch (error) {
    if (error.message.startsWith('Invalid config')) throw error
    throw new Error(`Invalid config: ${error.message}`)
  }
}

const modelCyclingArgs = (config, profileConfig) => {
  const modelNames = profileConfig.models ?? []
  if (modelNames.length === 0) return []
  return ['--models', modelNames.map((name) => modelPattern(config.profiles[name])).join(',')]
}

const profileArgs = (config, profileName) => {
  const profileConfig = config.profiles[profileName]
  return [...profileBaseArgs(profileConfig), ...modelCyclingArgs(config, profileConfig)]
}

const extensionArgs = (extensions) => extensions.flatMap((extension) => ['-e', resolveRepoPath('extensions', extension)])

const extractProfileAt = (config, args, profileIndex) => {
  const profileArg = args[profileIndex]
  const hasEqualsValue = profileArg.startsWith('--profile=')
  const profileName = hasEqualsValue ? profileArg.slice('--profile='.length) : args[profileIndex + 1]
  if (!profileName) throw new Error('Missing value for --profile')
  if (!config.profiles[profileName]) throw new Error(`Unknown profile: ${profileName}`)

  const cleanArgs = args.filter((_, index) => {
    if (index === profileIndex) return false
    return hasEqualsValue || index !== profileIndex + 1
  })

  return { args: cleanArgs, profileName }
}

const extractProfile = (config, args) => {
  if (args[0] === '--profile' || args[0]?.startsWith('--profile=')) return extractProfileAt(config, args, 0)
  if (config.aliases[args[0]] && (args[1] === '--profile' || args[1]?.startsWith('--profile='))) {
    return extractProfileAt(config, args, 1)
  }

  return { args, profileName: null }
}

const resolvePromptPath = () => resolveRepoPath('prompts', 'system-prompt.md')

const shouldAppendPrompt = () => process.env.TAU_NO_PROMPT !== '1'

const readPrompt = () => fs.readFileSync(resolvePromptPath(), 'utf8').trim()

const appendSystemPrompt = (args, promptText) => ['--append-system-prompt', promptText, ...args]

const resolveArgs = (config, rawInputArgs) => {
  const { args: inputArgs, profileName } = extractProfile(config, rawInputArgs)
  const [firstArg, ...restArgs] = inputArgs

  if (!firstArg) {
    const selectedProfile = profileName ?? config.defaultProfile

    return [...profileArgs(config, selectedProfile), ...extensionArgs(['tau-banner.ts'])]
  }

  if (firstArg === 'ext') {
    const [presetName, ...presetRestArgs] = restArgs
    const preset = config.extensionPresets[presetName]
    if (!preset) throw new Error(`Unknown extension preset: ${presetName ?? ''}`)
    const selectedProfile = profileName ?? preset.profile
    const promptArgs = shouldAppendPrompt() && preset.prompt ? ['--append-system-prompt', preset.prompt] : []

    return [...profileArgs(config, selectedProfile), ...extensionArgs(preset.extensions), ...promptArgs, ...presetRestArgs]
  }

  if (config.aliases[firstArg]) {
    const alias = config.aliases[firstArg]
    const selectedProfile = profileName ?? alias.profile
    const promptArgs = shouldAppendPrompt() && alias.prompt ? ['--append-system-prompt', alias.prompt] : []

    return [...profileArgs(config, selectedProfile), ...alias.extras, ...promptArgs, ...restArgs]
  }

  const resolvedProfileName = profileName ?? firstArg
  if (!config.profiles[resolvedProfileName]) {
    return [...profileArgs(config, config.defaultProfile), firstArg, ...restArgs].filter((arg) => arg !== undefined)
  }

  return [...profileArgs(config, resolvedProfileName), ...(profileName ? inputArgs : restArgs)]
}

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
  const value = result.stdout.trim() || result.stderr.trim() || 'missing'
  return { ok: result.status === 0 && value === 'on', detail: value }
}

const checkProviderKeys = (provider, names) => {
  const present = names.some((name) => Boolean(process.env[name]))
  printCheck(present ? 'ok' : 'warn', `key ${provider}`, present ? 'present' : 'missing')
  return true
}

const runRequiredCheck = (name, check) => {
  const result = check()
  printCheck(result.status ?? (result.ok ? 'ok' : 'fail'), name, result.detail)
  return result.ok
}

const runDoctor = (config) => {
  const results = [
    runRequiredCheck('node', checkNode),
    runRequiredCheck('pi', () => checkCommand('pi', ['--version'])),
    runRequiredCheck('tmux extended-keys', checkTmux),
    runRequiredCheck('settings', checkSettings),
    runRequiredCheck('sessions', checkSessions),
  ]
  Object.entries(config.providerKeys ?? {}).forEach(([provider, names]) => checkProviderKeys(provider, names))
  return results.every(Boolean) ? 0 : 1
}

let args
let config

try {
  config = loadConfig()
  if (rawArgs[0] === 'doctor') process.exit(runDoctor(config))
  args = resolveArgs(config, rawArgs)
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
const banner = process.env.TAU_BANNER || 'Tau'

if (process.env.TAU_BANNER !== '0') {
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
  console.error(`[tau] failed to start pi: ${error.message}`)
  process.exit(1)
})
