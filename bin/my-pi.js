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

const READ_TOOLS = 'read,grep,find,ls'
const DEBUG_TOOLS = `${READ_TOOLS},bash`

const taskPrompts = {
  commit: 'Prepare concise conventional commit guidance. Inspect state before proposing text.',
  debug: 'Investigate first. Reproduce, isolate evidence, then suggest the smallest fix.',
  fix: 'Fix narrowly. Inspect real state, edit only needed files, test before reporting done.',
  grill: 'Critique the plan hard. Surface risks, weak assumptions, missing tests, and open questions.',
  plan: 'Plan first. Do not implement unless explicitly asked. End with unresolved questions.',
  pr: 'Prepare concise PR text with summary, tests, risks, and checklist.',
}

const aliasExtras = {
  ask: ['-p'],
  code: [],
  commit: ['--tools', DEBUG_TOOLS, '-p'],
  debug: ['--tools', DEBUG_TOOLS, '-p'],
  fix: [],
  grill: ['--tools', READ_TOOLS, '-p'],
  plan: ['--tools', READ_TOOLS, '-p'],
  pr: ['--tools', DEBUG_TOOLS, '-p'],
  review: ['--tools', 'read,grep,find,ls,bash', '-p'],
}

const aliasProfiles = {
  ask: [],
  code: profiles.work,
  commit: profiles.work,
  debug: profiles.deep,
  fix: profiles.work,
  grill: profiles.deep,
  plan: profiles.work,
  pr: profiles.work,
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

const resolvePromptPath = () => path.resolve(import.meta.dirname, '..', 'prompts', 'system-prompt.md')

const shouldAppendPrompt = () => process.env.MY_PI_NO_PROMPT !== '1'

const readPrompt = () => fs.readFileSync(resolvePromptPath(), 'utf8').trim()

const appendSystemPrompt = (args, promptText) => ['--append-system-prompt', promptText, ...args]

const resolveArgs = (rawInputArgs) => {
  const { args: inputArgs, profileName } = extractProfile(rawInputArgs)
  const [firstArg, ...restArgs] = inputArgs

  if (aliasProfiles[firstArg]) {
    const profileArgs = profiles[profileName] ?? aliasProfiles[firstArg]
    const promptArgs = shouldAppendPrompt() && taskPrompts[firstArg] ? ['--append-system-prompt', taskPrompts[firstArg]] : []

    return [...profileArgs, ...aliasExtras[firstArg], ...promptArgs, ...restArgs]
  }

  const resolvedProfileName = profileName ?? firstArg
  if (!profiles[resolvedProfileName]) return [firstArg, ...restArgs].filter((arg) => arg !== undefined)

  return [...profiles[resolvedProfileName], ...(profileName ? inputArgs : restArgs)]
}

let args

try {
  args = resolveArgs(rawArgs)
  if (shouldAppendPrompt()) args = appendSystemPrompt(args, readPrompt())
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
