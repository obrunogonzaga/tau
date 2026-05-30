import fs from 'node:fs'
import path from 'node:path'
import type { ExtensionAPI, ToolCallEvent } from '@earendil-works/pi-coding-agent'
import { isSensitivePath as hasSensitivePath } from './lib/safety.js'

type Rules = {
  destructiveCommands: RegExp[]
  sensitivePaths: RegExp[]
}

const RULES_PATH = path.resolve(process.cwd(), '.pi', 'damage-control-rules.yaml')

const DEFAULT_RULES: Rules = {
  destructiveCommands: [
    /\brm\s+(-[^\s]*[rf][^\s]*|-[^\s]*[fr][^\s]*)\b/,
    /\bgit\s+reset\s+--hard\b/,
    /\bgit\s+clean\s+-[^\s]*f/,
    /\bdd\s+if=/,
    /\bmkfs(\.| \b)/,
    /\bchmod\s+-R\s+777\b/,
  ],
  sensitivePaths: [
    /(^|\/)\.env(\.|$|\/)?/,
    /(^|\/)\.ssh(\/|$)/,
    /(^|\/)\.aws(\/|$)/,
    /(^|\/)\.gnupg(\/|$)/,
    /(^|\/)id_rsa$/,
    /(^|\/)id_ed25519$/,
  ],
}

const sectionItems = (content: string, section: string) => {
  const lines = content.split('\n')
  const start = lines.findIndex((line) => line.trim() === `${section}:`)
  if (start === -1) return []

  const items: string[] = []
  for (const line of lines.slice(start + 1)) {
    if (/^\S/.test(line)) break
    const match = line.match(/^\s*-\s*['"]?(.+?)['"]?\s*$/)
    if (match) items.push(match[1])
  }

  return items
}

const decodeRule = (value: string) => {
  try {
    return JSON.parse(`"${value}"`) as string
  } catch {
    return value
  }
}

const compileRules = (content: string): Rules => {
  const compile = (value: string) => new RegExp(decodeRule(value))
  const destructiveCommands = sectionItems(content, 'destructiveCommands').map(compile)
  const sensitivePaths = sectionItems(content, 'sensitivePaths').map(compile)

  return {
    destructiveCommands: destructiveCommands.length ? destructiveCommands : DEFAULT_RULES.destructiveCommands,
    sensitivePaths: sensitivePaths.length ? sensitivePaths : DEFAULT_RULES.sensitivePaths,
  }
}

const loadRules = () => {
  if (!fs.existsSync(RULES_PATH)) return DEFAULT_RULES

  return compileRules(fs.readFileSync(RULES_PATH, 'utf8'))
}

const eventPath = (event: ToolCallEvent) => {
  const input = event.input as Record<string, unknown>
  const value = input.path ?? input.file_path

  return typeof value === 'string' ? value : ''
}

const isDestructiveCommand = (rules: Rules, command: string) =>
  rules.destructiveCommands.some((rule) => rule.test(command))

const block = (reason: string) => ({
  block: true,
  reason: `${reason}. Continue with a safe alternative: inspect git status, narrow path, request explicit approval, or propose a non-mutating command.`,
})

export default function damageControl(pi: ExtensionAPI) {
  const rules = loadRules()

  pi.on('tool_call', (event) => {
    if (event.toolName === 'bash') {
      const command = String((event.input as Record<string, unknown>).command ?? '')
      if (isDestructiveCommand(rules, command)) return block(`blocked destructive command: ${command}`)
    }

    if (['read', 'ls', 'grep', 'find', 'edit', 'write'].includes(event.toolName)) {
      const targetPath = eventPath(event)
      if (hasSensitivePath(targetPath, rules.sensitivePaths)) return block(`blocked sensitive path: ${targetPath}`)
    }
  })
}
